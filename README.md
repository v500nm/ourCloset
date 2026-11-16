# ourCloset &nbsp;·&nbsp; AI Wardrobe Coordination Engine

[![Next.js](https://img.shields.io/badge/Next.js-15.5-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.0-61dafb?style=flat-square&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Dexie.js](https://img.shields.io/badge/Storage-Dexie%20IndexedDB-brightgreen?style=flat-square)](https://dexie.org/)
[![Vitest](https://img.shields.io/badge/Tests-236%20Passed-success?style=flat-square&logo=vitest)](https://vitest.dev/)
[![Privacy](https://img.shields.io/badge/Privacy-100%25%20Zero--Key-blueviolet?style=flat-square)]()
[![Bundle](https://img.shields.io/badge/Bundle-272%20kB%20First%20Load-informational?style=flat-square)]()

> **Zero-Key, 100% Client-Side AI Wardrobe Coordination Engine**  
> Couple and family outfit planning across Western Contemporary, South Asian (Indian/Pakistani), and Islamic-Modest dress codes. Runs entirely inside the browser with zero cloud photo egress and zero paid API keys.

---

## Highlights & Core Tenets

- **100% Client-Side Privacy (Zero-Key)**: Garment photos never leave your device ([ADR-002](md_files/adr/ADR-002-garment-photos-privacy.md)). Image downscaling, background segmentation, and OKLCH palette extraction execute locally in an isolated Web Worker ([ADR-006](md_files/adr/ADR-006-web-worker-and-inference-tiers.md)). Zero paid cloud API dependencies (no OpenAI, no Anthropic).
- **Deep Cultural Fluency**: Natively models non-Western attire through declarative cultural slot templates (e.g., Kurta Pajama, Nehru Jacket, Saree, Abaya, Hijab) rather than Western approximations. Verified with **100% precision@3** across all taxonomies.
- **Microsecond Color Harmony in OKLCH**: Computes color harmonies (monochrome, analogous, complementary, split-complementary, neutral-anchored) geometrically in the perceptually uniform OKLCH color space ([ADR-004](md_files/adr/ADR-004-embedding-dimensions-and-oklch-color.md)).
- **Distributed Offline-First Sync**: Hybrid Logical Clock (HLC) conflict resolution with per-field Last-Write-Wins (LWW) and soft-delete tombstones ([ADR-003](md_files/adr/ADR-003-hybrid-logical-clock-conflict-resolution.md)). Verified across a 50-run adversarial convergence simulation.
- **Atelier Craftsmanship**: Raw silk and charcoal aesthetic, strict performance budgets ($< 300\text{kB}$ first-load JS, p95 $< 50\text{ms}$ outfit assembly), WCAG 2.2 AA accessibility, and full PWA offline support.

---

## Architecture Overview

```
[ User Camera / File ] ──► [ Ingestion Web Worker ] ──► [ Dexie IndexedDB (Local) ]
                                   │                              │
                        (Decode, Segment, OKLCH)                  ▼
                                   │                    [ OKLCH Outfit Engine ]
                                   ▼                    (Templates + Beam Search)
                          [ Local Photo Blobs ]                   │
                           (Zero Cloud Egress!)                   ▼
                                                        [ Recommended Outfits ]
                                                                  │
                                                                  ▼
[ Supabase Cloud (Optional) ] ◄── [ HLC Delta Outbox ] ◄──────────┘
  (Metadata Only: Swatches + RLS)
```

For a comprehensive breakdown of components, sequences, and security controls, see:
👉 **[Complete Architecture Overview](docs/architecture.md)**

---

## 5-Minute Quick Start (Zero Credentials Required)

`ourCloset` runs hermetically out of the box. You do **not** need a Supabase account or external API keys to run, develop, or build.

### 1. Clone the repository
```bash
git clone https://github.com/v500nm/ourCloset.git
cd ourCloset
```

### 2. Install dependencies
```bash
npm install
```

### 3. Start local development server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser. The app starts immediately in local-first guest mode with complete offline storage.

### 4. Run tests and typecheck
```bash
# Run unit and integration tests (236 tests / 45 files)
npm run test

# Run TypeScript typecheck
npm run typecheck

# Verify zero unauthorized mock imports in production code
npm run ci:check-mocks
```

### 5. Build for production
```bash
npm run build
npm run start
```

---

## Verified Engineering Benchmarks

Every claim is backed by reproducible automated tests in CI:

| Benchmark Dimension | Measured Result | Target Bar | Verification Suite |
|---|---|---|---|
| **Western Outfit Precision@3** | **100.0%** | $\ge 80.0\%$ | Author-labelled test set (60+ pairs)* |
| **South Asian Precision@3** | **100.0%** | $\ge 80.0\%$ | Ethnic slot matrix tests* |
| **Islamic-Modest Precision@3** | **100.0%** | $\ge 80.0\%$ | Modesty floor eval tests* |
| **Beta-Style Scenarios Precision@3** | **97.8%** | $\ge 80.0\%$ | 15 held-out household scenario pairs* |
| **Context Resolver Accuracy** | **98.0%** | $\ge 85.0\%$ | 150+ multilingual prompts (fast-path) |
| **Outfit Assembly Latency** | **13.2 ms (p95)** | $< 50\text{ms}$ | Vitest CI benchmark (mobile target <50ms)** |
| **First Load JavaScript** | **272–286 kB** | $< 300\text{kB}$ | Next.js production build |
| **Adversarial Sync Convergence** | **50/50 Green** | 50 consecutive runs | `syncConvergence.test.ts` |
| **Postgres RLS Security Tests** | **32/32 Pass** | 100% pass | PGlite PostgreSQL suite |
| **Unauthorized Mock Imports** | **0 imports** | 0 imports | `scripts/check-mock-imports.js` |

*\*Note on Evaluation Provenance (F-04): Precision@3 metrics are derived from author-labelled in-repo test sets (75 baseline pairings + 15 held-out beta-style scenarios) serving as automated regression guards.*  
*\*\*Latency Note (F-13): Measured on desktop CI runner (avg 5-10ms, p95 13-18ms); budget ceiling is 50ms on mobile devices.*

---

## Available Scripts

| Script | Command | Purpose |
|---|---|---|
| `npm run dev` | `next dev` | Start development server on port 3000 |
| `npm run build` | `node -r ./scripts/patch-fs-mkdir.js ... build` | Create optimized production build (22 static routes) |
| `npm run start` | `next start` | Run production server |
| `npm run test` | `vitest run` | Run all 236 unit & integration tests |
| `npm run test:e2e` | `playwright test` | Run browser end-to-end tests |
| `npm run typecheck`| `tsc --noEmit` | Strict TypeScript compiler validation |
| `npm run ci:check-mocks` | `node scripts/check-mock-imports.js` | CI guard preventing mock data leakage into production |

---

## Project Documentation Index

- 📘 **[Architecture Overview](docs/architecture.md)** — Detailed system design, data flow diagrams, component layers, and security model.
- 📕 **[Operational Runbook](docs/runbook.md)** — Production deployment (Vercel & Docker), rollback strategies, Supabase migrations, and disaster recovery.
- 📗 **[Portfolio Case Study](docs/case_study.md)** — Deep-dive case study covering OKLCH geometry, beam search, HLC synchronization, and engineering trade-offs.
- 📙 **[Known Limitations](docs/known_limitations.md)** — Formal technical documentation of known edge cases (LIM-001 through LIM-007).
- 📜 **[Architecture Decision Records (ADRs)](md_files/adr/README.md)**:
  - [ADR-001: Local Store Dexie Migration](md_files/adr/ADR-001-local-storage-dexie.md)
  - [ADR-002: Garment Photos Privacy Boundary](md_files/adr/ADR-002-garment-photos-privacy.md)
  - [ADR-003: Hybrid Logical Clock Conflict Resolution](md_files/adr/ADR-003-hybrid-logical-clock-conflict-resolution.md)
  - [ADR-004: Embedding Dimensions & OKLCH Color Space](md_files/adr/ADR-004-embedding-dimensions-and-oklch-color.md)
  - [ADR-005: Background Removal Model Selection](md_files/adr/ADR-005-background-removal-model.md)
  - [ADR-006: Web Worker Execution & Tiered Inference](md_files/adr/ADR-006-web-worker-and-inference-tiers.md)
  - [ADR-007: Demo Route Isolation & Frozen Fixtures](md_files/adr/ADR-007-demo-isolation-and-frozen-fixtures.md)
- 🛡️ **[Threat Model & Security Matrix](md_files/threat_model.md)** — Threat vectors, CSP policies, and boundary defenses.

---

## Optional: Configuring Cloud Sync

To enable multi-device sync across household partners:

1. Create a project at [Supabase](https://supabase.com).
2. Execute the migrations in `supabase/migrations/` using the instructions in the [Operational Runbook](docs/runbook.md#3-supabase-schema-migration-instructions).
3. Set your environment variables in `.env.local`:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
   NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
   ```
4. Restart the development server. Cloud synchronization will activate automatically when a user creates or joins a household.

---

## Author & License

Designed and engineered by **[Adnan Mangaonkar](https://adnan-mangaonkar.com)**.  
MIT License — see [LICENSE](LICENSE) for details.
