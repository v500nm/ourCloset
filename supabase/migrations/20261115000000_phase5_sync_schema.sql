-- Phase 5: Sync schema rewrite, server-side LWW merge, invite-based households, hardened RLS.
--
-- Conforms to:
--   ADR-002  no photo binaries / image URLs in Postgres (Tenet 1)
--   ADR-003  hybrid logical clocks, per-field LWW, soft-delete tombstones, edit-after-delete un-deletes
--   ADR-004  no pgvector columns
--
-- This migration runs AFTER 20260725000000_init_schema.sql, which created tables with the same names but a
-- different shape. `create table if not exists` would silently keep the legacy shape, so legacy tables are
-- renamed to legacy_* first (data is preserved, not dropped). Legacy items are NOT copied across: they carry
-- vector embeddings and an image_url, both of which ADR-002/004 forbid syncing. Profiles are copied.

-- ============================================================================
-- 0. Preserve legacy objects
-- ============================================================================
do $$
begin
  if to_regclass('public.household_bonds') is not null then
    drop trigger if exists trg_log_outfit_wear on outfit_history;
    drop function if exists log_outfit_wear();
    drop function if exists match_complementary_items(vector, vector, int, text, float, float);

    alter table household_members rename to legacy_household_members;
    alter table outfit_history    rename to legacy_outfit_history;
    alter table wardrobe_items    rename to legacy_wardrobe_items;
    alter table household_bonds   rename to legacy_household_bonds;
    alter table profiles          rename to legacy_profiles;
  end if;
end $$;

