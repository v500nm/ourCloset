# ADR-002: Garment Photos Privacy and Cloud Sync Boundary

- **Status**: Accepted
- **Date**: 2026-11-15
- **Deciders**: Architecture & Engineering Team
- **Consulted**: Claude Phase Plan (§1, §2, §3 Phase 5), Pre-Claude Phase Context (§3 Tenet 1)

---

## Context and Problem Statement

Tenet 1 of `ourCloset` establishes an unconditional architectural boundary: **"100% Client-Side Privacy (Zero-Key): No personal photos ever leave the device."** 

Garment photographs inevitably capture intimate context: private living quarters, bedrooms, mirror reflections, and culturally sensitive clothing items (such as modesty wear, hijabs, and abayas). Users rightfully refuse to upload personal wardrobe imagery to cloud databases or third-party servers.

However, an audit of the initial database schema (`supabase/migrations/20260725000000_init_schema.sql` and `md_files/backendSchema.md`) revealed an architectural contradiction:
- `wardrobe_items` and `outfit_history` tables included `image_url` and `photo_url` fields designed for cloud storage buckets, accessible to partner profiles via Supabase Row-Level Security (RLS).
- Ingestion stubs anticipated uploading processed garment images to remote storage.

This created an unresolved contradiction between marketing claims ("Zero cloud photo uploads") and technical implementation. A definitive boundary must govern what data crosses the client-to-cloud sync boundary.

---

## Decision

1. **Strict Client-Side Storage of Garment Photos**:
   - Zero raw photographs, processed silhouettes, or binary image blobs will be uploaded to Supabase or any remote cloud server by default.
   - All captured and processed garment images remain strictly confined to the local device's IndexedDB blob store.
2. **Sync Metadata Only Across Household Bonds**:
   - Only non-visual, anonymized wardrobe metadata crosses the network to the cloud sync layer:
     - Item identifier (`id`, `owner_id`, `household_id`)
     - Taxonomy: `category`, `subCategory`, `cultural_style` (Western, Indian Traditional, Islamic-Modest)
     - Formality level (`formality_level`: 1–5)
     - Color information: Hex values and OKLCH color attributes (`dominant_color`, `accent_colors`, `leather_tone`, `metal_color`)
     - Availability state: `laundry_status` (`CLEAN`, `DIRTY`, `IN_WASH`, `DRY_CLEANING`)
     - Privacy tier: `privacy_tier` (`PUBLIC`, `PRIVATE`)
     - Timestamps and logical clocks (`updated_at`, `hlc_timestamp`, `deleted_at`)
3. **Partner View Model (Tactile Swatch & Silhouette Rendering)**:
   - When a household member (e.g., spouse or sibling) views another member's closet for outfit coordination or twinning RSVP:
     - The UI renders a deterministic **color swatch** and an atelier **vector silhouette icon** derived from the garment's category and cultural style (e.g., an atelier line-drawn Sherwani or Trench Coat in the item's dominant palette).
     - The partner UI never requests or expects a photo URL for remote items.
4. **Privacy Tiers**:
   - Items flagged as `PRIVATE` sync zero data across the household bond; they are excluded entirely from partner synchronization and visible only to the owning member.
5. **Future Opt-In End-to-End Encrypted (E2EE) Photo Sharing**:
   - If photo sharing between bonded household members is introduced in a future release, it must be strictly opt-in and end-to-end encrypted using a client-generated household symmetric key (e.g., AES-GCM 256-bit derived via PBKDF2/Argon2 from a shared passphrase or QR code exchange). The cloud backend will serve solely as a blind ciphertext relay and cannot decrypt or inspect image contents.
6. **Network Assertion Testing in CI**:
   - An automated Playwright E2E network-assertion test will run in CI: during garment ingestion, background removal, and outfit generation, zero HTTP requests may be made to any remote host other than the application origin, static model CDN, and Open-Meteo weather API.

---

## Consequences

### Positive
- **Honest Privacy Enforcement**: Guarantees compliance with Tenet 1 via technical barriers rather than policy promises.
- **Minimal Cloud Infrastructure Costs**: Completely eliminates image hosting storage costs (e.g., AWS S3 or Supabase Storage buckets), bandwidth egress bills, and image CDN processing expenses.
- **Zero Regulatory & Breach Liability**: The cloud database holds zero personal photographs or biometrics, rendering cloud data leaks harmless regarding user media privacy.
- **Instant Sync Latency**: Metadata payloads are lightweight (<1 KB per item), allowing lightning-fast sync over constrained mobile networks.

### Negative / Trade-offs
- **No Automatic Cloud Photo Backup**: If a user loses their physical device without an explicit local file export/backup, their local photo binaries are lost (though their metadata can be restored from the cloud).
- **Atelier Silhouette UI Requirement**: The front-end team must craft high-quality vector silhouette icons for all cultural garment categories so the partner view feels tactile and polished without photographs.

### Neutral
- Single-device users experience no difference, as their local closet continues to display full local photos loaded directly from IndexedDB.

