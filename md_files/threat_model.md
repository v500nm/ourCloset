# ourCloset — Threat Model & Security Architecture

**Document Version:** 1.0.0  
**Status:** Approved for Production Hardening (Phase 6 Track A)  
**Date:** November 2026  
**Audience:** Security Auditors, Platform Engineers, Core Contributors  

---

## 1. System Overview & Trust Boundaries

`ourCloset` is a local-first, privacy-prioritized digital wardrobe and couple-twinning coordination platform. The core architecture is designed around **Tenet 1: 100% Client-Side Privacy (Zero-Key)**.

```
+---------------------------------------------------------------------------------------+
|                                    CLIENT BROWSER                                     |
|                                                                                       |
|  [User Camera / Gallery]                                                              |
|            |                                                                          |
|            v                                                                          |
|  [Ingestion Worker] ---- (WASM / ONNX) ---> [Local IndexedDB (Dexie)]                 |
|  (In-Memory Canvas Only)                   - Garment Blobs                            |
|  (Background Removal & Color Extraction)   - Metadata, Vectors & HLC                  |
|                                                                                       |
|  [Twinning & Context Engine] <-------------+                                          |
|  (Local MiniLM Embeddings + OKLCH Scorer)                                             |
|            |                                                                          |
|            +--- (Sync Worker: Metadata ONLY) --------------------+                    |
+------------------------------------------------------------------|--------------------+
                                                                   |
                                    TRUST BOUNDARY (Network)       |
                                                                   v
                                                     +--------------------------+
                                                     |  Supabase Cloud (RLS)    |
                                                     |  - Household Metadata    |
                                                     |  - No Raw Garment Photos |
                                                     |  - HLC Sync Timestamps   |
                                                     +--------------------------+
```

### Trust Zones
1. **Untrusted External Environment:** Public networks, third-party CDNs, malicious actors on the local network, and other browser origins.
2. **Client Sandbox (Isolated Origin):** The browser runtime hosting ourCloset. Contains DOM, Web Workers, IndexedDB, and in-memory canvas state. Protected by the browser's Same-Origin Policy (SOP) and Content Security Policy (CSP).
3. **Cloud Synchronization Zone:** Supabase Postgres and Auth layer. Protected by TLS 1.3, JWT authentication, and strict Row-Level Security (RLS) policies. Only anonymized metadata crosses this boundary.

---

## 2. Threat Vector Analysis & Mitigations

### 2.1 Vector 1: Client-Side Photo Processing & Memory Leaks

* **Threat Description:** Wardrobe photographs inevitably capture intimate private spaces: bedrooms, dressing rooms, mirror reflections, and culturally sensitive clothing items (such as modesty wear, hijabs, or abayas). Exposure of raw images through network interception, third-party telemetry, or persistent memory leakage constitutes a critical privacy violation.
* **Impact:** High (Confidentiality & User Privacy).
* **Mitigation Strategy:**
  1. **Strict Zero-Photo Cloud Boundary (ADR-002):** Raw photos, processed silhouettes, and canvas data URLs are never transmitted to Supabase or any cloud storage bucket.
  2. **Isolated Web Worker Execution (ADR-006):** Background segmentation and feature extraction execute entirely within client Web Workers (`src/features/ingestion/services/ingestionWorker.ts`).
  3. **Ephemeral Memory & URL Revocation:** Object URLs created via `URL.createObjectURL()` are immediately revoked once texture creation finishes. Canvas contexts are cleared immediately after extraction.
  4. **CI Network Assertion Gate:** Playwright automated tests verify that zero image payloads or binary blobs are sent across HTTP boundaries during full intake flows.

---

### 2.2 Vector 2: Zero-Key Privacy Guarantees & Client Inference

* **Threat Description:** Many traditional AI styling platforms proxy user data and styling prompts to centralized LLM APIs (OpenAI, Anthropic). This risks:
  1. Leaking user schedule and event notes to third-party model training datasets.
  2. Exposing sensitive API keys in client-side bundles.
  3. Service denial when third-party API quotas are depleted.
* **Impact:** High (Confidentiality, Integrity, & Availability).
* **Mitigation Strategy:**
  1. **Zero External API Keys:** The client bundle contains zero third-party LLM API keys. Context parsing and twinning optimization run hermetically on-device.
  2. **Local WASM/ONNX Embedding Inference:** Contextual intent classification uses in-browser quantized transformers (`Xenova/all-MiniLM-L6-v2`) via WASM.
  3. **Deterministic Heuristic Fast-Path:** Standard dress codes and cultural presets resolve in < 5ms via local rule matrices without network interaction.
  4. **Restricted Model CDN Allowlist:** The CSP restricts `connect-src` and `script-src` to verified model distribution hosts (`huggingface.co`, `cdn.jsdelivr.net`), preventing remote model tampering.

---

### 2.3 Vector 3: Local Storage Isolation & Multi-Profile Data Leakage

* **Threat Description:** Compromise of local browser storage (IndexedDB) via Cross-Site Scripting (XSS), malicious extensions, or residual unencrypted sessions on shared household hardware.
* **Impact:** Moderate to High (Confidentiality & Integrity).
* **Mitigation Strategy:**
  1. **Origin Isolation (SOP):** All garment metadata, outbox records, and images are scoped strictly to the app origin in IndexedDB (via Dexie).
  2. **Content Security Policy (CSP):** Strict CSP denies framing (`frame-ancestors 'none'`), disables script execution from untrusted domains, restricts object injection (`object-src 'none'`), and requires explicit WASM unsafe-eval directives.
  3. **Storage Quota Budgeting:** `src/data/repositories/storageQuota.ts` actively monitors persistent storage usage, warning the user and pruning stale caches before hitting browser eviction thresholds.
  4. **Session Sanitization & Account Disconnect:** Upon logging out or migrating from guest mode (`src/services/accountService.ts`), session storage and transient caches are explicitly purged.

