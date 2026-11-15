# ADR-007: Demo Route Isolation and Frozen Fixtures

- **Status**: Accepted
- **Date**: 2026-11-15
- **Deciders**: Architecture & Engineering Team
- **Consulted**: Claude Phase Plan (§1, §2, §3 Phase 0, §3 Phase 1), Pre-Claude Phase Context (§6, §9)

---

## Context and Problem Statement

The interactive demonstration route (`/demo`) is a flagship acquisition and showcase asset for `ourCloset`. It provides prospective users with a zero-friction, zero-login tour driven by a choreography state machine:
- An animated SVG spring cursor (`FakeCursor`) tracking DOM target waypoints.
- Virtual smooth container scrolling (`transform: translateY`).
- Automated simulated typing with randomized delays.
- Step-by-step waypoint progression demonstrating household context selection, cultural twinning, and outfit RSVP.

To execute this choreography reliably, the automated script depends on four core target element IDs:
1. `demo-couple-btn`: Household mode toggle button
2. `demo-wedding-btn`: Cultural wedding context preset button
3. `demo-input-field`: Freeform natural language prompt text area
4. `demo-generate-btn`: Outfit generation execution button

In the early prototype, mock wardrobe data (`MOCK_WARDROBE`) was globally shared across the application. The production React providers (`WardrobeProvider`, `HouseholdProvider`) were initialized directly with this mock data.

This architecture caused critical failure modes:
1. **Data Pollution**: Running the demo or visiting the app initialized the user's persistent storage with hardcoded mock garments (e.g., specific suits, sarees, and abayas), masquerading as real user data.
2. **State Leakage & Flakiness**: If a user navigated from `/demo` to `/today` or modified their closet in `/closet`, mutations in the global state could alter the items expected by the demo state machine, causing waypoint target misses, timing discrepancies, and visual glitches.
3. **Loss of Clean First-Run UX**: Real onboarding requires starting with a pristine, empty atelier closet offering an explicit *"Load sample wardrobe"* action, rather than silently injecting synthetic items.

---

## Decision

1. **Complete Runtime Isolation of `/demo`**:
   - The `/demo` route and its components must be completely isolated from the live production data repositories and persistent IndexedDB database.
   - The demo route will mount its own isolated, ephemeral demo context provider that operates exclusively in client memory.
   - Zero read or write operations to IndexedDB, live Supabase tables, or persistent user auth records are permitted during demo execution.
2. **Immutable Frozen Fixtures**:
   - The demo data will be extracted into a dedicated, frozen fixture module (`src/lib/fixtures/demoFixtures.ts`).
   - All exported fixture objects, garments, and household profiles must be deeply frozen using `Object.freeze()` (or TypeScript `as const` deep-freeze utilities), preventing runtime mutation during the automated walkthrough.
3. **Invariable DOM Target ID Contract**:
   - The four critical demo waypoint element IDs are declared as an unbreakable architectural contract:
     - `#demo-couple-btn`
     - `#demo-wedding-btn`
     - `#demo-input-field`
     - `#demo-generate-btn`
   - Any component refactoring or styling overhaul on these controls must preserve these exact IDs and ensure they remain accessible in the DOM during demo execution.
4. **CI & Lint Boundary Enforcement**:
   - Establish an automated CI check (ESLint rule or repository grep) in Phase 0 that prohibits importing demo fixtures or `MOCK_WARDROBE` inside production repositories (`src/data/`), domain engines (`src/engine/`), or main application routes (`src/app/(main)/`).
   - Mock data imports are restricted strictly to `src/lib/fixtures/`, `/demo`, and automated test suites.

---

## Consequences

### Positive
- **Deterministic Demo Reliability**: The `/demo` walkthrough executes identically 100% of the time, unaffected by prior user actions, local storage changes, or network state.
- **Pristine Production Storage**: Real user closets start completely clean. Zero mock records will ever pollute a user's persistent IndexedDB or cloud synchronization tables.
- **Protected DOM Anchors**: Documented DOM IDs prevent accidental regressions by front-end engineers during design system updates.
- **Independent Testing**: Playwright E2E tests can validate the demo route's complete waypoint choreography in CI without needing database resets or complex fixture mocks.

### Negative / Trade-offs
- **Code Duplication Boundary**: UI components used in both the demo and production must support either passing an explicit ID prop or cleanly decoupling the interactive controls from live data providers.

### Neutral
- The post-demo completion modal and 30-day tracking cookie (`ourcloset_demo_played=true`) remain unaffected and operate independently of database persistence.