-- ============================================================================
-- 1. Tables
-- ============================================================================
create sequence if not exists sync_seq;

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  role_type text default 'partner' check (role_type in ('husband', 'wife', 'partner')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table households (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  household_type text not null default 'couple' check (household_type in ('couple', 'family')),
  sync_status text not null default 'ACTIVE' check (sync_status in ('ACTIVE', 'PAUSED')),
  invite_code text unique,
  invite_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table household_members (
  household_id uuid not null references households(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  role_in_household text default 'partner',
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (household_id, profile_id)
);

-- A profile belongs to at most ONE active household. Item visibility relies on this invariant.
create unique index uq_one_active_household_per_profile
  on household_members (profile_id) where deleted_at is null;

-- Metadata only: no image_url, no embeddings (ADR-002, ADR-004).
create table wardrobe_items (
  id uuid primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  household_id uuid references households(id) on delete set null, -- derived by trigger, never client-trusted
  title text not null,
  category text not null,
  cultural_style text not null default 'western' check (cultural_style in ('western', 'indian_traditional', 'islamic_modest')),
  formality_level int not null default 3 check (formality_level between 1 and 5),
  primary_color_hex text,
  secondary_color_hex text,
  hardware_metal_color text check (hardware_metal_color in ('gold', 'silver', 'rose_gold', 'black')),
  leather_tone text check (leather_tone in ('black', 'tan', 'dark_brown')),
  fabric_type text,
  season_tags text[] not null default '{}',
  laundry_status text not null default 'CLEAN' check (laundry_status in ('CLEAN', 'DIRTY', 'IN_WASH', 'DRY_CLEANING')),
  privacy_tier text not null default 'PUBLIC' check (privacy_tier in ('PUBLIC', 'PRIVATE')),
  wear_count int not null default 0,
  last_worn_at timestamptz,
  hlc_timestamp text,                         -- newest HLC applied to this row
  field_hlc jsonb not null default '{}'::jsonb, -- per-field HLC (ADR-003)
  server_seq bigint,                          -- server-assigned pull cursor; NOT client clock
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index idx_wardrobe_items_user on wardrobe_items(user_id);
create index idx_wardrobe_items_household on wardrobe_items(household_id);
create index idx_wardrobe_items_seq on wardrobe_items(server_seq);

create table outfit_history (
  id uuid primary key,
  household_id uuid references households(id) on delete set null, -- derived by trigger
  worn_by uuid not null references profiles(id) on delete cascade,
  event_context text,
  item_ids uuid[] not null,
  worn_at date not null default current_date,
  rating int check (rating between 1 and 5),
  hlc_timestamp text,
  server_seq bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index idx_outfit_history_worn_by on outfit_history(worn_by, worn_at desc);
create index idx_outfit_history_seq on outfit_history(server_seq);

-- Carry over identities from the legacy schema, if any.
do $$
begin
  if to_regclass('public.legacy_profiles') is not null then
    insert into profiles (id, email, display_name, created_at)
    select id, email, display_name, coalesce(created_at, now()) from legacy_profiles
    on conflict (id) do nothing;
  end if;
end $$;

-- ============================================================================
-- 2. Triggers
-- ============================================================================

-- New auth user -> profile row.
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, email, display_name)
  values (new.id, coalesce(new.email, ''), coalesce(new.raw_user_meta_data ->> 'name', split_part(coalesce(new.email, ''), '@', 1)))
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- Server-assigned cursor. Clients must paginate on this, never on a client HLC: an offline device pushes
-- OLD hlcs late, and a cursor of "max hlc seen" would skip them forever.
create or replace function stamp_sync_columns() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.server_seq := nextval('sync_seq');
  new.updated_at := now();
  return new;
end $$;

create trigger trg_wardrobe_stamp before insert or update on wardrobe_items
  for each row execute function stamp_sync_columns();
create trigger trg_outfit_stamp before insert or update on outfit_history
  for each row execute function stamp_sync_columns();

-- household_id is derived from membership; a client-supplied value is overwritten.
create or replace function derive_household_id() returns trigger
language plpgsql security definer set search_path = public as $$
declare owner_col uuid;
begin
  -- Via jsonb: plpgsql resolves record fields eagerly, so `new.worn_by` would fail on wardrobe_items.
  owner_col := (to_jsonb(new) ->> case tg_table_name when 'wardrobe_items' then 'user_id' else 'worn_by' end)::uuid;
  new.household_id := (
    select hm.household_id from household_members hm
    where hm.profile_id = owner_col and hm.deleted_at is null limit 1
  );
  return new;
end $$;

create trigger trg_wardrobe_household before insert or update on wardrobe_items
  for each row execute function derive_household_id();
create trigger trg_outfit_household before insert or update on outfit_history
  for each row execute function derive_household_id();

-- ============================================================================
-- 3. Membership helper
-- ============================================================================
create or replace function is_household_member(h_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from household_members
    where household_id = h_id and profile_id = auth.uid() and deleted_at is null
  );
$$;

-- ============================================================================
-- 4. Server-side per-field LWW merge (must stay semantically identical to reconcileEntity in syncWorker.ts)
-- ============================================================================
-- security INVOKER on purpose: RLS decides whether the caller may touch the row.
-- HLC strings are fixed-width zero-padded, so byte-wise ("C") comparison is chronological.
create or replace function sync_wardrobe_upsert(p_id uuid, p_fields jsonb, p_field_hlc jsonb, p_hlc text)
returns void language plpgsql set search_path = public as $$
declare
  syncable text[] := array[
    'user_id','title','category','cultural_style','primary_color_hex','secondary_color_hex',
    'hardware_metal_color','leather_tone','formality_level','fabric_type','season_tags',
    'laundry_status','privacy_tier','wear_count','last_worn_at','deleted_at'
  ];
  cur wardrobe_items%rowtype;
  cur_json jsonb;
  cur_hlc jsonb;
  k text;
  inc text;
  have text;
  max_other text := '';
  del_hlc text;
begin
  select * into cur from wardrobe_items where id = p_id for update;

  if not found then
    -- Fresh row: take every supplied field. user_id is forced to the caller via RLS WITH CHECK.
    insert into wardrobe_items (
      id, user_id, title, category, cultural_style, primary_color_hex, secondary_color_hex,
      hardware_metal_color, leather_tone, formality_level, fabric_type, season_tags,
      laundry_status, privacy_tier, wear_count, last_worn_at, deleted_at, hlc_timestamp, field_hlc
    )
    select p_id,
      coalesce((p_fields ->> 'user_id')::uuid, auth.uid()),
      p_fields ->> 'title', p_fields ->> 'category',
      coalesce(p_fields ->> 'cultural_style', 'western'),
      p_fields ->> 'primary_color_hex', p_fields ->> 'secondary_color_hex',
      p_fields ->> 'hardware_metal_color', p_fields ->> 'leather_tone',
      coalesce((p_fields ->> 'formality_level')::int, 3), p_fields ->> 'fabric_type',
      coalesce(array(select jsonb_array_elements_text(p_fields -> 'season_tags')), '{}'),
      coalesce(p_fields ->> 'laundry_status', 'CLEAN'), coalesce(p_fields ->> 'privacy_tier', 'PUBLIC'),
      coalesce((p_fields ->> 'wear_count')::int, 0), (p_fields ->> 'last_worn_at')::timestamptz,
      (p_fields ->> 'deleted_at')::timestamptz, p_hlc, coalesce(p_field_hlc, '{}'::jsonb);
    return;
  end if;

  cur_json := to_jsonb(cur);
  cur_hlc := cur.field_hlc;

  foreach k in array syncable loop
    continue when not (p_fields ? k);
    continue when k = 'user_id'; -- ownership is immutable
    inc := coalesce(p_field_hlc ->> k, p_hlc, '');
    have := coalesce(cur_hlc ->> k, '');
    if inc collate "C" > have collate "C" then
      cur_json := jsonb_set(cur_json, array[k], coalesce(p_fields -> k, 'null'::jsonb));
      cur_hlc := jsonb_set(cur_hlc, array[k], to_jsonb(inc));
    end if;
  end loop;

  -- Tombstone rule (ADR-003): deleted_at survives only if no other field was edited after it.
  for k in select jsonb_object_keys(cur_hlc) loop
    continue when k = 'deleted_at';
    if (cur_hlc ->> k) collate "C" > max_other collate "C" then max_other := cur_hlc ->> k; end if;
  end loop;
  del_hlc := coalesce(cur_hlc ->> 'deleted_at', '');
  if (cur_json ->> 'deleted_at') is not null and max_other collate "C" > del_hlc collate "C" then
    cur_json := jsonb_set(cur_json, array['deleted_at'], 'null'::jsonb);
  end if;

  update wardrobe_items set
    title = cur_json ->> 'title',
    category = cur_json ->> 'category',
    cultural_style = cur_json ->> 'cultural_style',
    primary_color_hex = cur_json ->> 'primary_color_hex',
    secondary_color_hex = cur_json ->> 'secondary_color_hex',
    hardware_metal_color = cur_json ->> 'hardware_metal_color',
    leather_tone = cur_json ->> 'leather_tone',
    formality_level = (cur_json ->> 'formality_level')::int,
    fabric_type = cur_json ->> 'fabric_type',
    season_tags = coalesce(array(select jsonb_array_elements_text(cur_json -> 'season_tags')), '{}'),
    laundry_status = cur_json ->> 'laundry_status',
    privacy_tier = cur_json ->> 'privacy_tier',
    wear_count = (cur_json ->> 'wear_count')::int,
    last_worn_at = (cur_json ->> 'last_worn_at')::timestamptz,
    deleted_at = (cur_json ->> 'deleted_at')::timestamptz,
    field_hlc = cur_hlc,
    hlc_timestamp = case when coalesce(p_hlc, '') collate "C" > coalesce(cur.hlc_timestamp, '') collate "C"
                         then p_hlc else cur.hlc_timestamp end
  where id = p_id;
end $$;

-- ============================================================================
-- 5. Household lifecycle RPCs (the ONLY way to change membership)
-- ============================================================================
create or replace function create_household(p_type text default 'couple') returns uuid
language plpgsql security definer set search_path = public as $$
declare hid uuid;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if p_type not in ('couple', 'family') then raise exception 'invalid_household_type'; end if;
  if exists (select 1 from household_members where profile_id = auth.uid() and deleted_at is null) then
    raise exception 'already_in_household';
  end if;
  insert into households (owner_id, household_type) values (auth.uid(), p_type) returning id into hid;
  insert into household_members (household_id, profile_id, role_in_household) values (hid, auth.uid(), 'owner');
  return hid;
end $$;

-- Single-use, expiring. 48 bits of entropy from the CSPRNG-backed gen_random_uuid().
create or replace function create_invite(p_ttl_hours int default 48) returns text
language plpgsql security definer set search_path = public as $$
declare hid uuid; code text;
begin
  select h.id into hid from households h
  where h.owner_id = auth.uid() and h.deleted_at is null;
  if hid is null then raise exception 'not_household_owner'; end if;
  code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));
  update households set invite_code = code, invite_expires_at = now() + make_interval(hours => greatest(1, least(p_ttl_hours, 168)))
  where id = hid;
  return substr(code, 1, 4) || '-' || substr(code, 5, 4) || '-' || substr(code, 9, 4);
end $$;

create or replace function join_household(p_code text) returns uuid
language plpgsql security definer set search_path = public as $$
declare h households%rowtype; norm text; active_count int; cap int;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  norm := upper(replace(coalesce(p_code, ''), '-', ''));
  -- One generic error for unknown / expired / used codes: no oracle for guessing.
  select * into h from households
  where invite_code = norm and invite_expires_at > now() and deleted_at is null for update;
  if not found then raise exception 'invalid_or_expired_invite'; end if;
  if exists (select 1 from household_members where profile_id = auth.uid() and deleted_at is null) then
    raise exception 'already_in_household';
  end if;
  select count(*) into active_count from household_members where household_id = h.id and deleted_at is null;
  cap := case h.household_type when 'couple' then 2 else 8 end;
  if active_count >= cap then raise exception 'household_full'; end if;

  -- Re-joining after being removed re-activates the old row instead of violating the PK.
  insert into household_members (household_id, profile_id) values (h.id, auth.uid())
  on conflict (household_id, profile_id) do update set deleted_at = null, joined_at = now(), updated_at = now();
  update households set invite_code = null, invite_expires_at = null where id = h.id; -- single use
  return h.id;
end $$;

-- Shared by leave/remove: detach the member and revoke visibility of their items immediately.
create or replace function detach_member(p_household uuid, p_profile uuid) returns void
language plpgsql security definer set search_path = public as $$
declare next_owner uuid;
begin
  update household_members set deleted_at = now(), updated_at = now()
  where household_id = p_household and profile_id = p_profile and deleted_at is null;
  update wardrobe_items set household_id = null where user_id = p_profile;
  update outfit_history set household_id = null where worn_by = p_profile;

  if (select owner_id from households where id = p_household) = p_profile then
    select profile_id into next_owner from household_members
    where household_id = p_household and deleted_at is null order by joined_at limit 1;
    if next_owner is null then
      update households set deleted_at = now(), invite_code = null, invite_expires_at = null where id = p_household;
    else
      update households set owner_id = next_owner where id = p_household;
    end if;
  end if;
end $$;

create or replace function leave_household() returns void
language plpgsql security definer set search_path = public as $$
declare hid uuid;
begin
  select household_id into hid from household_members where profile_id = auth.uid() and deleted_at is null;
  if hid is null then raise exception 'not_in_household'; end if;
  perform detach_member(hid, auth.uid());
end $$;

create or replace function remove_member(p_profile uuid) returns void
language plpgsql security definer set search_path = public as $$
declare hid uuid;
begin
  select h.id into hid from households h where h.owner_id = auth.uid() and h.deleted_at is null;
  if hid is null then raise exception 'not_household_owner'; end if;
  if p_profile = auth.uid() then raise exception 'use_leave_household'; end if;
  if not exists (select 1 from household_members where household_id = hid and profile_id = p_profile and deleted_at is null) then
    raise exception 'not_a_member';
  end if;
  perform detach_member(hid, p_profile);
end $$;

-- Deletes the auth user; every owned row cascades. The privacy page promises this.
create or replace function delete_my_account() returns void
language plpgsql security definer set search_path = public as $$
declare hid uuid;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  select household_id into hid from household_members where profile_id = auth.uid() and deleted_at is null;
  if hid is not null then perform detach_member(hid, auth.uid()); end if;
  delete from auth.users where id = auth.uid();
end $$;

-- Functions are executable by PUBLIC by default; lock them to signed-in users.
revoke all on function create_household(text), create_invite(int), join_household(text),
  leave_household(), remove_member(uuid), delete_my_account(), detach_member(uuid, uuid),
  sync_wardrobe_upsert(uuid, jsonb, jsonb, text) from public;
grant execute on function create_household(text), create_invite(int), join_household(text),
  leave_household(), remove_member(uuid), delete_my_account(), sync_wardrobe_upsert(uuid, jsonb, jsonb, text)
  to authenticated;

-- ============================================================================
-- 6. Row Level Security
-- ============================================================================
alter table profiles enable row level security;
alter table households enable row level security;
alter table household_members enable row level security;
alter table wardrobe_items enable row level security;
alter table outfit_history enable row level security;

-- profiles
create policy "read own or co-member profile" on profiles for select using (
  id = auth.uid() or exists (
    select 1 from household_members a join household_members b on a.household_id = b.household_id
    where a.profile_id = auth.uid() and b.profile_id = profiles.id
      and a.deleted_at is null and b.deleted_at is null
  )
);
create policy "update own profile" on profiles for update using (id = auth.uid()) with check (id = auth.uid());

-- households / household_members: read-only to clients. All writes go through the RPCs above.
create policy "members read household" on households for select using (is_household_member(id));
create policy "members read co-members" on household_members for select using (
  profile_id = auth.uid() or is_household_member(household_id)
);

-- wardrobe_items
-- Partners also see tombstones of PUBLIC items, otherwise a partner would never learn of a delete.
create policy "read own, or partner PUBLIC" on wardrobe_items for select using (
  user_id = auth.uid() or (
    privacy_tier = 'PUBLIC' and household_id is not null and is_household_member(household_id)
  )
);
create policy "insert own" on wardrobe_items for insert with check (user_id = auth.uid());
create policy "update own" on wardrobe_items for update using (user_id = auth.uid()) with check (user_id = auth.uid());
-- No DELETE policy: deletion is a tombstone (ADR-003). Hard deletes only happen via account deletion cascade.

-- outfit_history
create policy "read own or household logs" on outfit_history for select using (
  worn_by = auth.uid() or (household_id is not null and is_household_member(household_id))
);
create policy "insert own log" on outfit_history for insert with check (worn_by = auth.uid());
create policy "update own log" on outfit_history for update using (worn_by = auth.uid()) with check (worn_by = auth.uid());
