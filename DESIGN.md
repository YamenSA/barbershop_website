<!-- SEED: re-run /impeccable document once there's code to capture the actual tokens and components. -->
---
name: Barbershop
description: Urban precision — online booking and salon showcase for a modern city barbershop
colors:
  primary: "oklch(0.65 0.19 140)"
  accent: "oklch(0.88 0.12 55)"
  bg: "oklch(0.10 0.000 0)"
  surface: "oklch(0.15 0.008 140)"
  ink: "oklch(0.95 0.004 140)"
  muted: "oklch(0.55 0.006 140)"
---

# Design System: Barbershop

## 1. Overview

**Creative North Star: "The Precision Cut"**

A barbershop where craft leaves no ragged edge — and neither does the website. The visual system is city-dark and architecturally sharp: near-black surfaces, a vivid malachite green that reads like a lit sign in a rain-slicked street, and a warm brass accent for the single warm note in an otherwise cool palette. Nothing is soft here. Buttons are decisive, type is bold, and every transition confirms an action rather than performing for its own sake.

This system explicitly rejects the following: the vintage barber-pole aesthetic (red, cream, worn serif); the sterile clinic look (white, surgical, impersonal); the generative-AI default of 2026 (warm beige body, grid cards, soft shadows, interchangeable templates); and aggressive loudness (neon clash, visual noise marketed as energy). Urban and lively means precise and fast — not overwhelming.

**Key Characteristics:**
- Dark-committed surface: midnight black as the primary canvas, green as the brand voice
- One saturated identity color (malachite) carrying 30–60 % of visual weight
- Display/Sans type pairing: bold condensed headline font against a neutral, legible body sans
- Responsive motion only: state changes, hover feedback, page transitions — no orchestrated entrance choreography
- Mobile-first at every decision point: thumb-reachable CTAs, legible at arm's length in bright sunlight

## 2. Colors: The Midnight Palette

A committed dark palette. The brand's energy lives in the green — not in background warmth.

### Primary
- **Malachite** (`oklch(0.65 0.19 140)`): The salon's identity color. Used on primary CTAs, active states, focus rings, and key UI highlights. Vivid architectural green against dark surfaces. White text on all Malachite fills — the color is saturated mid-luminance; dark text reads as muddy.

### Secondary
- **Blade Brass** (`oklch(0.88 0.12 55)`): The warm counterpoint. Used sparingly on secondary tags, prices, or accent rules. Never competing with Malachite — it provides warmth where the green stays cool. Dark text on Brass fills (L 0.88 is pale enough for dark ink).

### Neutral
- **Midnight Marble** (`oklch(0.10 0.000 0)`): The primary body background. Pure near-black, no hue tint. Carries no warmth — warmth lives in the brand colors, not the surface.
- **Shadowed Slate** (`oklch(0.15 0.008 140)`): Card and panel surfaces. Near-black with a ghost of the brand's green hue — just enough to feel intentional.
- **Polished White** (`oklch(0.95 0.004 140)`): Body text. Near-white with the faintest green tint. Contrast against Midnight Marble is far above 7:1 WCAG AA.
- **Ash Text** (`oklch(0.55 0.006 140)`): Secondary text, captions, metadata. Contrast against Midnight Marble clears 4:1 — readable but clearly subordinate to Polished White.

### Named Rules
**The One Identity Rule.** Malachite appears on ≤ 2 elements per viewport. Its scarcity is the point — when you see green, it means something. Do not use it as a background wash, as decorative texture, or as a progress bar color without a functional meaning.

**The Warmth-Stays-in-the-Brand Rule.** The background is pure near-black (chroma 0). Warmth is carried exclusively by Blade Brass and, when relevant, photography. Never add warmth to the surface by tinting the background beige, cream, or warm-gray. That is the AI cliché this system rejects by name.

## 3. Typography

