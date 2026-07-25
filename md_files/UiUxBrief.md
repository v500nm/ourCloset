# ourCloset — UI/UX Design System Brief

## 1. Aesthetic Identity & Principles

`ourCloset` blends **haute couture atelier craftsmanship** with high-tech client-side AI engineering. 

- **Primary Color Palette**:
  - `raw-silk` (`#FAF8F5`): Warm, paper-like background.
  - `charcoal-thread` / `primary` (`#3D3231`): Deep rich chocolate charcoal for typography & dark cards.
  - `brass-accent` / `secondary` (`#B8935A`): Muted gold brass for stitching seams, badges, and highlights.
  - `dusk-mauve` / `sindoor` (`#9C7A87` / `#B33A3A`): Accent highlights for Modest/Traditional dress code callouts.

- **Typography System**:
  - `Domine` (Serif): Display headlines, section titles, and brand logo.
  - `Inter` (Sans): Body copy, inputs, and button text.
  - `JetBrains Mono` (Monospace): Spec labels, formality scores, match percentages, and code logs.

---

## 2. Motion & Interactive Choreography Guidelines

### Scrollytelling Standard (`/`)
- All landing sections must map animations to Framer Motion `useScroll` with `offset: ["start 85%", "end start"]`.
- Lateral translations (`x`) must be kept under `40px` to prevent mobile horizontal scrollbar overflow.

### Virtual Cursor Physics (`/demo`)
- The virtual cursor (`FakeCursor`) uses Framer Motion spring physics (`stiffness: 120, damping: 20`).
- Target element positions are calculated dynamically via `getBoundingClientRect()`.
- Active target elements display a pulsed outline glow (`ring-2 ring-secondary`).

### PWA Install Banner & Settled Badge State
- On dismissal, the install banner animates into a small round pill settled in the bottom-right corner (`fixed bottom-4 right-4`).
- Hovering or tapping the settled badge expands it back into the primary install dialog.