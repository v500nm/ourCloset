# ourCloset — Operational Runbook

This operational runbook provides production-grade instructions for deploying, rolling back, migrating, and recovering `ourCloset`. `ourCloset` is an offline-first, Zero-Key AI wardrobe coordination platform designed with a strict client-side privacy architecture (ADR-001 through ADR-007).

---

## 1. Deployment Procedures

`ourCloset` can be deployed in two primary operational topologies:
1. **Serverless Edge / Static CDN (Vercel)** — Recommended default.
2. **Standalone Node.js / Docker Container** — For self-hosted or enterprise sovereign infrastructure.

### 1.1 Environment Configuration

The application operates completely hermetically without any cloud credentials. Optional cloud sync requires only standard Supabase parameters:

| Variable | Required | Default / Fallback | Description |
|---|---|---|---|
| `NEXT_PUBLIC_APP_URL` | No | `http://localhost:3000` | Canonical production URL (used for PWA manifests and OpenGraph) |
| `NEXT_PUBLIC_SUPABASE_URL` | Optional | `""` (Disabled) | Supabase project REST & Realtime endpoint |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Optional | `""` (Disabled) | Public anonymous client key (enforces RLS) |

> [!NOTE]
> If `NEXT_PUBLIC_SUPABASE_URL` is omitted or empty, `ourCloset` automatically boots in 100% offline-first mode. All queries route exclusively to local IndexedDB (Dexie), mock auth operates in-memory/localStorage, and cloud sync workers remain idle. Zero runtime crash occurs without cloud keys.

---

### 1.2 Target A: Vercel Deployment (Serverless / Edge CDN)

Vercel provides native Next.js 15 optimization, edge asset streaming, and automatic PWA header management.

#### Deployment Steps:
1. **Connect Repository**:
   Link GitHub/GitLab repository to Vercel.
2. **Framework Preset**:
   Select `Next.js`.
3. **Build & Output Settings**:
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm install`
4. **Environment Variables**:
   Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` if cloud sync is activated.
5. **Deploy**:
   Trigger deployment via git push or Vercel CLI:
   ```bash
   vercel --prod
   ```

#### Pre-Flight Verification:
- Verify that `X-Frame-Options: DENY`, `Strict-Transport-Security`, and CSP headers are emitted in the response headers.
- Verify that `/offline.html` and service worker `/sw.js` are reachable at 200 OK with `Cache-Control: no-cache, no-store, must-revalidate`.

---

### 1.3 Target B: Standalone Node.js / Docker Deployment

For self-hosted instances, configure Next.js in standalone mode to bundle only necessary `node_modules`.

#### Configuration:
In `next.config.mjs`, ensure the standalone output is active if packaging into a container:
```javascript
// next.config.mjs
const nextConfig = {
  output: 'standalone',
  // ... security headers and wasm experimental rules
};
```

#### Production Dockerfile Pattern:
```dockerfile
# Multi-stage Dockerfile for ourCloset Standalone
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat

# Stage 1: Dependencies
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: Builder
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN npm run build

# Stage 3: Production Runner
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
```

#### Build and Run:
```bash
docker build -t ourcloset:latest .
docker run -d -p 3000:3000 \
  -e NEXT_PUBLIC_APP_URL="https://closet.example.com" \
  -e NEXT_PUBLIC_SUPABASE_URL="https://xyz.supabase.co" \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOi..." \
  --name ourcloset-app ourcloset:latest
```

---

## 2. Rollback Strategy

Because `ourCloset` uses a local-first architecture where data lives on user devices, rollbacks involve three decoupled planes:
1. **Edge Web Assets / Application Code**
2. **Client Service Worker & PWA Caches**
3. **Database Schema & Server RLS (Supabase)**

```
                                  ROLLBACK TAXONOMY
                                          │
       ┌──────────────────────────────────┼──────────────────────────────────┐
       ▼                                  ▼                                  ▼
[ 1. Web Application ]           [ 2. Client PWA / Cache ]         [ 3. Cloud Database ]
  • Instant Vercel Rollback        • Increment CACHE_NAME            • Non-destructive Schema
  • Re-point Docker image          • Service Worker SKIP_WAITING     • Legacy table retention
  • Deploy previous commit         • Clear corrupt IDB stores        • Backward-compatible RPC
```