---

### 2.4 Vector 4: Hybrid Logical Clock (HLC) Sync Tampering & Clock Drift

* **Threat Description:** A compromised or misconfigured client could deliberately set its local system clock far into the future (or past) to:
  1. Overwrite valid edits made by a partner ("Last-Write-Wins" hijack).
  2. Cause infinite causality loops or re-roll history corruption.
  3. Replay stale mutations across offline reconnect cycles.
* **Impact:** Moderate (Data Integrity & Consistency).
* **Mitigation Strategy:**
  1. **Monotonic Hybrid Logical Clocks (ADR-003):** Clocks track `(physical_time, logical_counter)`. The physical component is constrained to always advance monotonically.
  2. **Clock Drift Boundary:** Inbound events with a physical timestamp exceeding `Date.now() + MAX_DRIFT_MS` (configured to 60,000ms / 1 minute) are clamped or rejected.
  3. **Cryptographic Identity on Mutation Rows:** Every mutation written to the cloud outbox carries the authenticated `user_id` and `household_id`.
  4. **Server-Side Row-Level Security (RLS):** Supabase RLS policies enforce that users can only read and mutate items within their validated household bond. Partner updates cannot modify another member's primary ownership records.

---

### 2.5 Vector 5: Household Invite Code & QuickCode Brute-Force Defense

* **Threat Description:** Household bonding allows two accounts to share wardrobe metadata. Attackers could attempt brute-force dictionary attacks against short invite codes or QuickCodes (`SOLO24`, `ADMINX`, etc.) to unauthorizedly link with strangers' households.
* **Impact:** High (Unauthorized Access to Wardrobe Metadata).
* **Mitigation Strategy:**
  1. **Entropy & Code Complexity:** Production invite codes use cryptographically secure random alphanumeric strings generated via `crypto.getRandomValues()` with >= 40 bits of entropy (e.g. 8 characters in Base36 or Base58).
  2. **Rate Limiting & Exponential Backoff:** Both client and edge proxy enforce progressive delays: 3 failed attempts result in a 30-second cooldown, escalating exponentially to prevent automated attacks.
  3. **Short Expiration Windows:** Invitation tokens automatically expire after 15 minutes and are single-use; the token is invalidated immediately upon successful bonding.
  4. **Constant-Time Comparison:** Verification checks in backend RPCs utilize constant-time string comparison algorithms to prevent side-channel timing leaks.
  5. **Admin Route Separation:** Administrative dashboards (`/admin`) are separated behind strict role verification (`user.role === 'admin'`), denying non-admin accounts with an unauthorized 403 response.

---

## 3. Security Headers Specification Matrix

| Header | Production Value | Security Rationale |
| :--- | :--- | :--- |
| **Content-Security-Policy** | Directives below | Disallows unapproved scripts; enables WASM, Web Workers, model CDN |
| **Strict-Transport-Security** | `max-age=63072000; includeSubDomains; preload` | Enforces TLS 1.3 across all subdomains for 2 years |
| **X-Frame-Options** | `DENY` | Prevents UI redressing, clickjacking, and frame injection |
| **X-Content-Type-Options** | `nosniff` | Blocks MIME-type sniffing of uploaded media blobs |
| **Referrer-Policy** | `strict-origin-when-cross-origin` | Protects URI privacy on outbound resource requests |
| **Permissions-Policy** | `camera=(self), geolocation=(self), microphone=()` | Restricts hardware access; disables microphone entirely |

### Approved CSP Directives
```http
default-src 'self';
script-src 'self' 'unsafe-eval' 'wasm-unsafe-eval' 'unsafe-inline' https://cdn.jsdelivr.net;
worker-src 'self' blob:;
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
img-src 'self' blob: data: https:;
font-src 'self' https://fonts.gstatic.com data:;
connect-src 'self' blob: data: https://*.supabase.co wss://*.supabase.co https://huggingface.co https://*.huggingface.co https://cdn.jsdelivr.net https://*.jsdelivr.net https://api.open-meteo.com;
media-src 'self' blob: data:;
object-src 'none';
base-uri 'self';
form-action 'self';
frame-ancestors 'none';
```

---

## 4. Privacy-Preserving Observability Principles

All application metrics gathered via `src/services/telemetry.ts` adhere to the **Zero-PII Observability Standard**:
* **Forbidden Fields:** Garment names, descriptions, personal notes, freeform NLP prompts, photo URLs, base64 data, user email addresses, and physical file paths are stripped recursively prior to dispatch.
* **Allowed Product Metrics:** Coarse event types (`outfit_generated`, `outfit_accepted`, `laundry_status_changed`), ordinal counts, formality levels (1–5), and performance latency metrics.
* **Opt-Out Control:** Users can disable all telemetry at any time via `setTelemetryEnabled(false)`.

---

## 5. Security Audit Checklist for Release

- [x] Content-Security-Policy configured with `'wasm-unsafe-eval'` and `worker-src 'self' blob:`.
- [x] Permissions-Policy limits camera to `(self)` and disables microphone.
- [x] Admin route `/admin` gated behind authenticated `role === 'admin'` check with 403 Forbidden fallback.
- [x] Error boundaries deployed at Root (`error.tsx`), Layout (`global-error.tsx`), and Route (`(main)/error.tsx`).
- [x] Zero-PII sanitization engine in `telemetry.ts` covered by automated unit tests.
- [x] All 5 main views (`/closet`, `/laundry`, `/history`, `/trip`, `/today`) implement intentional empty states.
