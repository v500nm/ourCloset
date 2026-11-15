# ADR-005: Client-Side Background Removal Model Selection

- **Status**: Accepted
- **Date**: 2026-11-15
- **Deciders**: Architecture & Engineering Team
- **Consulted**: Claude Phase Plan (§1, §2, §3 Phase 3), Pre-Claude Phase Context (§6, §8)

---

## Context and Problem Statement

When users ingest garments into `ourCloset`, photos are captured using mobile camera lenses or uploaded from photo libraries. These images frequently feature cluttered backgrounds (bedrooms, wardrobes, mirrors, hangers) and high resolutions (12 MP to 48 MP). To render pristine atelier gallery cards and compute accurate color palettes, the garment silhouette must be cleanly segmented with background pixels removed to a transparent alpha channel.

The prototype implementation in `src/features/ingestion/services/ingestionService.ts` stubbed `removeBackground` to return `null` and referenced `@imgly/background-removal`, an uninstalled dependency.

Deploying deep-learning computer vision models in client-side web environments presents critical engineering hurdles:
1. **Mobile Memory Constraints**: Consumer mobile browsers (particularly iOS WebKit and mid-tier Android Chromium) enforce strict heap memory ceilings. Allocating tensors exceeding 400–500 MB triggers uncatchable browser tab crashes (OOM).
2. **Download Payload & Cold Start**: Shipping full-precision segmentation models (>150 MB) degrades mobile data plans, causes extreme cold-start latency, and frustrates first-time users.
3. **Licensing and Commercial Viability**: BRIA's popular `RMBG-1.4` model is distributed under a **non-commercial** research license (BRIA RMBG-1.4 License). Because `ourCloset` includes commercial subscription tiers (`Solo`, `Couple`, `Family`, `Max` on `/pricing`), deploying RMBG-1.4 in production without costly enterprise licensing creates legal non-compliance and liability.
4. **Processing Latency**: Garment ingestion must complete within $\le 8\text{ seconds}$ on a standard mid-range mobile processor (e.g., Snapdragon 778G or equivalent) to maintain a responsive user experience.

---

## Decision

1. **Mandate Client-Side Vision (Zero Cloud Fallback)**:
   - In accordance with Tenet 1, garment segmentation must execute 100% within the browser runtime using ONNX Runtime Web / `@xenova/transformers`. No photo bytes will ever be forwarded to a cloud inference API (e.g., Remove.bg, Replicate).
2. **Benchmark RMBG-1.4 (Quantized) Against Permissively Licensed Models**:
   - Conduct a systematic benchmark in Phase 3 comparing:
     - `briaai/RMBG-1.4` (int8 quantized ONNX, ~40 MB)
     - `Xenova/modnet` (Apache 2.0 license, lightweight video/portrait matting model, ~25 MB)
     - `BiRefNet-tiny` or `MobileNetV4-segmentation` ONNX variants with permissive licenses (Apache 2.0 / MIT).
3. **Select Permissively Licensed Model for Production**:
   - Unless a formal commercial agreement is executed with BRIA, `ourCloset` will deploy an Apache 2.0 or MIT licensed model (e.g., optimized `MODNet` or `BiRefNet-tiny`) for production releases. This eliminates commercial licensing liability while delivering high-quality garment cutouts.
4. **Pre-Inference Canvas Downscaling**:
   - Raw camera captures must never be fed directly to neural networks.
   - An `OffscreenCanvas` in the Web Worker will downscale the captured photo to a maximum dimension of $\le 1024\text{ px}$ (preserving aspect ratio) and correct EXIF orientation before tensor allocation. This caps tensor memory usage to $<15\text{ MB}$.
5. **Transparent Model Asset Management**:
   - Model weights will be downloaded once from a verified static CDN, cached permanently via the browser `CacheStorage` API, and managed by the Service Worker.
   - Before the initial model download, the UI will present an explicit one-time disclosure (e.g., *"Download local AI vision model (~25 MB) for private offline styling"*), respecting user data allowances.
6. **Graceful Fallback**:
   - Under low-memory environments where WASM tensor allocation fails, the pipeline falls back to an algorithmic edge-saliency / GrabCut canvas method with a manual bounding-box crop tool, preventing application failure.

---

## Consequences

### Positive
- **Guaranteed Legal Compliance**: Avoids copyright and commercial licensing violations by prioritizing permissively licensed architectures (Apache 2.0 / MIT).
- **Zero Ongoing Cloud Vision Costs**: Completely eliminates recurring third-party API fees per cutout.
- **Fast Ingestion Execution**: Pre-downscaling to $\le 1024\text{ px}$ combined with int8 quantization enables segmentation execution under 4–6 seconds on mid-range mobile devices.
- **True Offline Capability**: Once weights are cached in `CacheStorage`, background removal operates completely in airplane mode with zero network access.

### Negative / Trade-offs
- **One-Time Network Transfer**: Initial setup requires downloading a ~25–40 MB model binary into browser cache.
- **Edge Precision on Intricate Fabrics**: Lighter models may occasionally exhibit slight edge softening on sheer lace or semi-transparent net dupattas compared to massive 300 MB models; manual eraser and bounding-box refinement tools mitigate this in the UI.

### Neutral
- Model selection and ONNX runtime are completely abstracted behind the Web Worker messaging boundary defined in ADR-006.

