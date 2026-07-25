# ourCloset — Product Requirements Document (PRD)

## 1. Problem Statement
Couples and shared households with cross-cultural or multi-context wardrobes (Western, Indian Traditional, Islamic/Modest) waste daily decision time and frequently misjudge coordination for events — either clashing unintentionally or over-planning manually via photos. Existing wardrobe apps are single-user and assume one dress code, with no concept of a shared, multi-member closet coordination loop.

## 2. Goals
- **G1**: Let a shared household digitize wardrobes with near-zero manual data entry (client-side background removal, auto-tagging).
- **G2**: Generate outfit suggestions that respect a chosen context (mood/preset/freeform) and cultural dress code across any two household members or custom relationship pairings.
- **G3**: Let Member A lock an outfit and have Member B receive complementary options from their own closet within seconds ("OOTD RSVP").
- **G4**: Track laundry/availability so suggestions never include unavailable items.
- **G5**: Provide an automated, interactive **Choreographed Demo** (`/demo`) for guest users with SVG virtual cursor simulation, non-native virtual scrolling, privacy aliases ("Demo Couple Package"), and a post-demo plan selection modal with local cookie tracking (`ourcloset_demo_played`).
- **G6**: Provide a full **Progressive Web App (PWA)** experience with an interactive install prompt that settles into a compact bottom-right floating badge on dismissal.
- **G7**: Deliver an immersive **Scrollytelling Landing Page** (`/`) using scrubbed Framer Motion parallax tied directly to scroll progress.
- **G8**: Do all of the above with **zero paid external AI API calls** — every AI-driven step runs client-side (WASM/ONNX) or as deterministic local heuristics stored in IndexedDB.

## 3. Non-Goals
- No public social feed or public outfit sharing to unbonded users.
- No e-commerce vendor links or affiliate ads.
- No garment-level fit/size scanning.

## 4. Target Users
- **Primary**: Engaged/married couples, siblings, and shared households dressing for a mix of Western, Indian Traditional, and Islamic/Modest occasions.
- **Secondary**: Guests and prospective users exploring the automated interactive demo (`/demo`) without requiring login.
- **Tertiary**: Individuals using Solo mode as a personal wardrobe organizer.

## 5. User Stories

### Onboarding, Household & Guest Access
- As a guest user, I can access an automated **Interactive Demo** (`/demo`) without logging in, featuring an animated virtual cursor that performs real pairing flows, types prompts, generates results, and shows plan options.
- As a returning guest, if I have already completed the demo, a local cookie (`ourcloset_demo_played=true`) ensures I am not repeatedly forced through the tour.
- As a user, I can install `ourCloset` as a PWA on iOS/Android/Desktop, or minimize the install prompt into a bottom-right settled badge.
- As a household, we can pair any members (husband, wife, partner, sibling, etc.) and generate dual-closet twinning logic.

### Closet Ingestion (Pillar 1)
- As a user, I can photograph or upload a clothing item with automatic background removal.
- As a user, the app auto-suggests category, cultural style, and dominant colors for each item.

### Daily Mode & Context (Pillar 2)
- As a user, I choose Member pairing mode (Solo / Couple / Custom pairing), then pick a structured preset (Office, Casual, House, Event, Trip) or type a freeform description.
- As a user, my freeform text is parsed client-side with zero paid AI calls.
- As a user, suggestions automatically exclude items marked `DIRTY`, `IN_WASH`, or `DRY_CLEANING`.

### Twinning & Coordination (Pillar 3)
- As a couple/household, we can request three tiers of matching — Subtle Harmony, Balanced Co-Op, Direct Twinning — with explicit attribute matching callouts.

### OOTD RSVP Loop (Pillar 4)
- As Member A, when I lock my outfit, Member B receives complementary options from their own closet.
- As Member B, I can accept, decline, or request a re-roll.

### Scrollytelling Landing Page
- As a visitor, scrolling down `/` smoothly scrubs parallax animations (Hero, Bento Box tiles, Asymmetric Timeline, and Pricing card fan-outs).

## 6. Functional Requirements Summary

| Module | Must-have (Final Production) | Fast-follow / Extended |
|---|---|---|
| Demo Mode | Automated SVG virtual cursor, step highlights, virtual smooth scroll, alias privacy labels, post-demo modal, cookie tracking | Custom speed control on demo playback |
| PWA Engine | Web manifest, service worker (`sw.js`), cross-platform icon suite, install prompt with bottom-right settle state | Background sync for offline photo queue |
| Landing Page | Scrollytelling animations (`useScroll`, `useTransform`), responsive parallax on mobile & desktop | 3D Canvas garment inspector |
| Ingestion | Background removal, category/style/color tag, local storage | Bulk photo queue |
| Context & AI | Freeform local parser, preset selector, zero-key WASM inference | Weather API integration |
| Household | Flexible member-to-member pairing, custom roles, privacy tiers | Multi-household switching |

## 7. Non-Functional Requirements
- **Zero-key constraint**: All AI inference runs client-side via WASM/ONNX or local heuristics; zero paid API keys required.
- **Offline-First & PWA**: Works offline with IndexedDB (`idb-keyval`) and Service Worker caching (`sw.js`).
- **Responsive Aesthetics**: Pixel-perfect responsive across mobile (320-480px), tablet (768-1024px), and desktop screen sizes.
- **Privacy & Security**: Private items strictly locked to owner profile.