### 2.1 Web Application Rollback
- **Vercel**: Navigate to the Vercel Dashboard $\to$ Deployments $\to$ select the last known healthy deployment $\to$ click **Instant Rollback**. Traffic switches within seconds.
- **Docker/Kubernetes**: Re-tag or roll back deployment image:
  ```bash
  kubectl rollout undo deployment/ourcloset-web
  ```

### 2.2 Client-Side Service Worker & Cache Invalidation
If a bad JavaScript bundle or broken Web Worker is cached on client devices:
1. **Increment Cache Name**: Update `CACHE_NAME` in `public/sw.js` (e.g., from `ourcloset-v2` to `ourcloset-v3`).
2. **Force Activation**: The service worker includes an activate lifecycle hook that automatically calls:
   ```javascript
   self.skipWaiting();
   caches.keys().then((keys) =>
     Promise.all(keys.map((k) => k !== CURRENT_CACHE && caches.delete(k)))
   );
   ```
3. **Client Update Banner**: The app includes a version listener (`src/components/PWAInstallPrompt.tsx`) which detects `waiting` service workers and renders an "Update Available — Reload to update" alert.

### 2.3 IndexedDB Schema Rollback Safety
- **Rule**: Never downgrade a Dexie database version number.
- Dexie versions (`src/data/db.ts`) must only monotonically increment:
  - Version 1: Initial schema.
  - Version 2: HLC and granular outbox indices.
- If a client-side migration has a defect, author a forward fix (e.g., Version 3) rather than rolling back to Version 1, which triggers `VersionError: Cannot downgrade IndexedDB`.

---

## 3. Supabase Schema Migration Instructions

The cloud sync layer relies on Supabase PostgreSQL with hardened Row Level Security (RLS) and Hybrid Logical Clock (HLC) merge procedures.

### 3.1 Migration File Sequence
Migrations live in `supabase/migrations/`:
1. `20260725000000_init_schema.sql` — Legacy initial prototype schema.
2. `20261115000000_phase5_sync_schema.sql` — Hardened Phase 5 schema implementing ADR-002, ADR-003, and ADR-004.

### 3.2 Applying Phase 5 Migration

The Phase 5 migration is **non-destructive**. It renames legacy tables (`wardrobe_items` $\to$ `legacy_wardrobe_items`, etc.) rather than dropping them, preventing catastrophic data loss during migration.

#### Option A: Supabase CLI (Recommended)
1. Link your Supabase project:
   ```bash
   npx supabase link --project-ref <your-project-id>
   ```
2. Check database status:
   ```bash
   npx supabase db remote changes
   ```
3. Push migrations to remote database:
   ```bash
   npx supabase db push
   ```

