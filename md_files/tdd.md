# ourCloset — Technical Design Document (TDD)

## 1. Zero-Key Local AI Architecture

All AI capabilities in `ourCloset` execute in-browser:
- **Background Removal**: Executed via client-side WASM models (`@xenova/transformers`).
- **Feature Tagging**: Deterministic local color extraction and heuristic taxonomy classification.
- **Context Parsing**: Local NLP keyword matcher parsing dress code, event formality, and color palette intent from freeform user prompts.

## 2. Interactive Demo Choreography Runner (`/demo`)

- **State Machine**: Walks a `DemoStep[]` array executing mouse movements, element highlighting, typing, and button clicks.
- **Virtual Smooth Scrolling**: Translates container via `transform: translateY` to position active elements in view.
- **Privacy Alias Rules**: Uses alias placeholders (`"Demo Couple Package"`, `"Demo Husband Member"`, `"Demo Wife Member"`) to protect real names.
- **Cookie Guard**: Writes `ourcloset_demo_played=true` on completion to remember guest status.

## 3. PWA & Service Worker Caching

- **Service Worker (`public/sw.js`)**: Caches static assets, favicons, fonts, and HTML templates.
- **Install Prompt (`PWAInstallPrompt.tsx`)**: Displays custom install prompt with a **bottom-right corner floating pill badge** on dismissal.