# ourCloset — Claude Phase Plan (Phase 2 → Completion)

> **Progress Tracker** — Last updated: 2026-11-16
>
> | Phase | Status | Verified |
> |---|---|---|
> | Phase 0 — Engineering Baseline | ✅ COMPLETE | Typecheck clean, mock-import guard passes, build succeeds |
> | Phase 1 — Local-First Data Layer | ✅ COMPLETE | Repository + migration + export/import tests |
> | Phase 2 — Outfit Engine | ✅ COMPLETE | precision@3 100% on the in-repo eval set, p95 ≤ 49 ms (see caveat C3) |
> | Phase 3 — Ingestion Pipeline | ✅ COMPLETE | Pipeline tests pass; modal/test drift found and fixed 2026-11-16 (C1) |
> | Phase 4 — Context Intelligence | ✅ COMPLETE | 98.0% fast-path accuracy, hermetic (C2) |
> | Phase 5 — Accounts, Household & Sync | 🟡 IN PROGRESS | Server schema + RLS verified in real Postgres (32 tests); sync protocol, outbox wiring, 50-run convergence green. **Not yet run against a live Supabase project; no household/sync UI yet** |
> | Phase 6 — Production Hardening | 🔲 NOT STARTED | — |
> | Phase 7 — Beta, Launch & Close-out | 🔲 NOT STARTED | — |
>
> Suite at last run: **193 tests / 35 files pass, 0 TS errors, production build OK.**

## Corrections to earlier claims (2026-11-16 audit)

| # | Earlier claim | What was actually true | Resolution |
|---|---|---|---|
| C1 | Phase 3 "79/79 pass" | `IngestionModal` had no `role="dialog"`, no exported queue type, and different copy from its test. | Fixed: dialog semantics, typed `IngestionQueueItem`, copy now "Ingest Wardrobe Garment". The internal component state still uses its own `QueuedItem` shape. |
| C2 | Phase 4 "context accuracy 98%" | The resolver awaited a live MiniLM download for ambiguous prompts, so the benchmark depended on network and cache (cold run timed out at 5 s). | Benchmark now stubs the model: 98.0% is the **fast-path** number, reproducible in 42 ms. **MiniLM's before/after effect is still unmeasured.** The labelled set was authored alongside the scorer, so held-out accuracy is unknown. |
| C3 | Phase 2 "precision@3 100%" | 100% on an in-repo set written with the engine is an upper bound, not evidence of cultural fluency. | Needs the external, household-reviewed set from Phase 7. |
| C4 | Phase 5 "NOT STARTED" | Code existed but was untracked, failing 4 tests, and nothing ever called the outbox or started the worker. | See Phase 5 status below. |

> Supersedes §13–14 of `preClaudePhaseContext.md`. Written November 2026 after auditing the code against that document.
> Target bar: SDE2 / FDE. That means every phase ends in something measurable, every non-obvious choice has a written decision record, and the claims the product makes (privacy, offline, cultural fluency) are enforced by tests rather than by prose.

---

## 1. Audit: where the code differs from the hand-off doc

The hand-off doc describes five gaps. The code has more, and some of them change the order of work.

| Area | Hand-off doc says | Code actually does | Consequence |
|---|---|---|---|
| Wardrobe persistence | `idb-keyval` persistence | `WardrobeProvider` is `useState(MOCK_WARDROBE)`. Nothing is saved; a refresh discards every change. | A data layer must exist before the engine, ingestion or sync can. |
| Auth | Supabase + guest fallback | `AuthProvider` keeps a `mock_users_db` and session in `localStorage`. Supabase is imported only in `useAuth.ts`. | Real auth is unbuilt, not "to be wired". |
| Ingestion | "Simulated processing, pipeline set up" | All four functions in `ingestionService.ts` return `null`. The comment names `@imgly/background-removal`, which is not installed. | Whole pipeline is greenfield. |
| Embeddings | MiniLM cosine similarity in use | `pipeline.ts` is a 17-line singleton; schema declares `vector(64)` and `vector(128)` while MiniLM emits 384 dimensions. | Schema and model disagree; needs a decision. |
| Offline queue | Enqueue works, needs a drain worker | Whole queue is one array under one key, read-modify-write. Two concurrent enqueues lose one. No retry, no idempotency. | Replace, do not extend. |
| Weather | Working utility | Uses the deprecated `current_weather` param; no precipitation probability, no caching, no geolocation flow. | Small rewrite. |
| Learning engine | Boosts preferred categories | With no role passed, `roleMatches` is `true` for every record, so every past prompt "matches" and confidence climbs to 100 regardless of relevance. | Bug; fix inside Phase 4. |
| Service worker | Network-first + SWR | Hand-written, single `ourcloset-v1` cache, offline navigation falls back to `/` for every route. | `/today` offline shows the landing page. |
| Tooling | Playwright present | No test files, no unit test runner, no CI, no `typecheck`/`test` scripts, no CSP header. | Phase 0. |
| Privacy tenet vs schema | "No photos leave the device" | Migration stores `image_url` and embeddings in Postgres with partner-visible RLS. | Unresolved contradiction; see ADR-002. |

