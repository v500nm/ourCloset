// @vitest-environment node
/**
 * Real RLS / migration verification.
 *
 * Runs the ACTUAL migration files (legacy init first, then Phase 5) inside PGlite (Postgres in WASM) and
 * exercises them as three distinct database roles-with-JWT-subject: alice, bob (partner), mallory (outsider).
 * Unlike rlsPolicy.test.ts (a regex over the SQL text), this fails if a policy is actually wrong.
 *
 * Stubs only what Supabase provides: the auth schema, auth.uid(), and the anon/authenticated roles.
 *
 * KNOWN FIDELITY GAP: PGlite ships no pgvector. The legacy init migration is therefore loaded through
 * `shimLegacyVector()` (vector(N) -> a float8[] domain; hnsw indexes and the `<=>` matching function removed).
 * The legacy TABLE shapes are unchanged, which is what the Phase 5 rename logic depends on. The Phase 5
 * migration itself is loaded byte-for-byte.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { PGlite } from '@electric-sql/pglite';

const A = 'aaaaaaaa-0000-0000-0000-00000000000a';
const B = 'bbbbbbbb-0000-0000-0000-00000000000b';
const M = 'cccccccc-0000-0000-0000-00000000000c';
const C = 'dddddddd-0000-0000-0000-00000000000d';

const ITEM_PUBLIC = '11111111-0000-0000-0000-000000000001';
const ITEM_PRIVATE = '11111111-0000-0000-0000-000000000002';
const ITEM_MERGE = '11111111-0000-0000-0000-000000000003';

const h = (n: number, node = 'x') => `${String(n).padStart(15, '0')}:00000:${node}`;

let db: PGlite;

function shimLegacyVector(sql: string): string {
  return sql
    .replace(/create extension if not exists vector;/i, 'create domain vector as float8[];')
    .replace(/create index if not exists \w+\s+on \w+ using hnsw[^;]*;/gi, '')
    .replace(/-- Multi-Vector Hybrid Matching Function[\s\S]*?language sql stable;/i, '')
    .replace(/vector\(\d+\)/gi, 'vector');
}

async function as(uid: string | null) {
  await db.exec('reset role;');
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [uid ?? '']);
  await db.exec(uid ? 'set role authenticated;' : 'set role anon;');
}

async function rows<T = any>(sql: string, params: unknown[] = []): Promise<T[]> {
  return (await db.query<T>(sql, params)).rows;
}

function upsert(id: string, fields: Record<string, unknown>, hlc: number, node = 'x') {
  const fieldHlc: Record<string, string> = {};
  for (const k of Object.keys(fields)) fieldHlc[k] = h(hlc, node);
  return db.query(`select sync_wardrobe_upsert($1::uuid, $2::jsonb, $3::jsonb, $4)`, [
    id,
    JSON.stringify(fields),
    JSON.stringify(fieldHlc),
    h(hlc, node),
  ]);
}

const baseItem = (title: string, privacy = 'PUBLIC') => ({
  user_id: A,
  title,
  category: 'shirt',
  cultural_style: 'western',
  formality_level: 3,
  season_tags: ['summer'],
  laundry_status: 'CLEAN',
  privacy_tier: privacy,
  wear_count: 0,
});

describe('Supabase migrations + RLS (real Postgres via PGlite)', () => {
  beforeAll(async () => {
    db = new PGlite();

    // --- Supabase platform stubs -------------------------------------------------------------
    await db.exec(`
      create schema auth;
      create table auth.users (
        id uuid primary key default gen_random_uuid(),
        email text,
        raw_user_meta_data jsonb default '{}'::jsonb
      );
      create function auth.uid() returns uuid language sql stable as
        $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      create role anon nologin;
      create role authenticated nologin;
      grant usage on schema public, auth to anon, authenticated;
      grant execute on function auth.uid() to anon, authenticated;
      alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
      alter default privileges in schema public grant usage, select on sequences to authenticated;
    `);

    // --- The real migrations, in order ---------------------------------------------------------
    const dir = path.resolve(process.cwd(), 'supabase/migrations');
    for (const f of fs.readdirSync(dir).filter(n => n.endsWith('.sql')).sort()) {
      const raw = fs.readFileSync(path.join(dir, f), 'utf-8');
      await db.exec(f.includes('init_schema') ? shimLegacyVector(raw) : raw);
    }

    for (const [id, email] of [[A, 'alice@x.test'], [B, 'bob@x.test'], [M, 'mallory@x.test'], [C, 'carol@x.test']]) {
      await db.query(`insert into auth.users (id, email) values ($1, $2)`, [id, email]);
    }
  }, 120_000);

  afterAll(async () => {
    await db?.close();
  });

  // ------------------------------------------------------------------------------------------
  describe('migration', () => {
    it('preserves legacy tables instead of silently keeping their shape', async () => {
      const legacy = await rows(`select to_regclass('public.legacy_wardrobe_items') as t`);
      expect(legacy[0].t).not.toBeNull();
      const cols = (await rows(`select column_name from information_schema.columns where table_name = 'wardrobe_items'`))
        .map(r => r.column_name);
      expect(cols).toEqual(expect.arrayContaining(['field_hlc', 'server_seq', 'hlc_timestamp', 'deleted_at']));
    });

    it('ADR-002/004: no image or embedding columns exist in the synced schema', async () => {
      const cols = (await rows(`
        select column_name from information_schema.columns
        where table_schema = 'public' and table_name in ('wardrobe_items', 'outfit_history')`))
        .map(r => r.column_name);
      expect(cols.filter(c => /image|photo|embedding/.test(c))).toEqual([]);
    });

    it('creates a profile row for each new auth user', async () => {
      const n = await rows(`select count(*)::int as n from profiles`);
      expect(n[0].n).toBe(4);
    });
  });

  // ------------------------------------------------------------------------------------------
  describe('household lifecycle: the only way in is a valid invite', () => {
    let code = '';

    it('alice creates a household and an invite', async () => {
      await as(A);
      await db.query(`select create_household('couple')`);
      code = (await rows<{ c: string }>(`select create_invite() as c`))[0].c;
      expect(code).toMatch(/^[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/);
    });

    it('REGRESSION: cannot join a household by inserting into household_members directly', async () => {
      const hid = (await (async () => { await as(A); return rows<{ id: string }>(`select id from households`); })())[0].id;
      await as(M);
      await expect(
        db.query(`insert into household_members (household_id, profile_id) values ($1, $2)`, [hid, M])
      ).rejects.toThrow(/row-level security|permission denied/i);
    });

    it('rejects a wrong code with the same error as an expired one (no oracle)', async () => {
      await as(M);
      await expect(db.query(`select join_household('0000-0000-0000')`)).rejects.toThrow(/invalid_or_expired_invite/);
    });

    it('bob joins with the code; the code is then dead (single use)', async () => {
      await as(B);
      await db.query(`select join_household($1)`, [code]);
      await as(M);
      await expect(db.query(`select join_household($1)`, [code])).rejects.toThrow(/invalid_or_expired_invite/);
    });

    it('rejects an expired invite', async () => {
      await as(A);
      const fresh = (await rows<{ c: string }>(`select create_invite() as c`))[0].c;
      await db.exec(`reset role; update households set invite_expires_at = now() - interval '1 minute';`);
      await as(M);
      await expect(db.query(`select join_household($1)`, [fresh])).rejects.toThrow(/invalid_or_expired_invite/);
    });

    it('enforces couple capacity of 2', async () => {
      await as(A);
      const fresh = (await rows<{ c: string }>(`select create_invite() as c`))[0].c;
      await as(C);
      await expect(db.query(`select join_household($1)`, [fresh])).rejects.toThrow(/household_full/);
    });

    it('a profile can be in only one active household', async () => {
      await as(M);
      await db.query(`select create_household('couple')`);
      await expect(db.query(`select create_household('couple')`)).rejects.toThrow(/already_in_household/);
    });

    it('only the owner can mint invites', async () => {
      await as(B);
      await expect(db.query(`select create_invite()`)).rejects.toThrow(/not_household_owner/);
    });
  });

  // ------------------------------------------------------------------------------------------
  describe('item visibility', () => {
    beforeAll(async () => {
      await as(A);
      await upsert(ITEM_PUBLIC, baseItem('Alice public kurta'), 100, 'A');
      await upsert(ITEM_PRIVATE, baseItem('Alice private piece', 'PRIVATE'), 100, 'A');
    });

    it('owner sees everything of theirs', async () => {
      await as(A);
      expect((await rows(`select id from wardrobe_items`)).length).toBe(2);
    });

    it('partner sees only PUBLIC items', async () => {
      await as(B);
      const ids = (await rows<{ id: string }>(`select id from wardrobe_items`)).map(r => r.id);
      expect(ids).toEqual([ITEM_PUBLIC]);
    });

    it('outsider sees nothing', async () => {
      await as(M);
      expect(await rows(`select id from wardrobe_items`)).toEqual([]);
    });

    it('partner cannot modify the owner\'s item through the sync function', async () => {
      await as(B);
      await expect(upsert(ITEM_PUBLIC, { title: 'HACKED' }, 999, 'B')).rejects.toThrow();
      await as(A);
      expect((await rows(`select title from wardrobe_items where id = $1`, [ITEM_PUBLIC]))[0].title).toBe('Alice public kurta');
    });

    it('partner cannot modify via direct UPDATE either', async () => {
      await as(B);
      const r = await db.query(`update wardrobe_items set title = 'HACKED' where id = $1`, [ITEM_PUBLIC]);
      expect(r.affectedRows).toBe(0);
    });

    it('cannot write an item as someone else', async () => {
      await as(M);
      await expect(upsert('22222222-0000-0000-0000-000000000009', baseItem('forged'), 100, 'M')).rejects.toThrow();
    });

    it('cannot hand an item to another user by changing user_id', async () => {
      await as(A);
      await expect(db.query(`update wardrobe_items set user_id = $1 where id = $2`, [M, ITEM_PUBLIC])).rejects.toThrow();
    });

    it('a client-supplied household_id is ignored (derived from membership)', async () => {
      await as(A);
      const hid = (await rows<{ id: string }>(`select id from households`))[0].id;
      await as(M); // mallory is in her own household, not alice's
      await db.query(
        `insert into wardrobe_items (id, user_id, title, category, household_id) values ($1, $2, 'smuggled', 'shirt', $3)`,
        ['33333333-0000-0000-0000-000000000001', M, hid]
      );
      await as(B); // bob must not see mallory's item even though she claimed alice's household
      expect(await rows(`select id from wardrobe_items where title = 'smuggled'`)).toEqual([]);
      await as(M);
      const own = await rows<{ household_id: string }>(`select household_id from wardrobe_items where title = 'smuggled'`);
      expect(own[0].household_id).not.toBe(hid);
    });

    it('there is no hard-DELETE path for clients (tombstones only)', async () => {
      await as(A);
      const r = await db.query(`delete from wardrobe_items where id = $1`, [ITEM_PUBLIC]).catch(e => e);
      // either permission denied or zero rows: the row must survive
      await as(A);
      expect((await rows(`select id from wardrobe_items where id = $1`, [ITEM_PUBLIC])).length).toBe(1);
      expect(r).toBeDefined();
    });

    it('households and membership cannot be rewritten by clients', async () => {
      await as(B);
      const r1 = await db.query(`update households set owner_id = $1`, [B]).catch(e => e);
      void r1;
      await as(A);
      expect((await rows<{ owner_id: string }>(`select owner_id from households`))[0].owner_id).toBe(A);
    });
  });

  // ------------------------------------------------------------------------------------------
  describe('server-side per-field LWW (ADR-003)', () => {
    beforeAll(async () => {
      await as(A);
      await upsert(ITEM_MERGE, baseItem('Merge target'), 100, 'A');
    });

    const get = async () => (await rows(`select * from wardrobe_items where id = $1`, [ITEM_MERGE]))[0];

    it('a stale write does not overwrite a newer field', async () => {
      await as(A);
      await upsert(ITEM_MERGE, { title: 'NEW' }, 200);
      await upsert(ITEM_MERGE, { title: 'OLD (arrives late)' }, 150);
      expect((await get()).title).toBe('NEW');
    });

    it('fields merge independently, regardless of arrival order', async () => {
      await as(A);
      await upsert(ITEM_MERGE, { laundry_status: 'DIRTY' }, 250);
      await upsert(ITEM_MERGE, { laundry_status: 'CLEAN' }, 120); // older, ignored
      const r = await get();
      expect(r.laundry_status).toBe('DIRTY');
      expect(r.title).toBe('NEW');
    });

    it('server_seq strictly increases on every write (the pull cursor)', async () => {
      await as(A);
      const s1 = Number((await get()).server_seq);
      await upsert(ITEM_MERGE, { formality_level: 4 }, 300);
      const s2 = Number((await get()).server_seq);
      expect(s2).toBeGreaterThan(s1);
    });

    it('a late-arriving OLD edit still gets a NEW server_seq, so a cursor client sees it', async () => {
      await as(A);
      const before = Number((await get()).server_seq);
      await upsert(ITEM_MERGE, { fabric_type: 'silk' }, 10); // ancient hlc, arrives now
      const after = await get();
      expect(Number(after.server_seq)).toBeGreaterThan(before);
      expect(after.fabric_type).toBe('silk');
    });

    it('delete then newer edit un-deletes; an older delete arriving afterwards does not re-kill it', async () => {
      await as(A);
      await upsert(ITEM_MERGE, { deleted_at: '2026-11-16T00:00:00Z' }, 400);
      expect((await get()).deleted_at).not.toBeNull();

      await upsert(ITEM_MERGE, { title: 'Edited after delete' }, 500);
      expect((await get()).deleted_at).toBeNull();

      await upsert(ITEM_MERGE, { deleted_at: '2026-11-15T00:00:00Z' }, 450); // older delete, late
      const r = await get();
      expect(r.deleted_at).toBeNull();
      expect(r.title).toBe('Edited after delete');
    });

    it('is order-independent: two ops applied in either order give the same row', async () => {
      const ops: Array<[Record<string, unknown>, number]> = [
        [{ title: 'one', laundry_status: 'DIRTY' }, 610],
        [{ title: 'two' }, 620],
        [{ laundry_status: 'IN_WASH', formality_level: 2 }, 615],
        [{ deleted_at: '2026-11-16T00:00:00Z' }, 630],
      ];
      const run = async (order: number[], id: string) => {
        await as(A);
        await upsert(id, baseItem('seed'), 1, 'A');
        for (const i of order) await upsert(id, ops[i][0], ops[i][1]);
        const r = (await rows(`select title, laundry_status, formality_level, deleted_at is null as alive from wardrobe_items where id = $1`, [id]))[0];
        return JSON.stringify(r);
      };
      const forward = await run([0, 1, 2, 3], '44444444-0000-0000-0000-000000000001');
      const reverse = await run([3, 2, 1, 0], '44444444-0000-0000-0000-000000000002');
      const shuffled = await run([2, 0, 3, 1], '44444444-0000-0000-0000-000000000003');
      expect(reverse).toBe(forward);
      expect(shuffled).toBe(forward);
    });
  });

  // ------------------------------------------------------------------------------------------
  describe('membership removal revokes access immediately', () => {
    it('a non-owner cannot remove anyone', async () => {
      await as(B);
      await expect(db.query(`select remove_member($1)`, [A])).rejects.toThrow(/not_household_owner/);
    });

    it('owner removes bob; bob instantly loses sight of alice\'s items', async () => {
      await as(B);
      expect((await rows(`select id from wardrobe_items where user_id = $1`, [A])).length).toBeGreaterThan(0);
      await as(A);
      await db.query(`select remove_member($1)`, [B]);
      await as(B);
      expect(await rows(`select id from wardrobe_items where user_id = $1`, [A])).toEqual([]);
    });

    it('a removed member can be re-invited without a PK violation', async () => {
      await as(A);
      const code = (await rows<{ c: string }>(`select create_invite() as c`))[0].c;
      await as(B);
      await db.query(`select join_household($1)`, [code]);
      expect((await rows(`select id from wardrobe_items where user_id = $1`, [A])).length).toBeGreaterThan(0);
    });

    it('when the owner leaves, ownership transfers rather than orphaning the household', async () => {
      await as(A);
      await db.query(`select leave_household()`);
      await as(B);
      expect((await rows<{ owner_id: string }>(`select owner_id from households where deleted_at is null`))[0].owner_id).toBe(B);
    });
  });

  // ------------------------------------------------------------------------------------------
  describe('account deletion', () => {
    it('delete_my_account removes the profile and every owned row (server copy really goes)', async () => {
      await as(A);
      await db.query(`select delete_my_account()`);
      await db.exec('reset role;');
      expect((await rows(`select 1 from profiles where id = $1`, [A])).length).toBe(0);
      expect((await rows(`select 1 from wardrobe_items where user_id = $1`, [A])).length).toBe(0);
      expect((await rows(`select 1 from auth.users where id = $1`, [A])).length).toBe(0);
    });
  });
});