**Display Font:** [Bold condensed grotesque — candidates: Syne ExtraBold, Barlow Condensed, Cabinet Grotesk ExtraBold — to be finalized at implementation]
**Body Font:** [Neutral humanist or geometric sans — candidates: Inter, DM Sans, Plus Jakarta Sans — to be finalized at implementation]

**Character:** The display face is the salon's voice — architectural, tight, self-assured. The body face is the barber's assistant — clear, efficient, invisible when it works. The two must contrast on a weight-and-width axis: the display is wide-tracked and heavy; the body is regular and compact.

### Hierarchy
- **Display** (ExtraBold or Black weight, `clamp(3rem, 8vw, 6rem)`, line-height 0.9–1.0): Hero headings and section anchors only. Tight letter-spacing (`-0.03em` to `-0.04em`). Never below two-line stacks on mobile — rewrite copy before shrinking the clamp minimum below 2.5rem.
- **Headline** (Bold, `clamp(1.75rem, 4vw, 3rem)`, line-height 1.1): Section headings, service names, barber names. Slightly less tight than Display.
- **Title** (SemiBold, `1.125rem–1.25rem`, line-height 1.3): Sub-section labels, card titles, nav items.
- **Body** (Regular, `1rem`, line-height 1.6, max 65ch): All prose — descriptions, FAQ answers, booking confirmation copy. Line length capped at 65ch; no full-width prose columns. `text-wrap: pretty` to avoid orphans.
- **Label** (Medium, `0.75rem–0.875rem`, line-height 1.4, `letter-spacing: 0.02em`): Form labels, timestamps, price tags, button text. No all-caps body labels — Title Case maximum.

### Named Rules
**The No-Shouting Rule.** Display headings are capped at `clamp` max 6rem. No exceptions. The page should feel confident, not like a wall of shouted text.

**The Two-Family Ceiling.** Exactly two typefaces: the display face and the body sans. A third family is forbidden unless it is a monospace face used exclusively for code or technical strings (e.g., booking reference IDs).

## 4. Elevation

This system is flat by default. Depth is conveyed through tonal layering — Midnight Marble vs. Shadowed Slate — rather than shadows. Surfaces at rest carry no box-shadow.

Shadows appear only as a response to interaction state: a primary button receiving `:hover` or `:focus-visible` gains a focused glow (`0 0 0 3px oklch(0.65 0.19 140 / 0.5)`) to confirm it is the active target. Modal overlays use a scrim (`oklch(0 0 0 / 0.7)`) rather than a shadow on the modal itself.

**The Flat-At-Rest Rule.** No decorative drop shadows on static cards, images, or containers. Shadows are states, not decoration.

## 5. Components

*Seed mode — no components implemented yet. Re-run `/impeccable document` once Next.js components exist to capture the real component patterns. The following are starter guidelines derived from the palette and token direction above.*

### Buttons
- **Shape:** Slightly rounded corners (4px radius). Not pill-shaped — this is not a rounded-everything system.
- **Primary:** Malachite fill (`oklch(0.65 0.19 140)`), Polished White text. Full padding: 14px vertical, 32px horizontal minimum (touch target ≥ 44px height). Bold or SemiBold label in Title hierarchy.
- **Hover / Focus:** Scale `transform: scale(1.02)`, focus ring `0 0 0 3px oklch(0.65 0.19 140 / 0.5)`. Transition: `150ms ease-out` on transform and background.
- **Secondary / Ghost:** Polished White outline (`1px solid oklch(0.95 0.004 140 / 0.3)`), transparent fill, Polished White text. Hover: `oklch(0.95 0.004 140 / 0.08)` background.
- **Disabled:** Ash Text color, Shadowed Slate fill, `cursor: not-allowed`. No opacity tricks — use explicit disabled tokens.

### Cards / Containers
- **Corner Style:** 8px radius (medium) — softened but not rounded-everything.
- **Background:** Shadowed Slate (`oklch(0.15 0.008 140)`).
- **Shadow Strategy:** None at rest (flat). Focus-state glow if interactive.
- **Border:** None by default. A `1px solid oklch(0.95 0.004 140 / 0.08)` hairline is permitted on panels that need visual separation from the body bg without a tonal ramp step.
- **Internal Padding:** 24px (desktop), 16px (mobile).