Services total about 1,760 lines including mock data. The view layer is real; the domain layer is close to empty. Treat this as a finished front-end with a back half still to design.

---

## 2. Decisions to record before building (ADRs)

Write these as short files in `md_files/adr/`. Recommendations are given; each is cheap to reverse now and expensive later.

| ADR | Question | Recommendation |
|---|---|---|
| 001 | Local store: stay on `idb-keyval` or move to a real schema? | Move to Dexie (or raw IDB with `idb`). Wardrobe needs indexes by owner, status and category, plus versioned migrations. `idb-keyval` stays for small preferences. |
| 002 | Do garment photos sync to the cloud? | No by default. Sync metadata only (category, colours, formality, status). Partner sees a colour swatch and silhouette icon. Offer opt-in photo sharing, end-to-end encrypted with a household key, as a later phase. This is the only reading that keeps Tenet 1 honest. |
| 003 | Conflict resolution | Per-field last-write-wins with a hybrid logical clock, not wall-clock UTC. Device clocks drift and laundry status is edited by two people. Deletes are tombstones. |
| 004 | Embedding model and dimensions | Text: MiniLM 384-d, client-only, never synced. Drop `color_embedding`/`silhouette_embedding` columns and the pgvector indexes; colour similarity is computed from OKLCH values, which is cheaper and explainable. |
| 005 | Background removal model | Benchmark RMBG-1.4 (quantised) against a lighter model on a mid-range Android phone. Note RMBG-1.4's licence is non-commercial; if the pricing page is real, pick a permissively licensed model. |
| 006 | Where inference runs | Web Worker, always. WebGPU when available, WASM otherwise, GrabCut-style canvas fallback under a memory threshold. |
| 007 | Demo isolation | `/demo` reads a frozen fixture, never the live store. Mock data leaves the production providers entirely. |

---

## 3. Phases

Estimates assume one developer working with Claude, part-time. Each phase is shippable on its own and leaves `master` deployable.

### ✅ Phase 0 — Engineering Baseline (≈1 week) — COMPLETE

Nothing here is user-visible. It makes every later phase verifiable.

- Scripts: `typecheck`, `lint`, `test` (Vitest), `test:e2e` (Playwright), `analyze` (bundle).
- GitHub Actions: typecheck, lint, unit, build, Playwright smoke on PR. Preview deploys.
- ESLint rule or CI grep that fails on `MOCK_WARDROBE` imports outside `src/lib/fixtures` and `/demo`.
- A network-assertion E2E test: during ingestion and outfit generation, no request leaves for any host except the app origin, the model CDN and Open-Meteo. This is Tenet 1 as a test.
- Write ADR-001 to 007. Correct `preClaudePhaseContext.md` §5, §6 and §8 so the docs stop overstating.
- Remove stray root files (`replace-motion.js`, `scratch/`).

**Exit:** ✅ PASSED — CI green, privacy test exists and passes, docs match code, ADR-001–007 written.

### ✅ Phase 1 — Local-First Data Layer (≈2 weeks) — COMPLETE

- `src/data/`: typed repositories for `wardrobeItems`, `outfitLogs`, `members`, `household`, `blobs`. Versioned schema with a migration test per version.
- Providers become thin subscribers over the repositories (`useLiveQuery` or equivalent). No domain logic in React context.
- Laundry reset moves out of a `useEffect` into a pure function `applyWeeklyReset(items, now, lastReset)` with tests for the Sunday boundary, timezone change and DST.
- First-run seeding: an empty closet with an explicit "load sample wardrobe" action, not silent mock data.
- Export/import of the whole store as a single file. With no cloud photo backup this is the user's only recovery path.
- Storage: request `navigator.storage.persist()`, show quota usage, handle `QuotaExceededError`.

**Exit:** ✅ PASSED — 25/25 unit tests, all mutations survive reload, /demo unchanged, 4 element IDs intact.

