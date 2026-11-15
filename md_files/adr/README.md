# Architecture Decision Records (ADRs)

This directory documents the foundational architectural decisions governing `ourCloset`. Each record outlines the context, rationale, decision, and consequences for non-obvious engineering choices, strictly enforcing the project's non-negotiable core tenets: **100% Client-Side Privacy (Zero-Key)**, **Deep Cultural Fluency**, and **Atelier Craftsmanship**.

---

## Index of Architecture Decision Records

| ADR | Title | Status | Date | Summary |
|---|---|---|---|---|
| [ADR-001](./ADR-001-local-storage-dexie.md) | **Move from idb-keyval to Dexie / Typed IndexedDB with Schema Versioning** | Accepted | 2026-11-15 | Migrates from unstructured `idb-keyval` to Dexie.js for typed repositories, compound indexing (`ownerId`, `laundry_status`, `category`), and versioned schema migrations, reserving `idb-keyval` for simple unindexed UI preferences. |
| [ADR-002](./ADR-002-garment-photos-privacy.md) | **Garment Photos Privacy and Cloud Sync Boundary** | Accepted | 2026-11-15 | Enforces Tenet 1: zero personal garment photos leave client devices by default. Only anonymized metadata syncs across household bonds; partners view color swatches and atelier silhouette icons. Opt-in photo sharing reserved for future E2EE. |
| [ADR-003](./ADR-003-hybrid-logical-clock-conflict-resolution.md) | **Conflict Resolution using Hybrid Logical Clocks (HLC)** | Accepted | 2026-11-15 | Resolves concurrent offline household mutations via per-field Last-Write-Wins (LWW) governed by Hybrid Logical Clocks rather than error-prone wall-clock UTC timestamps. Propagates deletions safely via tombstones. |
| [ADR-004](./ADR-004-embedding-dimensions-and-oklch-color.md) | **Embedding Model Dimensions and OKLCH Color Space** | Accepted | 2026-11-15 | Resolves schema vs model dimension mismatches by standardizing on MiniLM 384-d client-side text embeddings (never synced). Drops pgvector columns and calculates color harmony deterministically in the perceptually uniform OKLCH color space. |
| [ADR-005](./ADR-005-background-removal-model.md) | **Client-Side Background Removal Model Selection** | Accepted | 2026-11-15 | Benchmarks quantized RMBG-1.4 against lighter permissively licensed models (e.g. MODNet/BiRefNet-tiny) for mobile browser constraints. Mandates client-side execution, pre-inference canvas downscaling ($\le 1024\text{px}$), and permissive licensing for production. |
| [ADR-006](./ADR-006-web-worker-and-inference-tiers.md) | **Web Worker Execution & Tiered Inference Strategy** | Accepted | 2026-11-15 | Isolates heavy computer vision and ML inference off the main UI thread into a dedicated Web Worker using Transferable Objects. Employs a 3-tier strategy: WebGPU (accelerated) $\to$ WASM SIMD (standard) $\to$ Canvas GrabCut (memory-constrained fallback). |
| [ADR-007](./ADR-007-demo-isolation-and-frozen-fixtures.md) | **Demo Route Isolation and Frozen Fixtures** | Accepted | 2026-11-15 | Completely isolates `/demo` from live production storage and providers. Uses deeply frozen mock fixtures, prevents IndexedDB pollution, and locks down the four essential DOM element IDs (`demo-couple-btn`, `demo-wedding-btn`, `demo-input-field`, `demo-generate-btn`). |

---

## Guidelines for Authoring New ADRs

When proposing significant architectural changes, authors must submit a new ADR formatted as `ADR-XXX-<slug>.md` containing:
1. **Title & Metadata**: Status (`Proposed`, `Accepted`, `Deprecated`, `Superseded`), Date, Deciders, Consulted parties.
2. **Context and Problem Statement**: Clear, objective description of the forces, trade-offs, and technical challenges necessitating a decision.
3. **Decision**: Explicit, actionable statements detailing the chosen approach, patterns, and boundaries.
4. **Consequences**: Thorough evaluation of positive outcomes, negative trade-offs, and neutral impacts.
5. **Implementation & Testing**: Concrete steps for validation, including CI enforcement, unit tests, or benchmarks.

