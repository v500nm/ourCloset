# ourCloset — Technical Implementation Document

This document outlines the technical codebase architecture, state management, demo choreography engine, PWA service worker setup, and scrollytelling implementation.

## 1. Project Structure Summary

```
ourCloset/
├── public/
│   ├── manifest.json              # PWA Web App Manifest
│   ├── sw.js                      # Lightweight PWA Service Worker
│   ├── favicon.svg & favicon.ico  # Crisp vector favicons
│   └── icons/                     # PWA maskable & Apple touch icons
├── src/
│   ├── app/
│   │   ├── (auth)/                # Auth routes (login, register)
│   │   ├── (main)/                # Authenticated routes (today, closet, laundry, history, trip)
│   │   ├── demo/                  # Automated Interactive Demo Page
│   │   ├── product/               # Product showcase
│   │   ├── pricing/               # Pricing plans
│   │   ├── testimonials/          # Customer reviews
│   │   ├── contact/               # Contact form
│   │   ├── setup/                 # Household member setup
│   │   └── layout.tsx             # Root layout with PWA meta, SW reg, & PWAInstallPrompt
│   ├── components/
│   │   ├── landing/               # Scrollytelling sections (Hero, Bento, Timeline, Pricing)
│   │   ├── layout/                # Desktop Header & Mobile Drawer / TabBar
│   │   ├── ui/                    # Motion components & PWAInstallPrompt
│   │   └── index.ts               # Component exports
│   ├── features/
│   │   ├── context/               # ModeSelector, Presets, FreeformInput
│   │   └── twinning/              # Twinning Match Engine & Results
│   ├── providers/
│   │   ├── HouseholdProvider.tsx  # Multi-member roster & pairing state
│   │   ├── WardrobeProvider.tsx   # Wardrobe CRUD & IndexedDB persistence
│   │   └── AuthProvider.tsx       # Auth & guest session context
└── package.json
```

---

## 2. Interactive Demo Choreography Engine (`src/app/demo/page.tsx`)

### Architecture
The demo page operates in a state-locked environment using a hardcoded `DEMO_MEMBERS` array wrapper inside `HouseholdProvider`.

```typescript
type DemoStep = {
  targetId: string | 'top';
  align?: 'center' | 'top';
  action: (ctx: DemoActions) => Promise<void> | void;
  waitBefore?: number;
  waitAfter?: number;
};
```

### Key Technical Mechanisms
1. **Virtual Spring Cursor (`FakeCursor`)**:
   - An SVG cursor component driven by Framer Motion springs (`stiffness: 120, damping: 20`).
   - Computes target element center at runtime using `getBoundingClientRect()`.
2. **Virtual Smooth Scrolling**:
   - Disables native window scrolling globally (`overflow: hidden`).
   - Translates container via `transform: translateY(-virtualScrollY)` to bring targeted step elements into view smoothly.
3. **Automated Character Typing**:
   - Overrides input field state through an `overrideText` prop, simulating human typing speed (50ms character delay).
4. **Demo Cookie Guard**:
   - Sets `ourcloset_demo_played=true; path=/; max-age=2592000` (30 days) upon completion to remember guest status.

---

## 3. PWA & Service Worker Implementation

### Manifest Configuration (`public/manifest.json`)
- Configured with `display: "standalone"`, `theme_color: "#3D3231"`, `background_color: "#FAF8F5"`.
- Linked icons: SVG favicon, high-res PNG/SVG, maskable launcher icon, Apple touch icon.

### Service Worker (`public/sw.js`)
- Implements a network-first strategy for navigation requests and stale-while-revalidate for static assets.
- Auto-registered in `src/app/layout.tsx` via inline client script.

### Install Prompt Component (`src/components/ui/PWAInstallPrompt.tsx`)
- Listens to `beforeinstallprompt` browser event.
- When dismissed or rejected by user, transitions state (`isMinimized=true`) into a **bottom-right settled floating badge** (`Install App`) rather than unmounting.

---

## 4. Scrollytelling Landing Page Engine

All landing page components (`LandingHero.tsx`, `LandingBentoGrid.tsx`, `LandingTimelineShowcase.tsx`, `LandingPricing.tsx`) use Framer Motion `useScroll` and `useTransform` hooks:

```typescript
const sectionRef = useRef<HTMLElement>(null);
const { scrollYProgress } = useScroll({
  target: sectionRef,
  offset: ["start 85%", "end start"]
});

// Responsive transforms tuned to avoid horizontal overflow on small viewports
const yOffset = useTransform(scrollYProgress, [0, 0.5], [40, 0]);
const scale = useTransform(scrollYProgress, [0, 0.5], [0.92, 1]);
const leftCardX = useTransform(scrollYProgress, [0.3, 1], [-20, 0]);
```

---

## 5. Local Storage & Zero-Key AI Architecture

- **IndexedDB**: Powered by `idb-keyval` for persistent local storage of wardrobe items, outfit logs, and household settings.
- **Client-Side WASM**: Clothing background removal and feature embedding run 100% in-browser using `@xenova/transformers` / ONNX models with zero paid AI keys.