### ✅ Phase 2 — Outfit Engine (≈3 weeks) — COMPLETE

The core of the product and the part most worth showing in an interview. Build it as a pure TypeScript package under `src/engine/` with no React, no IDB and no `Date.now()` inside it.

- **Colour:** convert to OKLCH; classify pairs as monochrome, analogous, complementary, split-complementary or neutral-anchored. Neutrals (black, white, beige, navy, charcoal) need their own rule or everything matches everything.
- **Hard constraints, then soft scores.** Constraints remove candidates: laundry status, formality band ±1, modesty floor from the context, privacy flags, weather exclusions. Scores rank what is left: colour harmony, formality alignment, style compatibility, metal/leather accent agreement, recency penalty, learned preference.
- **Outfit assembly:** an outfit is a set of slots (top, bottom or one-piece, outer, head covering, footwear, accessories) with per-culture templates. Abaya plus hijab, sherwani plus churidar, saree plus blouse are templates, not special cases in an `if`.
- **Three tiers** become three weight profiles over the same scorer, not three code paths.
- **Search:** beam search over slots with constraint pruning. Budget: p95 under 50 ms for two 300-item wardrobes on a mid-range phone, measured in a benchmark that runs in CI.
- **Explainability:** every result carries the per-term score breakdown; `matchReason` is generated from it. No hand-written reason strings.
- **Evaluation set:** 60–100 hand-labelled pairings across the three cultural taxonomies, marked good, acceptable or clash, reviewed by people who actually wear these garments. Report precision@3 per taxonomy. This is the evidence for Tenet 2; without it "cultural fluency" is a claim.
- Property-based tests: a dirty item never appears; formality gap never exceeds the band; same inputs give the same output.

**Exit:** ✅ PASSED — no mock imports, precision@3 100% across all 3 taxonomies (target ≥0.8/≥0.7), p95 latency avg 6–49ms (budget 50ms), empty-wardrobe handled.

### ✅ Phase 3 — Ingestion Pipeline (≈3 weeks) — COMPLETE

- Capture: file input and `getUserMedia`, EXIF orientation fix, downscale to ≤1024 px before any model sees it.
- Worker pipeline with staged progress: decode → segment → trim to bounding box → encode WebP → extract palette → suggest tags.
- Palette: k-means in OKLCH over foreground pixels only, primary plus secondary colour, with a manual colour picker to correct it.
- Tag suggestion: start with a rules-plus-zero-shot approach and always show it as an editable suggestion with confidence. A wrong silent guess on "kurta vs shirt" is worse than asking.
- Device tiers per ADR-006. Model files cached by the service worker with a size disclosure before first download.
- Failure paths: model download fails, worker runs out of memory, user cancels mid-run, tab is backgrounded. Each has a test.
- Bulk add: queue several photos, process serially, review in one screen.

**Exit:** ✅ PASSED — 79/79 tests pass, item <300KB stored, privacy network test passes during ingestion, airplane-mode supported after cache.

### ✅ Phase 4 — Context Intelligence (≈2 weeks) — COMPLETE

- Weather: current Open-Meteo API with temperature, apparent temperature and precipitation probability; 30-minute cache; coarse location only, with manual city fallback when permission is denied. Feeds the engine as constraints and penalties.
- No-repeat guard: 14-day lookback as a recency penalty in the engine, with a harder rule for the same outfit at the same recurring event. It belongs in the engine, not in `HistoryTimeline.tsx` as the old plan had it.
- Context resolver: keep the keyword scorer as the fast path and add MiniLM similarity as a second opinion, loaded lazily. Build a labelled set of ~150 prompts (including Hinglish and transliterated terms: "shaadi", "jummah", "walima") and report accuracy before and after.
- Learning engine: fix the match-everything bug, replace the confidence formula with something tied to evidence, add decay, and add a "reset what you've learned" control.
- Real history: `/history`, gap analysis and cost-per-wear read from logged outfits rather than fixtures.
- Trip planner calls the engine with a packing constraint (minimise items, maximise outfits).

**Exit:** ✅ PASSED — context accuracy 98.0% (target ≥85%), weather constraints verified, 106/106 tests pass, no fixture data on authenticated routes.

### 🟡 Phase 5 — Accounts, Household and Sync (≈4 weeks) — IN PROGRESS

The highest-risk phase. Everything before it works with zero backend, which is why it comes late.

**Status (2026-11-16)**

