---
name: Tailoring Workshop
colors:
  surface: '#faf9f7'
  surface-dim: '#dadad8'
  surface-bright: '#faf9f7'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f4f3f2'
  surface-container: '#eeeeec'
  surface-container-high: '#e9e8e6'
  surface-container-highest: '#e3e2e0'
  on-surface: '#1a1c1b'
  on-surface-variant: '#414845'
  inverse-surface: '#2f3130'
  inverse-on-surface: '#f1f1ef'
  outline: '#727975'
  outline-variant: '#c1c8c4'
  surface-tint: '#48645b'
  primary: '#08251e'
  on-primary: '#ffffff'
  primary-container: '#1f3b33'
  on-primary-container: '#87a59b'
  inverse-primary: '#aecdc2'
  secondary: '#785926'
  on-secondary: '#ffffff'
  secondary-container: '#fed394'
  on-secondary-container: '#795a26'
  tertiary: '#301a22'
  on-tertiary: '#ffffff'
  tertiary-container: '#472f38'
  on-tertiary-container: '#b796a0'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#cae9de'
  primary-fixed-dim: '#aecdc2'
  on-primary-fixed: '#032019'
  on-primary-fixed-variant: '#304c44'
  secondary-fixed: '#ffddae'
  secondary-fixed-dim: '#e9c083'
  on-secondary-fixed: '#281800'
  on-secondary-fixed-variant: '#5d4210'
  tertiary-fixed: '#fed9e4'
  tertiary-fixed-dim: '#e1bdc8'
  on-tertiary-fixed: '#2a151d'
  on-tertiary-fixed-variant: '#594049'
  background: '#faf9f7'
  on-background: '#1a1c1b'
  surface-variant: '#e3e2e0'
typography:
  display-lg:
    fontFamily: Domine
    fontSize: 42px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Domine
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 36px
  headline-md:
    fontFamily: Domine
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  label-spec:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  utility-mono:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 16px
  margin-mobile: 16px
  margin-desktop: 32px
  container-max: 1200px
---

## Brand & Style
The design system is built upon the "Tailoring Workshop" narrative—a professional, utility-focused environment where wardrobe coordination is treated with the precision of a bespoke garment maker. The aesthetic moves away from generic digital trends, favoring a tactile, structured interface that feels like a physical workspace.

The brand targets couples who view their wardrobe as a shared asset, requiring a tool that is both high-end and highly functional. The UI evokes an emotional response of organized luxury: it is meticulous, reliable, and grounded in the physical craft of clothing. Visual motifs include subtle "stitching" dividers, "spec label" data points, and "hanger" iconography. The design style is **Tactile / Corporate-Modern**, utilizing physical metaphors like fabric textures (raw-silk) and metal hardware (brass) to create a premium, workshop-like experience.

## Colors
This design system uses a palette inspired by the materials of a high-end atelier. 

- **Primary Dark (Ink-bottle):** A deep bottle-green used for structural elements like navigation bars, headers, and primary branding. It provides a heavy, authoritative anchor.
- **Base Surface (Raw-silk):** The primary background color. It is a warm, slightly grayed neutral that mimics undyed high-quality fabric, reducing eye strain and providing a sophisticated alternative to pure white.
- **Accent (Brass):** Representing the hardware of the workshop (buckles, buttons, zippers). This is used for primary actions, buttons, and highlighting key interactive states.
- **Secondary Accent (Sindoor):** A vibrant earthy red reserved for high-attention alerts, festive wardrobe suggestions, or "urgent" coordination needs.
- **Tertiary (Dusk-mauve):** A soft, muted tone used specifically for modest-mode accents or subtle categorization.
- **Text (Charcoal-thread):** A deep, off-black for all typography to ensure maximum legibility against the raw-silk background.

## Typography
The typography strategy employs a three-tier system to emphasize the "Workshop" aesthetic:

1.  **Display (Domine):** A sturdy, slightly compressed serif that mimics the "spec bolt" labels found on fabric rolls. It carries the authoritative weight of a professional studio.
2.  **Body (Inter):** A clean, humanist grotesque for the UI "chrome" and long-form text. It provides functional clarity and high readability across all devices.
3.  **Utility (JetBrains Mono):** A monospaced font used for "Spec Labels"—hex codes, formality indices, and metadata tags. It reinforces the sense of a technical specification sheet.

All labels and tags should be uppercase when using the Mono font to enhance the "stamped label" look.

## Layout & Spacing
The layout follows a **Fixed Grid** philosophy on desktop and a **Fluid Grid** on mobile, inspired by the orderly tables of a tailor's workshop.

- **Grid:** A 12-column system is used for desktop (1200px max-width) with 24px gutters. Mobile layouts use a single column with 16px side margins.
- **Rhythm:** An 8px base grid governs vertical spacing, but a 4px "micro-grid" is used for tight technical data (like spec labels).
- **Stitching Dividers:** Instead of standard horizontal rules, use a 1px dashed line (dash: 4px, gap: 2px) to mimic a sewn seam.
- **Safe Areas:** Generous padding is applied to containers to ensure the "Raw-silk" surface provides breathing room for garment imagery.

## Elevation & Depth
Depth in this design system is achieved through **Tonal Layers** and **Low-Contrast Outlines** rather than heavy shadows.

- **Surface Tiers:** The "Raw-silk" base (#EDE6D6) is the bottom layer. Higher-level containers (like cards) use a slightly lighter tint or a 1px solid border in a "Thread" color (#2B2A28 at 10% opacity).
- **Physicality:** Components should feel like they are "pinned" or "clipped" to the surface.
- **Shadows:** Avoid soft ambient shadows. If depth is required, use a sharp, 1px offset "hard shadow" to mimic the edge of a thick fabric swatch.
- **Overlay:** Backdrops for modals use a 40% opacity "Ink-bottle" (#1F3B33) tint to focus attention while maintaining the brand's color profile.

## Shapes
The shape language is "Soft" yet geometric. While corners are rounded to feel approachable, they remain disciplined to match the professional workshop theme.

- **Primary Radius:** 0.25rem (4px) for buttons and inputs.
- **Large Radius:** 0.75rem (12px) for garment cards and main containers.
- **The "Torn Swatch":** Item cards feature a unique aesthetic where the top-right corner is "notched" or "torn" using a CSS clip-path, mimicking a fabric sample taken from a larger roll.

## Components
- **Item Cards:** Feature the "Torn-swatch" corner. Content is organized with the image taking priority, followed by a "Spec Label" footer using the Mono font.
- **Navigation:** The primary navigation resides in a deep "Ink-bottle" container. Icons are thin-stroke (1.5px) and colored in "Brass."
- **Buttons:** Primary buttons are "Brass" with "Charcoal-thread" text. They use a sharp 4px radius. Secondary buttons use an "Ink-bottle" outline with no fill.
- **Twin Swatches:** When displaying "twinning" results for couples, use two overlapping circular chips with a thin 2px "stitching" border between them.
- **Input Fields:** Styled as "Spec Forms" with labels positioned above the field in monospace. The bottom border is a solid 2px "Ink-bottle" line, with no side borders, mimicking a ledger.
- **Checkboxes/Radios:** These should resemble "Press-studs" or metal snaps—circular, metallic "Brass" accents when active.
- **Hanger Tabs:** Segmented controls or tab bars should use a "Hanger" motif—a thin horizontal line with a small hook-shaped indicator for the active state.