# ADR-004: Embedding Model Dimensions and OKLCH Color Space

- **Status**: Accepted
- **Date**: 2026-11-15
- **Deciders**: Architecture & Engineering Team
- **Consulted**: Claude Phase Plan (§1, §2, §3 Phase 2), Pre-Claude Phase Context (§7, §8)

---

## Context and Problem Statement

During the Phase 0 architectural audit of the machine learning pipeline and database schema, two critical discrepancies were identified:

1. **Dimensional Mismatch Between Schema and Model**:
   - The initial database schema (`supabase/migrations/20260725000000_init_schema.sql`) declared `color_embedding vector(64)` and `silhouette_embedding vector(128)` with pgvector HNSW indexes, along with an SQL matching function `match_complementary_items`.
   - In contrast, the client-side transformer pipeline (`src/services/transformers/pipeline.ts`) loads `Xenova/all-MiniLM-L6-v2`, which outputs a **384-dimensional** dense embedding vector.
   - The database schema and the client ML model were fundamentally incompatible.
2. **Flawed Color Similarity via Vector Embeddings**:
   - Attempting to compress visual color into an opaque 64-dimensional latent embedding vector and querying it via cosine similarity in Postgres is computationally wasteful, unexplainable, and perceptually flawed.
   - Real sartorial harmony (Western, Indian Traditional, and Islamic-Modest) depends on rigorous color theory rules:
     - Perceptual uniformity: equal Euclidean distances should represent equal human-perceived color differences.
     - Formal color relationships: monochromatic tints, analogous spectrum neighbors, complementary opposites, and split-complementary triplets.
     - Neutral anchoring: core staples (black, white, charcoal, navy, beige) match nearly everything, whereas an uncalibrated vector cosine distance treats black and white as extreme opposites, erroneously penalizing monochrome formalwear (e.g., tuxedo or black abaya with white accents).
   - Computing vector embeddings in the cloud or syncing them to pgvector violates Tenet 1 and requires costly cloud database compute.

---

## Decision

1. **Standardize Text Embeddings on MiniLM 384-D (Client-Only)**:
   - For unstructured text similarity, prompt interpretation, and tag matching, `ourCloset` standardizes exclusively on `Xenova/all-MiniLM-L6-v2` generating **384-dimensional** embeddings.
   - Text embeddings are computed **strictly client-side** in a Web Worker using `@xenova/transformers`.
   - Text embeddings are cached locally in IndexedDB and are **never synced** to Supabase, Postgres, or any external service.
2. **Purge pgvector Columns and Cloud Vector Functions**:
   - Remove `color_embedding vector(64)`, `silhouette_embedding vector(128)`, and associated HNSW indexes from the database schema entirely.
   - Delete the remote `match_complementary_items` SQL stored procedure. All outfit coordination and twinning scoring will be executed locally in the client engine (`src/engine/`).
3. **Adopt Deterministic OKLCH Color Space for Color Harmony**:
   - Convert all extracted garment hex colors to the **OKLCH** color space:
     - $L$: Perceived Lightness ($0.0 \le L \le 1.0$)
     - $C$: Chroma / Saturation ($0.0 \le C \le 0.4$)
     - $H$: Hue angle in degrees ($0^\circ \le H < 360^\circ$)
   - OKLCH is chosen because it is mathematically uniform to human visual perception (unlike sRGB or CIE-XYZ) and models lightness and chroma independently of hue.
4. **Implement Explainable Sartorial Harmony Rules**:
   - Evaluate color compatibility using closed-form mathematical rules on OKLCH coordinates:
     - **Monochrome**: $\Delta H \le 15^\circ$ or low chroma with varied lightness $\Delta L \ge 0.2$.
     - **Analogous**: $15^\circ < \Delta H \le 45^\circ$.
     - **Complementary**: $150^\circ \le \Delta H \le 210^\circ$.
     - **Split-Complementary**: $120^\circ \le \Delta H \le 150^\circ$ or $210^\circ \le \Delta H \le 240^\circ$.
     - **Neutral Anchor Rule**: Neutrals (defined by $C < 0.04$, e.g., charcoal, raw silk, ivory, pure black, navy, camel) anchor any paired garment without penalty.
   - Every outfit score breakdown cites the exact deterministic color harmony rule triggered (e.g., *"Complementary Brass & Midnight Navy"* or *"Warm Analogous Silk & Sand"*), eliminating black-box AI hallucinations.

---

## Consequences

### Positive
- **Architectural Coherence**: Resolves the vector dimension conflict by aligning text models to 384 dimensions and removing ungrounded 64/128-d vectors.
- **Explainable Recommendations**: Users receive clear, culturally resonant explanations based on transparent color theory rather than arbitrary float distances.
- **Blazing Performance**: OKLCH coordinate math and delta-E evaluations execute in under 0.05ms in pure TypeScript without neural network passes.
- **Reduced Database Complexity**: Eliminates Postgres pgvector extensions, HNSW maintenance, and vector column storage from Supabase.
- **Adheres to Tenet 1**: All matching logic runs locally with zero data leakage.

### Negative / Trade-offs
- **Custom Color Engine Maintenance**: The engineering team maintains the OKLCH conversion and harmony calculation module (`src/engine/color/oklch.ts`).

### Neutral
- Standard hex color strings (`#FAF8F5`, `#3D3231`) continue to be used at the UI presentation boundary and in the stored metadata schema.

