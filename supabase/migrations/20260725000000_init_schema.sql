-- Initial Database Schema for ourCloset (as per summary.md)

-- Enable vector extension for pgvector embeddings
create extension if not exists vector;

-- Profiles Table
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  cultural_preference text default 'Western' check (cultural_preference in ('Western', 'Indian Traditional', 'Islamic-Modest')),
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Household Bonds Table (Renamed from couple_bonds for forward-compatibility)
create table if not exists household_bonds (
  id uuid primary key default gen_random_uuid(),
  household_type text default 'couple' check (household_type in ('couple', 'family')),
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Household Members Junction Table
create table if not exists household_members (
  household_id uuid references household_bonds(id) on delete cascade,
  profile_id uuid references profiles(id) on delete cascade,
  primary key (household_id, profile_id)
);

-- Wardrobe Items Table
create table if not exists wardrobe_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  title text not null,
  category text not null,
  cultural_style text not null default 'Western' check (cultural_style in ('Western', 'Indian Traditional', 'Islamic-Modest')),
  formality_level int default 3 check (formality_level between 1 and 5),
  laundry_status text default 'CLEAN' check (laundry_status in ('CLEAN', 'LAUNDRY', 'DRY_CLEANING')),
  privacy_tier text default 'PUBLIC' check (privacy_tier in ('PUBLIC', 'PRIVATE')),
  fabric_type text,
  season_tags text[] default '{}',
  purchase_price numeric(10,2),
  purchase_date date,
  wear_count int default 0,
  last_worn_at timestamp with time zone,
  color_embedding vector(64),
  silhouette_embedding vector(128),
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- HNSW Indexes for Vector Search
create index if not exists wardrobe_items_color_hnsw
  on wardrobe_items using hnsw (color_embedding vector_cosine_ops);
create index if not exists wardrobe_items_silhouette_hnsw
  on wardrobe_items using hnsw (silhouette_embedding vector_cosine_ops);

-- Outfit History Table (Memory Layer)
create table if not exists outfit_history (
  id uuid primary key default gen_random_uuid(),
  household_bond_id uuid references household_bonds(id) on delete cascade,
  worn_by uuid references profiles(id) on delete cascade not null,
  event_context text,
  item_ids uuid[] not null,
  worn_at date not null default current_date,
  photo_url text,
  rating int check (rating between 1 and 5),
  created_at timestamp with time zone default timezone('utc'::text, now())
);

create index if not exists outfit_history_worn_by_date_idx
  on outfit_history (worn_by, worn_at desc);

-- Trigger to increment wear_count + last_worn_at when outfit logged
create or replace function log_outfit_wear()
returns trigger as $$
begin
  update wardrobe_items
  set wear_count = wear_count + 1,
      last_worn_at = new.worn_at
  where id = any(new.item_ids);
  return new;
end;
$$ language plpgsql;

create or replace trigger trg_log_outfit_wear
after insert on outfit_history
for each row execute function log_outfit_wear();

-- Multi-Vector Hybrid Matching Function
create or replace function match_complementary_items(
  query_color vector(64),
  query_silhouette vector(128),
  target_formality int,
  target_cultural_style text,
  color_weight float default 0.6,
  silhouette_weight float default 0.4
)
returns table(item_id uuid, score float) as $$
  select id,
    (color_weight * (1 - (color_embedding <=> query_color))
     + silhouette_weight * (1 - (silhouette_embedding <=> query_silhouette))) as score
  from wardrobe_items
  where formality_level between target_formality - 1 and target_formality + 1
    and cultural_style = target_cultural_style
    and laundry_status = 'CLEAN'
  order by score desc
  limit 10;
$$ language sql stable;

-- Row Level Security (RLS) Policies
alter table wardrobe_items enable row level security;

create policy "Own items always visible"
  on wardrobe_items for select
  using (user_id = auth.uid());

create policy "Household partner's public items visible"
  on wardrobe_items for select
  using (
    privacy_tier = 'PUBLIC'
    and exists (
      select 1 from household_members hm1
      join household_members hm2 on hm1.household_id = hm2.household_id
      where hm1.profile_id = auth.uid()
        and hm2.profile_id = wardrobe_items.user_id
    )
  );

create policy "Only owner can modify"
  on wardrobe_items for update using (user_id = auth.uid());

create policy "Only owner can delete"
  on wardrobe_items for delete using (user_id = auth.uid());
