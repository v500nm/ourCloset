# ADR-003: Conflict Resolution using Hybrid Logical Clocks (HLC)

- **Status**: Accepted
- **Date**: 2026-11-15
- **Deciders**: Architecture & Engineering Team
- **Consulted**: Claude Phase Plan (§1, §2, §3 Phase 5), Pre-Claude Phase Context (§13 Gap 4)

---

## Context and Problem Statement

`ourCloset` is an offline-first collaborative application where multiple members of a household (e.g., partners, spouses, siblings) concurrently interact with shared wardrobe data:
- Both partners might be offline (e.g., in transit, traveling, or in low-connectivity areas) while logging outfits or adjusting clothing laundry statuses (`CLEAN` $\to$ `DIRTY` $\to$ `IN_WASH`).
- Partner A may mark a partner's jacket as `IN_WASH` while Partner B simultaneously updates the item's tags or formality level.
- One member may delete an item while the other edits its notes.

Relying on standard physical wall-clock timestamps (`Date.now()` or ISO-8601 UTC strings) for Last-Write-Wins (LWW) creates critical failure modes:
1. **Clock Skew and Drift**: Mobile device clocks routinely drift by seconds or minutes, can be altered by manual user adjustments, and experience non-monotonic jumps during Network Time Protocol (NTP) adjustments or timezone transitions. A device with a clock set 5 minutes fast would permanently clobber all concurrent and subsequent edits from other devices.
2. **Whole-Record Overwrites**: Naive record-level LWW discards concurrent non-conflicting edits. If Partner A changes `laundry_status` and Partner B updates `accent_colors`, a record-level LWW drops one of the edits entirely.
3. **Silent Deletion Anomalies**: Hard deleting a row in a local database while another device is offline means the deletion never propagates, or worse, the offline device's sync re-creates the deleted item ("zombie resurrection").

---

## Decision

1. **Adopt Hybrid Logical Clocks (HLC)**:
   - Implement Hybrid Logical Clocks combining physical wall-clock time with a monotonically increasing logical counter and unique client identifier:
     $$\text{HLC} = \langle l, c, d \rangle$$
     where $l$ is the physical component (milliseconds since UNIX epoch), $c$ is the logical counter for events occurring within the same millisecond or during clock backward skew, and $d$ is the unique client/device UUID (`node_id`).
   - Every local mutation generates a new HLC timestamp that advances the client's clock state:
     $$l' = \max(l_{\text{client}}, l_{\text{received}}, \text{physical\_time})$$
     $$c' = \begin{cases} c_{\text{client}} + 1 & \text{if } l' = l_{\text{client}} = l_{\text{received}} \\ \max(c_{\text{client}}, c_{\text{received}}) + 1 & \text{if } l' = l_{\text{received}} \\ 0 & \text{otherwise} \end{cases}$$
2. **Per-Field Last-Write-Wins (LWW) Resolution**:
   - Track field-level update metadata on synchronizable entities. Each syncable attribute maintains its own update HLC timestamp.
   - When merging an incoming update with a local record, conflict resolution evaluates field-by-field:
     $$\text{Field}_k = \text{Field}_k^{\text{incoming}} \quad \iff \quad \text{HLC}_k^{\text{incoming}} > \text{HLC}_k^{\text{local}}$$
   - Non-conflicting concurrent edits (e.g., Partner A updating `laundry_status` and Partner B updating `cultural_style`) merge cleanly without data loss.
3. **Tombstone-Based Deletions**:
   - Soft deletes are mandated for all synchronizable records. Deletions set `deleted_at: string` and assign an HLC timestamp to a `tombstone` record rather than executing hard `DELETE` queries.
   - During sync reconciliation, a deletion with $\text{HLC}_{\text{delete}} > \text{HLC}_{\text{record}}$ marks the item as deleted across all household nodes.
   - An item updated after a deletion ($\text{HLC}_{\text{edit}} > \text{HLC}_{\text{delete}}$) is deterministically un-deleted (intentional re-activation).
   - Tombstones are pruned after a generous retention horizon (e.g., 90 days) once all active household devices have acknowledged synchronization.
4. **Outbox Synchronization Engine**:
   - Local mutations append an entry into an indexed `sync_outbox` table in Dexie with an idempotency key, entity ID, changed fields, and HLC timestamp.
   - The sync engine pushes queued deltas to Supabase and processes delta pulls cursor-ordered by HLC.

---

## Consequences

### Positive
- **Guaranteed Monotonic Ordering**: Eliminates data corruption and phantom rollbacks caused by physical clock skew, timezones, or manual clock shifts.
- **Granular Convergence**: Per-field LWW allows concurrent edits to different attributes of the same clothing item or outfit to merge without conflict or data loss.
- **No Zombie Resurrections**: Explicit tombstones ensure deletions reliably propagate across offline household members when they reconnect.
- **Deterministic and Autonomous**: Resolution requires zero interactive user dialogs ("Pick version A or version B"), maintaining a seamless mobile experience.

### Negative / Trade-offs
- **Storage Overhead**: Tracking per-field HLC metadata or storing patch operations increases local IndexedDB and cloud payload sizes slightly compared to bare rows.
- **Tombstone Garbage Collection**: Requires a background pruning routine to purge stale tombstones past the 90-day retention window.

### Neutral
- Mathematical complexity of HLC comparison is fully encapsulated inside a standalone utility (`src/utils/hlc.ts`) with 100% unit test coverage.



---

## Addendum (2026-11-16): the pull cursor is NOT an HLC

**Problem found.** The first sync worker paged on `hlc > last_seen_hlc`. An offline device pushes old HLCs late, so once any other device had synced, the cursor sat *ahead* of the late write and that write was never delivered. Reproduced deterministically in `tests/unit/sync/convergence.test.ts` ("REGRESSION: pull cursor must follow server write order").

**Decision.** HLCs order *conflicts*; they must not order *delivery*. Rows carry a server-assigned `server_seq` (one global sequence, stamped by trigger on every insert/update). Clients page on it, with a small overlap window because sequence order is assignment order, not commit order. Reconciliation is idempotent, so redelivery is safe.

**Merge semantics are defined twice and must match:** `reconcileEntity` (client) and `sync_wardrobe_upsert` (server). Both use per-field LWW by HLC, byte-wise comparison of fixed-width HLC strings, and `deleted_at` survives only if no other field was edited after it. The server function matters because a plain `UPDATE` is last-*arrival*-wins and would let a stale device overwrite newer fields. A differential test running the same random operations through both implementations is a worthwhile follow-up; today they are tested separately.