#### Option B: Supabase Dashboard SQL Editor
1. Open the [Supabase Dashboard](https://app.supabase.com).
2. Navigate to **SQL Editor** $\to$ **New query**.
3. Paste the contents of `supabase/migrations/20261115000000_phase5_sync_schema.sql`.
4. Click **Run**.

### 3.3 Post-Migration Verification

Run these verification queries in the Supabase SQL Editor:

```sql
-- 1. Verify all required Phase 5 tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('profiles', 'households', 'household_members', 'wardrobe_items', 'outfit_history');

-- 2. Verify RLS is enabled on all tables
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
-- Expected: rowsecurity = true for all tables.

-- 3. Verify server-side RPC functions exist
SELECT proname 
FROM pg_proc 
WHERE proname IN ('sync_wardrobe_upsert', 'sync_outfit_upsert', 'join_household', 'derive_household_id');

-- 4. Verify sequence initialized
SELECT nextval('sync_seq');
```

---

## 4. Disaster Recovery & Data Restoration

### 4.1 Understanding the Privacy Boundary (ADR-002 Reality Check)

`ourCloset` strictly enforces **Tenet 1: Zero-Key, 100% Client-Side Privacy**.
- **No garment photos ever egress to Supabase** (ADR-002).
- Only anonymized metadata (category, OKLCH palette, formality level, laundry status, wear count) syncs to the cloud.
- Garment photo binaries (`blobs`) live exclusively inside local IndexedDB on the device.

```
+-----------------------------------------------------------------------------+
| DISASTER SCENARIO: A user drops their phone in the river or loses device.   |
+-----------------------------------------------------------------------------+
| Path 1: Cloud Sign-In on New Device                                         |
| -> Reconnects to Supabase account.                                          |
| -> Recovers: Garment categories, color swatches, formality, laundry state,  |
|    household bonds, and wear history.                                       |
| -> Photos: Displayed as atelier silhouette icons + color swatches.          |
|    Original photo files CANNOT be recovered from the cloud.                 |
+-----------------------------------------------------------------------------+
| Path 2: JSON Backup File Restoration (Complete Disaster Recovery)           |
| -> Recovers 100% of the wardrobe INCLUDING original photo blobs.            |
| -> Primary recovery mechanism for complete fidelity.                       |
+-----------------------------------------------------------------------------+
```

---

### 4.2 Creating a Complete User Backup

Users can export their complete local database at any time via the UI:
1. Navigate to `/setup` or click **Settings** $\to$ **Data Management**.
2. Click **Download Data Export (JSON)**.
3. The browser generates `ourcloset-backup-<timestamp>.json` via `src/data/backup/exportImport.ts`:
   - Contains: `wardrobeItems`, `outfitLogs`, `members`, `household`, and `blobs` (Base64 data URLs).
   - This export contains zero cloud dependencies and can be stored in the user's private drive.

---

### 4.3 Restoring from Backup JSON

To restore a device from a backup file:

1. **Open Application**: Launch `ourCloset` on the replacement device or new browser.
2. **Access Data Management**:
   - Navigate to `/setup`.
   - Locate the **Data Management & Recovery** card.
3. **Trigger File Import**:
   - Click **Restore Backup File**.
   - Select the `ourcloset-backup-*.json` file.
4. **Execution Flow**:
   - `importWholeStore(jsonString, { clearExisting: true })` parses and validates the schema (`app === 'ourCloset'`).
   - Runs an atomic IndexedDB transaction across `[wardrobeItems, outfitLogs, members, household, blobs]`.
   - Restores all items, history logs, and full photo blobs into local Dexie storage.
5. **Re-sync**:
   - If cloud sync is active, the SyncBootstrap worker detects existing items and reconciles HLC timestamps without duplicate inserts.

---

### 4.4 Troubleshooting Recovery & Storage Issues

#### Scenario A: `QuotaExceededError`
- **Cause**: Browser IndexedDB storage limit reached (e.g., user has thousands of uncompressed high-res images).
- **Remedy**:
  - Request persistent storage: `navigator.storage.persist()`.
  - Check quota usage:
    ```javascript
    const estimate = await navigator.storage.estimate();
    console.log(`Used: ${(estimate.usage / (1024*1024)).toFixed(2)} MB of ${(estimate.quota / (1024*1024)).toFixed(2)} MB`);
    ```
  - Ingestion pipeline automatically downscales photos to $\le 1024\text{px}$ WebP (typically $\sim 120\text{kB}$ each), allowing 10,000+ items within 1.5 GB.

#### Scenario B: Corrupted Backup File
- If `importWholeStore` throws `Invalid backup schema`:
  - Open JSON file in a text editor.
  - Verify root keys: `{ "app": "ourCloset", "version": 1, "exportedAt": "...", "data": { ... } }`.
  - Ensure UTF-8 encoding.

---

## 5. Operational Health Check Checklist

Before certifying any release as production-ready, verify:

- [ ] **Typecheck**: `npm run typecheck` exits 0.
- [ ] **Mock Import Guard**: `npm run ci:check-mocks` reports 0 unauthorized mock imports.
- [ ] **Unit & Property Tests**: `npm run test` passes (all test suites green).
- [ ] **Security Headers**: CSP, X-Frame-Options DENY, Permissions-Policy verified via `curl -I https://<host>`.
- [ ] **Offline Hermeticity**: App loads, displays closet, generates outfits, and logs wear with network fully disconnected.
- [ ] **Sync Status**: `SyncStatusIndicator` reflects `IDLE`, `SYNCING`, or `OFFLINE` cleanly.