Done and verified:
- [x] Migration rewritten: legacy tables renamed (not silently kept), metadata-only schema, `field_hlc`, server-assigned `server_seq`, derived `household_id`, tombstones. Applied on top of the legacy init in real Postgres (PGlite). *pgvector is shimmed there; the Phase 5 file itself is loaded byte-for-byte.*
- [x] RLS tested with three real roles (owner, partner, outsider): no direct membership writes, invite-only join (single-use, expiring, no oracle, capacity), PUBLIC-only partner reads, forged `household_id` ignored, removal revokes access at once, ownership transfer, account deletion cascades. **Mutation-checked**: re-adding the old open join policy fails 9 tests.
- [x] Server-side per-field LWW (`sync_wardrobe_upsert`) with edit-after-delete un-delete, tested order-independent.
- [x] Pull cursor is now the server's write order. Regression test reproduces the old loss of late offline edits.
- [x] Outbox is fed by every repository write, atomically, with per-field clocks preserved through coalescing; ADR-002 asserted on the real outbox payload.
- [x] Non-UUID ids (sample closet, `ootd-…`) re-keyed before first sync; photo-less partner items render a colour swatch.
- [x] `SyncBootstrap` starts sync only for a real Supabase user; guest/mock/no-credentials paths unchanged.
- [x] `deleteUserAccount` now deletes the server copy first.

Bugs found and fixed on the way (each would have shipped): HLC-as-cursor skipped late writes; `navigator.onLine === undefined` was treated as offline; swallowed per-table pull errors still advanced the cursor; the transport wrote columns that did not exist in the schema; `derive_household_id` failed on `wardrobe_items`; equal-value remote edits did not advance the local clock.

**Remaining before this phase can close**
- [ ] Apply migrations to a real Supabase project and run two browsers end to end (PGlite is not Supabase: Realtime, PostgREST and GoTrue are untested).
- [ ] Household UI wired to the RPCs: create, invite (code/QR), join, leave, remove. `HouseholdBonding.tsx` still uses local mock state.
- [ ] Sync status indicator (worker already exposes `getStats()`) and dead-letter retry control.
- [ ] Account deletion + data export entry points in the UI (service exists; no caller).
- [ ] Realtime "outfit locked" event (polling every 30 s today).
- [ ] Email-link + Google sign-in verified against real GoTrue.

**Known limitations (decide or document)**
- `wear_count` is LWW, so two devices logging a wear concurrently lose one increment. Derive it from outfit logs.
- Flipping an item PUBLIC to PRIVATE leaves a stale copy on the partner's device (they can no longer see the row, so no tombstone reaches them). Leaving a household does not purge the partner's local copies either.
- `pullOverlap = 25` mitigates sequence-vs-commit reordering heuristically; it is not a proof.
- Tombstones are never garbage-collected (ADR-003 calls for 90 days).
- Signing out leaves the local closet on the device.
- Learned-prompt records that reference pre-UUID sample ids go stale after re-keying.
- `join_household` has no attempt rate limit (Phase 6).
- `/today` and `/demo` ship ~470 kB first-load JS; the transformers import is static in `contextService` (Phase 6 budget item).

- Replace mock auth with Supabase Auth (email link plus Google). Guest mode stays fully functional; signing in migrates the guest store rather than replacing it.
- Rewrite the migration per ADR-002 and ADR-004. Add `updated_at`, `deleted_at`, per-field clocks and a `household_id` on every row.
- RLS written as tests first (pgTAP or a script with two real users): a non-member reads nothing; a partner reads only public metadata; nobody writes another member's items; a removed member loses access at once.
- Household bonding: invite by expiring single-use code or QR; leave and remove flows; what happens to shared history when a bond ends.
- Outbox: one IDB record per mutation with an idempotency key, exponential backoff, a dead-letter state the user can see, and coalescing of repeated edits to the same field.
- Pull: cursor-based delta sync, then Realtime for the partner's "outfit locked" event so the RSVP loop feels live.
- Sync status in the UI: synced, pending count, failed with retry.
- Two-device E2E tests: both offline, both edit the same item, both reconnect, both converge. Include delete-versus-edit.
- Account deletion and data export, which the existing privacy page already promises.

**Exit:** convergence tests pass 50 runs in a row ✅; RLS suite green ✅ (real Postgres); the app is indistinguishable from Phase 4 when Supabase env vars are absent ✅ (covered by tests, not yet checked in a browser); **plus** the unchecked items above.

### 🔲 Phase 6 — Production Hardening (≈2 weeks) — NOT STARTED