### Inputs / Fields
- **Style:** Shadowed Slate background, `1px solid oklch(0.95 0.004 140 / 0.15)` stroke, 6px radius.
- **Focus:** Stroke shifts to Malachite (`oklch(0.65 0.19 140)`), no glow on the field itself (glow is reserved for interactive buttons).
- **Error:** Stroke shifts to a warm red `oklch(0.62 0.22 25)`. Error message in same color below the field, Label hierarchy.
- **Placeholder text:** Ash Text (`oklch(0.55 0.006 140)`). Contrast against Shadowed Slate background clears 3:1 — meets WCAG AA for placeholder.
- **Disabled:** 40 % opacity, `cursor: not-allowed`.

### Navigation
- **Style:** Fixed or sticky top bar, Midnight Marble background, Polished White nav labels in Title weight.
- **Active state:** Malachite underline or Malachite text color on the current page link — not a Malachite fill block.
- **Mobile treatment:** Hamburger menu to a full-screen drawer (Midnight Marble bg), primary CTA ("Book now") pinned to bottom of drawer.
- **CTA in nav:** Malachite primary button, always visible on desktop. Collapsed into drawer on mobile; sticky booking button persists at bottom of viewport on mobile.

## 6. Do's and Don'ts

### Do:
- **Do** use Malachite (`oklch(0.65 0.19 140)`) as the primary CTA color across the entire site — it is the single identity signal.
- **Do** use white text on all Malachite fills. Dark text on a saturated mid-luminance color reads muddy.
- **Do** keep the body background pure near-black (`oklch(0.10 0.000 0)`) — no chroma, no warmth.
- **Do** use `prefers-reduced-motion: reduce` alternatives for every transition: a crossfade or instant state change. No content should depend on a transition completing to become visible.
- **Do** cap body line length at 65ch. No full-width prose.
- **Do** maintain WCAG 2.1 AA contrast: ≥ 4.5:1 for body text, ≥ 3:1 for large text, ≥ 4.5:1 for placeholder text.
- **Do** test tap targets at 375px viewport width before shipping any interactive element. Minimum 44 × 44px touch target.
- **Do** use `text-wrap: balance` on Display and Headline sizes; `text-wrap: pretty` on Body to prevent orphans.

### Don't:
- **Don't** use the vintage barber-pole aesthetic — no red-and-white stripes, no worn serif headlines, no retro badge graphics. This salon is not from the 1950s.
- **Don't** use a warm-beige or cream body background. That is the saturated AI cliché of 2026 and this system rejects it by name. Warmth lives in brand colors and photography, not in the surface.
- **Don't** make the design klinisch/steril — overly clean, corporate, anonymous. This is a salon with character, not a dental practice.
- **Don't** use neon colors, clash-heavy palettes, or aggressive loudness. Urban and lively is precise and fast — not exhausting.
- **Don't** use `border-left` or `border-right` wider than 1px as a decorative accent stripe on cards, callouts, or list items. Rewrite with a background tint or a leading icon.
- **Don't** use gradient text (`background-clip: text` + gradient). Use a solid color. Emphasis through weight or size.
- **Don't** animate layout properties (width, height, top, left, margin, padding). Animate only `transform` and `opacity`.
- **Don't** use glassmorphism (backdrop-filter blur on cards) as a default treatment. If blur appears, it must be purposeful and rare.
- **Don't** put the same uppercase tracked eyebrow label above every section. Choose a different cadence or use it once, deliberately, as a named system element.
- **Don't** use numbered section markers (01 / 02 / 03) as default scaffolding across all sections. Numbers are for real sequences only.
- **Don't** use gradient text, hero-metric templates (big number + stat grid), or identical card grids. These are the visible grammar of AI-generated defaults.
