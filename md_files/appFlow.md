# ourCloset — Application Flow & User Journey Architecture

This document maps out the complete navigation, state transitions, interactive demo flow, and PWA lifecycle of `ourCloset`.

```
                  +--------------------------+
                  |  Visitor / Landing Page  |
                  |     (Scrollytelling)     |
                  +------------+-------------+
                               |
       +-----------------------+-----------------------+
       |                                               |
[Explore Demo]                                    [Sign In / Setup]
       |                                               |
       v                                               v
+--------------------------+              +--------------------------+
|   Automated Demo Page    |              |  Auth / Household Setup  |
|    (/demo Flow)          |              |  (Member Roster & Roles) |
+------------+-------------+              +------------+-------------+
             |                                         |
    [Demo Steps 1..N]                                  v
             |                            +--------------------------+
             v                            |     Today Dashboard      |
+--------------------------+              |     (/today RSVP)        |
| Post-Demo Plan Modal     |              +------------+-------------+
| & Local Cookie Tracking  |                           |
+--------------------------+              +------------+-------------+
                                          | Ingestion / Closet View  |
                                          | (/closet /laundry /trip) |
                                          +--------------------------+
```

---

## 1. Landing Page Scrollytelling Journey (`/`)
1. **Hero Entry**:
   - Navigation bar provides quick links: `Product`, `Pricing`, `Testimonials`, `Contact`, and `Explore Interactive Demo`.
   - Scroll progress pushes headline up while scaling Z-pattern Match Widget Card into 3D focus.
2. **Bento Box Section**:
   - Tiles scale up from 92% to 100%. Inner split-pane items slide horizontally, log items cascade in.
3. **Asymmetric Timeline Section**:
   - Dominant primary frame zooms continuously (100% -> 125%).
   - Flanking partner & child thumbnails slide in smoothly from right.
   - Day 1, Day 2, Day 3 schedule cards animate progressively.
4. **Pricing Cards Section**:
   - Solo and Family cards fan out from the center card as user reaches the section.
   - Inner checkmark features fade in and CTA buttons scale up.

---

## 2. Automated Interactive Demo Flow (`/demo`)

The demo is a zero-login, automated choreography engine simulating a real user pairing session:

```
[Start Demo] 
    ↓ 
Step 1: Move Cursor to "Couple Mode" (demo-couple-btn) → Click & Highlight
    ↓ 
Step 2: Scroll Virtual Container to "Context Presets" → Move Cursor to "Wedding/Sangeet" (demo-wedding-btn) → Click
    ↓ 
Step 3: Scroll Virtual Container to "Freeform Input" → Move Cursor to Input Field (demo-input-field) → Type "Sarah & Tariq Sangeet Night"
    ↓ 
Step 4: Move Cursor to "Generate Match" Button (demo-generate-btn) → Click & Trigger Twinning Match Engine
    ↓ 
Step 5: Virtual Scroll to Results Board → Pause 2.5s for User Review
    ↓ 
Step 6: Display Post-Demo Modal ("Select Plan or Sign In")
    ↓ 
Set Local Cookie (`ourcloset_demo_played=true`, 30 days expiry)
```

### Guest Alias Privacy Rule
In Demo Mode, all individual member names are replaced with privacy aliases:
- `"Husband"` → `"Demo Husband Member"`
- `"Wife"` → `"Demo Wife Member"`
- Household Package → `"Demo Couple Package"`

---

## 3. PWA Lifecycle & Installation Flow

```
[User Visits App]
        ↓
Browser emits `beforeinstallprompt`
        ↓
App renders Floating PWA Banner ("Install ourCloset App")
        ↓
+-------------------+-------------------+
|                                       |
[User Clicks "Install"]        [User Clicks "Not Now" / Close]
|                                       |
v                                       v
Triggers Native Install        Prompt minimizes into settled
Browser Dialog                 bottom-right pill badge ("Install App")
|                                       |
v                                       v
App installed as standalone     User can click bottom-right pill
PWA on home screen             anytime to re-expand prompt banner
```

---

## 4. Main App Navigation Loop (`(main)`)

- **`/today`**: Daily OOTD RSVP dashboard, weather context, locked outfit status.
- **`/closet`**: Ingestion gallery, background removal tool, category/style filters.
- **`/laundry`**: 4-state availability tracker (`AVAILABLE`, `DIRTY`, `IN_WASH`, `DRY_CLEANING`).
- **`/history`**: Outfit history log, no-repeat guard memory, cost-per-wear stats (hidden on owned items per user directive).
- **`/trip`**: Capsule wardrobe trip planner across dress codes.
- **`/setup`**: Household member management, privacy tiers (`PUBLIC`, `PRIVATE`), and custom roles.