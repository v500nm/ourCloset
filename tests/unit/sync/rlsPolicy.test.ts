import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Phase 5 Supabase Migration & RLS Security Policy Verification', () => {
  const migrationPath = path.resolve(
    process.cwd(),
    'supabase/migrations/20261115000000_phase5_sync_schema.sql'
  );
  const sql = fs.readFileSync(migrationPath, 'utf-8');

  it('enforces ADR-002: Zero garment photos or image binary columns in Postgres sync schema', () => {
    // Photos must never be synced to cloud per Tenet 1 & ADR-002
    expect(sql).not.toMatch(/image_url\s+text/i);
    expect(sql).not.toMatch(/photo_url\s+text/i);
    expect(sql).not.toMatch(/bytea/i);
    expect(sql).not.toMatch(/image_binary/i);
  });

  it('enforces ADR-004: Drops pgvector extension and vector columns', () => {
    expect(sql).not.toMatch(/create extension.*vector/i);
    expect(sql).not.toMatch(/color_embedding\s+vector/i);
    expect(sql).not.toMatch(/silhouette_embedding\s+vector/i);
    expect(sql).not.toMatch(/vector_cosine_ops/i);
  });

  it('enforces ADR-003: Adds HLC timestamps and soft-delete tombstones', () => {
    expect(sql).toMatch(/hlc_timestamp\s+text/i);
    expect(sql).toMatch(/deleted_at\s+timestamptz/i);
  });

  it('enables Row-Level Security on all synchronized tables', () => {
    const requiredTables = [
      'profiles',
      'households',
      'household_members',
      'wardrobe_items',
      'outfit_history',
    ];

    for (const table of requiredTables) {
      const rlsRegex = new RegExp(`alter\\s+table\\s+${table}\\s+enable\\s+row\\s+level\\s+security`, 'i');
      expect(sql).toMatch(rlsRegex);
    }
  });

  it('enforces partner visibility filter: partners can only SELECT PUBLIC items', () => {
    // Partner visibility must explicitly check privacy_tier = 'PUBLIC'
    expect(sql).toMatch(/privacy_tier\s*=\s*'PUBLIC'/i);
    expect(sql).toMatch(/is_household_member\(household_id\)/i);
  });

  it('enforces strict ownership check: users can only modify their own items', () => {
    expect(sql).toMatch(/user_id\s*=\s*auth\.uid\(\)/i);
    expect(sql).toMatch(/worn_by\s*=\s*auth\.uid\(\)/i);
  });
});

