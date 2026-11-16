# ourCloset — Known Limitations & Edge Cases

This document formalizes the known technical limitations, architectural trade-offs, and boundary edge cases identified during system audits and phase completions. Following our engineering standards, **limitations are explicitly documented rather than left to be discovered in production**.

---

## Index of Known Limitations

| ID | Title | Area | Severity | Status |
|---|---|---|---|---|
| **LIM-001** | `wear_count` Last-Write-Wins Race Condition | Sync / Data Layer | Low | Documented |
| **LIM-002** | Public-to-Private Visibility Lag & Local Tombstone Asymmetry | RLS / Delta Sync | Medium | Documented |
| **LIM-003** | Sequence-vs-Commit Reordering Mitigation (`pullOverlap = 25`) | Delta Sync Transport | Low | Documented |
| **LIM-004** | Tombstone Garbage Collection & Indefinite Storage Growth | Data Layer (IDB & Cloud) | Low | Documented |
| **LIM-005** | Sign-Out Local Storage Persistence | Auth & Privacy | Low | Documented |
| **LIM-006** | Pre-UUID Sample Wardrobe Re-Keying & Learned Prompt References | Ingestion / Learning Engine | Low | Documented |
| **LIM-007** | Household Join Code Brute-Force Rate Limiting | Security & Auth | Medium | Documented |

---

## Detailed Analyses & Mitigations

### LIM-001: `wear_count` Last-Write-Wins Race Condition

- **Description**: Each `wardrobe_items` record maintains a scalar `wear_count` integer used for cost-per-wear and laundry frequency calculations. Because the sync protocol uses per-field Last-Write-Wins (LWW) governed by Hybrid Logical Clocks, concurrent offline increments conflict.
- **Scenario**:
  1. Both spouses log wears of the same shared garment while both are offline.
  2. Device A increments `wear_count` from $5 \to 6$.
  3. Device B increments `wear_count` from $5 \to 6$.
  4. Upon reconnection, the LWW merge algorithm evaluates the higher HLC and writes `wear_count = 6` instead of the true value $7$.
- **Impact**: One wear count increment is dropped under concurrent offline conditions.
- **Current Mitigation**: Normal wear logging also appends an immutable entry to `outfit_logs` (an append-only log with unique UUIDs), preserving the true audit trail.
- **Planned Resolution**: Deprecate scalar `wear_count` column on `wardrobe_items` and compute wear counts dynamically via a SQL view / local aggregation over `outfit_logs`:
  $$\text{wear\_count}(itemId) = \sum [\text{outfit\_logs.item\_ids} \ni itemId]$$

---

### LIM-002: Public-to-Private Visibility Lag & Local Tombstone Asymmetry

- **Description**: When a user changes a garment's privacy tier from `PUBLIC` to `PRIVATE`, Postgres Row Level Security (RLS) immediately revokes read permissions for the household partner (`privacy_tier = 'PUBLIC'`).
- **Scenario**:
  1. User A lists an item as `PUBLIC`. Partner B pulls and caches the metadata locally in IndexedDB.
  2. User A changes the item to `PRIVATE`.
  3. Supabase updates the row. Now, when Partner B executes a delta pull (`SELECT * FROM wardrobe_items WHERE server_seq > :cursor`), the row is excluded by RLS.
  4. Because the row is excluded rather than returned with a `deleted_at` tombstone, Partner B never receives an instruction to delete the item from their local IndexedDB.
  5. Similarly, when a member leaves a household, already-replicated partner items remain in their local IndexedDB.
- **Impact**: Partner B retains a stale local copy of the metadata (category, color swatch, silhouette) until local database wipe or explicit purge.
- **Current Mitigation**: Garment photos were never synced (ADR-002), so private photo binaries are never compromised. Only abstract category/swatch metadata persists.
- **Planned Resolution**: Introduce an explicit `sync_revocations` table in Supabase that records tombstone event IDs visible to all household members even when the underlying record's read access is revoked.

---

### LIM-003: Sequence-vs-Commit Reordering Heuristic (`pullOverlap = 25`)

- **Description**: The delta sync pull worker queries Supabase using a monotonically increasing sequence `server_seq`. In highly concurrent environments, PostgreSQL transaction commits can complete out of sequence order:
  - Transaction 1 acquires `server_seq = 101` but commits at $T_2$.
  - Transaction 2 acquires `server_seq = 102` and commits at $T_1$ ($T_1 < T_2$).
  - A client pulling at $T_1$ with cursor 100 sees sequence 102 and advances their local cursor to 102, permanently skipping sequence 101.
