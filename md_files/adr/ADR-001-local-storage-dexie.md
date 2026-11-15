# ADR-001: Move from idb-keyval to Dexie / Typed IndexedDB with Schema Versioning

- **Status**: Accepted
- **Date**: 2026-11-15
- **Deciders**: Architecture & Engineering Team
- **Consulted**: Claude Phase Plan (§2, §3 Phase 1), Pre-Claude Phase Context

---

## Context and Problem Statement

In the initial prototype of `ourCloset`, local persistence was either simulated in React memory (`useState(MOCK_WARDROBE)` in `WardrobeProvider`) or referenced through simple key-value storage (`idb-keyval`).

`ourCloset` is fundamentally a local-first application designed to function seamlessly offline. Its core domain models—wardrobe items, outfits, household members, laundry states, and offline sync outbox mutations—require structured querying and relationship indexing:
1. **Multi-attribute Indexing**: The outfit generation engine and laundry tracker need fast, compound queries such as:
   - Querying all clean items for a specific household member: `[ownerId + laundry_status]`.
   - Querying items filtered by cultural style and category: `[cultural_style + category]`.
   - Ordering outfits by recency: `[worn_by + worn_at]`.
2. **Schema Evolution & Migrations**: As the application evolves across releases (e.g., adding cultural taxonomy attributes, hybrid logical clock fields, tombstone markers), client-side database schemas must upgrade safely without dropping or corrupting existing user wardrobes.
3. **Decoupling from React State**: Domain logic must reside in typed repositories with reactive subscriptions (`useLiveQuery` or observable patterns), rather than embedding database operations and business logic directly inside React context providers.

`idb-keyval` only supports unindexed key-value blobs (`get`/`set`), requiring full table deserialization into memory for every query or filter operation. This model degrades rapidly as closet sizes grow to hundreds of items and cannot support transactional schema migrations.

---

## Decision

1. **Adopt Dexie.js as the Primary Storage Engine**:
   - Transition all structured domain entities (`wardrobeItems`, `outfitLogs`, `householdMembers`, `householdBonds`, `syncQueue`, and binary image `blobs`) from raw memory/`idb-keyval` to a typed IndexedDB database managed with **Dexie.js** (or a typed IndexedDB wrapper with equivalent declarative schema and migration support).
2. **Implement Explicit Schema Versioning & Migrations**:
   - Define versioned schemas using Dexie's migration pipeline (`db.version(1).stores({...})`, `db.version(2).upgrade(...)`).
   - Mandate automated migration tests in CI for every schema version bump to prevent regression or data loss during client upgrades.
3. **Establish Typed Repositories**:
   - Create dedicated repository modules under `src/data/repositories/` (`WardrobeRepository`, `OutfitRepository`, `MemberRepository`, `SyncQueueRepository`).
   - Expose domain queries as pure, asynchronous functions and reactive hooks (`useLiveQuery`) that React components and providers consume cleanly.
4. **Constrain `idb-keyval` Scope**:
   - Retain `idb-keyval` solely for unindexed, isolated key-value settings and client UI preferences (e.g., theme toggle, transient banner dismissals).

---

## Consequences

### Positive
- **Fast Indexed Queries**: Lookups by owner, laundry availability (`CLEAN`, `DIRTY`, `IN_WASH`, `DRY_CLEANING`), formality level, and cultural taxonomy run in sub-millisecond time directly against IndexedDB B-tree indexes without deserializing entire datasets.
- **Reliable Data Persistence**: Mutations survive page reloads, offline tab closures, and app restarts; eliminates prototype state wipeouts on browser refresh.
- **Safe Migrations**: New columns and index definitions can be added incrementally with declarative upgrade callbacks, ensuring existing user closets are preserved across application updates.
- **Thin UI Providers**: `WardrobeProvider` and `HouseholdProvider` become lightweight subscriber layers over data repositories, simplifying state management and eliminating UI-coupled persistence bugs.

### Negative / Trade-offs
- **Bundle Footprint**: Dexie adds approximately ~20 KB (gzipped) to the client bundle, which is acceptable given the substantial database management benefits and elimination of custom index-building code.
- **Schema Management Overhead**: Developers must define and test formal migration scripts for any local database modifications instead of ad-hoc JSON modifications.

### Neutral
- High-level preferences and unindexed flags continue to use `idb-keyval` or localStorage without requiring table migrations.

