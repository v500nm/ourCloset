# ourCloset — Executive Project Summary

## Overview
`ourCloset` is a modern, zero-key AI wardrobe coordination engine for couples and shared households navigating multi-cultural dress codes (Western, Indian Traditional, Islamic-Modest). 

The platform runs 100% client-side with zero paid AI API dependencies, using WebAssembly (WASM), local heuristics, IndexedDB storage, and Framer Motion spring physics.

---

## Key Highlights & Final Delivered Features

1. **Automated Interactive Demo Mode (`/demo`)**:
   - Zero-login automated tour featuring an SVG virtual spring cursor.
   - Choreographed step-by-step waypoint execution with virtual smooth scrolling (`transform: translateY`).
   - Guest privacy aliases ("Demo Couple Package", "Demo Husband Member", "Demo Wife Member").
   - Automated character typing simulation.
   - Post-demo plan selection modal & 30-day local cookie tracking (`ourcloset_demo_played`).

2. **Progressive Web App (PWA)**:
   - Full Web App Manifest (`manifest.json`) & Service Worker (`sw.js`).
   - Complete cross-platform icon suite (`favicon.svg`, `icon.svg`, `icon-maskable.svg`, `apple-touch-icon.svg`).
   - Interactive PWA Install Prompt banner that smoothly settles into a **bottom-right corner floating pill badge** upon dismissal.

3. **Scrollytelling Landing Page (`/`)**:
   - Scrubbed Framer Motion parallax (`useScroll`, `useTransform`) across all sections.
   - Responsive Z-pattern Hero, 3D Bento Box grid, Asymmetric Timeline Showcase with flanking partner thumbnails, and Pricing card fan-out.

4. **Multi-Member Roster & Flexible Pairing**:
   - Supports member-to-member matching across custom relationship roles (husband, wife, partner, sibling, etc.).
   - Privacy tiers (`PUBLIC` vs `PRIVATE`).

5. **100% Mobile & Tablet Responsive**:
   - Tested and verified across smartphones (320px–480px), tablets (768px–1024px), and desktop viewports.
   - Responsive navigation adapts via desktop floating header or mobile drawer & bottom tab bar.

---

## Technical Stack Summary

| Layer | Technology |
|---|---|
| Core Framework | Next.js 15 (App Router), React 19, TypeScript |
| UI & Styling | TailwindCSS v3, Vanilla CSS Design System, Google Fonts (Domine, Inter, JetBrains Mono) |
| Motion & Scrollytelling | Framer Motion / `motion/react`, Lenis Smooth Scroll |
| Local AI & Storage | IndexedDB (`idb-keyval`), Client-side WASM (`@xenova/transformers`) |
| PWA Engine | Web App Manifest, Service Worker (`sw.js`), Custom `PWAInstallPrompt` |
| Database / Auth | Supabase Client / SSR (with local offline fallback) |