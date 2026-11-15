# ADR-006: Web Worker Execution & Tiered Inference Strategy

- **Status**: Accepted
- **Date**: 2026-11-15
- **Deciders**: Architecture & Engineering Team
- **Consulted**: Claude Phase Plan (§1, §2, §3 Phase 3, §3 Phase 6), Pre-Claude Phase Context (§8)

---

## Context and Problem Statement

Executing computer vision and natural language processing in the browser—such as ONNX-based garment background removal, image resizing, k-means color quantization, and MiniLM text embedding—demands significant computational resources.

In web browsers, JavaScript runs on a single main thread shared with:
- DOM rendering and style calculations
- UI event handling and gesture recognition
- Framer Motion and CSS animations
- User interaction responsiveness (measured by Web Vitals **INP** — Interaction to Next Paint)

If deep-learning inference or heavy canvas pixel manipulation runs on the main thread, the event loop blocks for several seconds. The page freezes, touch inputs are ignored, animations stutter, and mobile browsers present "Page Unresponsive" warnings.

Furthermore, user hardware spans an enormous spectrum:
- High-performance desktop and mobile flagships with dedicated GPUs and WebGPU support.
- Standard smartphones with capable multi-core CPUs supporting WebAssembly SIMD.
- Budget mobile devices with constrained RAM ($\le 3\text{ GB}$), where large WebAssembly memory allocations risk catastrophic out-of-memory (OOM) browser termination.

---

## Decision

1. **Mandatory Off-Main-Thread Execution (Dedicated Web Worker)**:
   - All AI/ML inference, ONNX runtime sessions, canvas transformations, palette extractions, and embedding calculations must execute strictly inside a dedicated Web Worker (`src/workers/inferenceWorker.ts`).
   - Zero tensor allocations, neural network passes, or heavy image decodes are permitted on the main UI thread.
2. **Transferable Objects for Zero-Copy Data Transfer**:
   - High-resolution image payloads and buffer representations must be transferred between the main thread and the Web Worker using **Transferable Objects** (`ImageBitmap`, `ArrayBuffer`).
   - This eliminates expensive structured-clone serialization overhead and prevents memory duplication between threads.
3. **Three-Tiered Hardware Inference Strategy**:
   The Web Worker will detect client device capabilities at startup and adaptively select an execution tier:
   - **Tier 1: Accelerated (WebGPU)**
     - *Target*: Modern desktops and mobile devices with WebGPU enabled.
     - *Provider*: ONNX Runtime Web with `webgpu` execution provider.
     - *Performance*: Sub-second segmentation ($\approx 0.5\text{–}1.2\text{ s}$) with minimal battery drain.
   - **Tier 2: Standard (WASM with SIMD)**
     - *Target*: Standard modern browsers lacking WebGPU but supporting WebAssembly SIMD.
     - *Provider*: ONNX Runtime Web with `wasm` execution provider using SIMD and multi-threading where `SharedArrayBuffer` / cross-origin isolation is active.
     - *Performance*: Consistent segmentation execution ($\approx 3\text{–}6\text{ s}$) on mid-range devices.
   - **Tier 3: Constrained / Memory-Limited (Canvas Algorithmic Fallback)**
     - *Target*: Low-memory mobile devices ($<3\text{ GB}$ system RAM), browsers blocking WASM threads, or environments where WASM heap initialization throws `OutOfMemoryError`.
     - *Provider*: Algorithmic edge-saliency / GrabCut canvas thresholding combined with an interactive rectangular bounding-box and manual refinement brush.
     - *Performance*: Lightweight, instant execution without neural network tensor allocations.
4. **Staged Progress and Cancellation Protocol**:
   - The Web Worker will emit granular lifecycle messages to the main thread:
     `{ type: 'STAGE_PROGRESS', stage: 'DECODE' | 'SEGMENT' | 'BOUNDING_BOX' | 'PALETTE' | 'EMBED', percent: number }`
   - This allows the ingestion UI modal to render a smooth, informative progress bar with atelier micro-copy (e.g., *"Analyzing fabric weave"*, *"Extracting OKLCH silk palette"*).
   - The worker must listen for cancellation signals (`AbortController` signal / message) to immediately terminate active runs if the user dismisses the ingestion modal.

---

## Consequences

### Positive
- **Guaranteed UI Responsiveness**: The main thread remains silky-smooth (60–120 fps) with Interaction to Next Paint (**INP**) remaining strictly $<200\text{ ms}$, comfortably meeting Core Web Vitals criteria.
- **Resilient Device Compatibility**: The tiered fallback ensures that high-end machines leverage full GPU acceleration while budget smartphones remain functional rather than crashing.
- **Clean Architectural Separation**: The domain and UI layers communicate with the inference engine through clean, asynchronous message contracts (`requestInference()`, `onProgress()`).

### Negative / Trade-offs
- **Worker Infrastructure**: Requires managing worker lifecycle, error propagation, message typed interfaces, and mock worker stubs in unit test runners (e.g., Vitest).
- **Cross-Origin Isolation Constraints**: If multi-threaded WASM with `SharedArrayBuffer` is utilized, specific COOP/COEP HTTP headers (`Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Embedder-Policy: require-corp`) must be served in production, which must be carefully verified against third-party script integrations.

### Neutral
- Single-threaded WASM operates cleanly without COOP/COEP headers and serves as a reliable default across all standard web contexts.