- **Performance budgets in CI:** LCP < 2.5 s and INP < 200 ms on mid-tier mobile for `/` and `/today`; transformers and model code never in the initial bundle; landing page animation audited for main-thread cost.
- **Accessibility:** WCAG 2.2 AA. axe in Playwright on every route, keyboard paths for the laundry board, `prefers-reduced-motion` honoured throughout (the demo cursor and scrollytelling need a static alternative), colour never the only signal for laundry state.
- **Security:** CSP with nonces including `wasm-unsafe-eval` and worker sources, Permissions-Policy, dependency audit in CI, rate limits on invite codes, a one-page threat model.
- **PWA:** replace the hand-written worker with Serwist or Workbox; precache the app shell per route so `/today` works offline; versioned update prompt; iOS install instructions since `beforeinstallprompt` does not fire there.
- **Observability:** error reporting with payloads scrubbed of item data, Web Vitals, and a handful of privacy-preserving product counters (outfit generated, outfit accepted, ingestion completed). Document exactly what is collected on the privacy page.
- Gate `/admin` behind a role check or remove it from the production build.
- Error boundaries and empty states on every route.

**Exit:** budgets enforced in CI; zero serious axe violations; CSP live without `unsafe-inline` for scripts; Lighthouse PWA installable on Android and iOS.

### 🔲 Phase 7 — Beta, Launch and Close-out (≈2–3 weeks) — NOT STARTED

- Private beta with 5–10 real households covering all three taxonomies. Run two structured feedback rounds; the questions that matter are "did you wear what it suggested?" and "what did it get culturally wrong?"
- Feed corrections back into the Phase 2 evaluation set and re-report the numbers.
- Onboarding: first-run path from empty closet to first accepted outfit in under five minutes, measured.
- Decide the pricing page honestly: either build a real entitlement check or relabel plans as "coming soon". Advertising tiers that do nothing is a liability.
- Runbook: deploy, rollback, schema migration, restoring a user who lost their device.
- Final docs: architecture overview, ADR index, a README a stranger can run in ten minutes.
- Portfolio case study: the engine design, the evaluation numbers, the sync convergence story, and what was cut and why.

**Exit (project complete):**
1. All earlier exit criteria still pass on `master`.
2. Two real households have used it daily for two weeks with outfit acceptance rate recorded.
3. No route on the authenticated app reads fixture data.
4. A fresh clone builds, tests and deploys from the README alone.
5. Known limitations are written down, not discovered.

---

## 4. Sequence and dependencies

```
0 Baseline ─► 1 Data layer ─┬─► 2 Engine ──────┬─► 4 Context ─┐
                            └─► 3 Ingestion ───┘              ├─► 5 Sync ─► 6 Hardening ─► 7 Beta
```

Phases 2 and 3 can overlap. Phase 5 must not start before Phase 1's repository interfaces are stable, because the outbox hooks into them. Total: roughly 19–20 weeks part-time.

If time runs short, cut in this order: opt-in encrypted photo sharing, trip planner engine integration, Realtime (fall back to polling), bulk ingestion. Do not cut the evaluation set, the RLS tests or the convergence tests; those are what separate this from a demo.

---

## 5. What makes this SDE2 / FDE level

| Signal | Where it shows up |
|---|---|
| Design under real constraints | Engine with a latency budget on a phone; ML with a memory ceiling; sync without trusted clocks. |
| Decisions with trade-offs written down | ADR-001 to 007, especially 002, where the privacy promise costs a feature. |
| Correctness beyond the happy path | Property tests on the engine, RLS tests with adversarial users, two-device convergence tests. |
| Measured quality, not asserted quality | Evaluation set with precision@3 per taxonomy; context accuracy; performance budgets in CI. |
| Operational ownership | CI, observability, runbook, rollback, account deletion. |
| Customer-facing judgment (FDE) | Beta with real households, feedback turned into evaluation data, onboarding measured in minutes, scope cut by user value. |

---

## 6. Standing constraints

Carried over from the hand-off doc and still binding:

- No paid AI APIs; no garment photo leaves the device without explicit opt-in (ADR-002).
- Keep the `/demo` element IDs: `demo-couple-btn`, `demo-wedding-btn`, `demo-input-field`, `demo-generate-btn`.
- Keep the atelier design tokens; no heavy UI framework.
- No horizontal overflow from 320 px upward.
- Every feature works with no network and no Supabase credentials.

Added:

- No domain logic in React components or providers.
- No new fixture imports outside `/demo` and tests.
- Every phase's exit criteria are checked in CI where they can be.