- **Impact**: Under extreme high-throughput concurrent writes, a client could miss a sync payload.
- **Current Mitigation**: `src/data/sync/syncWorker.ts` uses an overlapping pull heuristic:
  ```typescript
  const pullCursor = Math.max(0, lastKnownSeq - 25);
  ```
  Every pull re-reads the last 25 sequences, reconciling duplicate deliveries via idempotency keys. In practice, sequence gaps rarely exceed 1–2 transactions.
- **Planned Resolution**: Transition from integer sequence cursors to Postgres transaction commit timestamps (`pg_xact_commit_timestamp`) or a gap-free transaction counter.

---

### LIM-004: Tombstone Garbage Collection & Indefinite Storage Growth

- **Description**: When a garment or outfit log is deleted, ADR-003 mandates that a tombstone (`deleted_at = now()`, `is_deleted = true`) be written and synchronized to ensure partitioned devices do not resurrect the deleted entity upon reconnecting.
- **Scenario**: ADR-003 recommends purging tombstones older than 90 days. Currently, tombstones are preserved indefinitely in both IndexedDB and Supabase.
- **Impact**: As users delete garments over years, deleted records consume minor storage space in IndexedDB (typically $< 50\text{kB}$ per 1,000 tombstones).
- **Current Mitigation**: Tombstones are filtered from all UI queries and outfit engine candidate pools via compound index conditions (`deleted_at IS NULL`).
- **Planned Resolution**: Implement a scheduled background cleanup job that permanently prunes tombstones where:
  $$\text{now}() - \text{deleted\_at} > 90\text{ days}$$
  paired with a client tombstone expiry check.

---

### LIM-005: Sign-Out Local Storage Persistence

- **Description**: When a user signs out of Supabase in `ourCloset`, their local IndexedDB database is intentionally preserved rather than cleared.
- **Rationale**: `ourCloset` is an offline-first application designed to function seamlessly in guest mode. Erasing local IndexedDB on sign-out would destroy wardrobe data for users who accidentally sign out or experience token expiration while offline.
- **Risk**: If multiple users share a physical device profile and sign in/out sequentially, the second user could inspect the first user's cached metadata.
- **Current Mitigation**: An explicit, irreversible **"Delete User Account & Local Data"** button is provided in `/setup` (`AccountDataManagement.tsx`), which wipes both Supabase cloud data and local Dexie tables.
- **Planned Resolution**: Add a modal confirmation prompt on sign-out: *"Keep wardrobe on this device for offline access, or wipe local cache?"*

---

### LIM-006: Pre-UUID Sample Wardrobe Re-Keying & Learned Prompt References

- **Description**: When a new user loads the optional "Sample Wardrobe", items are seeded with human-readable fixture IDs (e.g., `sample-kurta-1`, `sample-abaya-navy`).
- **Scenario**:
  1. The user uses the sample wardrobe and the local learning engine records feedback associating `sample-kurta-1` with specific occasion prompts (e.g., "Eid prayer").
  2. The user signs in and connects to Supabase cloud sync.
  3. Because Postgres `wardrobe_items.id` requires standard RFC4122 UUIDs, `syncBootstrap.ts` re-keys all `sample-*` items to generated UUIDs (`crypto.randomUUID()`).
- **Impact**: Historical learning engine prompt records that directly reference the old string ID `sample-kurta-1` become orphaned.
- **Current Mitigation**: The learning engine gracefully falls back to category-level weights if a specific garment UUID is unresolvable.
- **Planned Resolution**: Update `syncBootstrap.ts` to execute an atomic re-key cascade across `localLearningEngine` prompt association tables during UUID migration.

---

### LIM-007: Household Join Code Rate Limiting

- **Description**: Joining a household requires submitting a 6-character alphanumeric invite code (e.g., `A9X2K4`).
- **Scenario**: While codes expire within 48 hours and are single-use, the Supabase Postgres RPC function `join_household()` does not currently enforce a per-IP failure rate limit.
- **Impact**: An attacker with network access to the Supabase endpoint could theoretically attempt brute-force permutations ($36^6 \approx 2.17 \times 10^9$ possibilities).
- **Current Mitigation**: Invite codes are cryptographically generated with high entropy, single-use, and hard-expire after 48 hours. Furthermore, Supabase's API gateway enforces edge IP rate limits.
- **Planned Resolution**: Add a failed-attempt counter in PostgreSQL (`join_attempts`) that locks joining for 15 minutes after 5 consecutive incorrect code submissions.

