---
name: Event Lab High-End Kiosk
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#47464f'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#787680'
  outline-variant: '#c8c5d0'
  surface-tint: '#5b598c'
  primary: '#070235'
  on-primary: '#ffffff'
  primary-container: '#1e1b4b'
  on-primary-container: '#8683ba'
  inverse-primary: '#c4c1fb'
  secondary: '#4648d4'
  on-secondary: '#ffffff'
  secondary-container: '#6063ee'
  on-secondary-container: '#fffbff'
  tertiary: '#000b1b'
  on-tertiary: '#ffffff'
  tertiary-container: '#142234'
  on-tertiary-container: '#7b8aa0'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e3dfff'
  primary-fixed-dim: '#c4c1fb'
  on-primary-fixed: '#181445'
  on-primary-fixed-variant: '#444173'
  secondary-fixed: '#e1e0ff'
  secondary-fixed-dim: '#c0c1ff'
  on-secondary-fixed: '#07006c'
  on-secondary-fixed-variant: '#2f2ebe'
  tertiary-fixed: '#d5e3fc'
  tertiary-fixed-dim: '#b9c7df'
  on-tertiary-fixed: '#0d1c2e'
  on-tertiary-fixed-variant: '#3a485b'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
  border-subtle: '#e2e8f0'
  surface-white: '#ffffff'
  status-success: '#065f46'
  status-warning: '#92400e'
  ink-dark: '#1e1b4b'
  ink-muted: '#475569'
typography:
  display-kiosk:
    fontFamily: Plus Jakarta Sans
    fontSize: 72px
    fontWeight: '700'
    lineHeight: 80px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  body-lead:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '400'
    lineHeight: 36px
  body-base:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  label-caps:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.05em
  button-text:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 24px
  countdown:
    fontFamily: Plus Jakarta Sans
    fontSize: 120px
    fontWeight: '800'
    lineHeight: 120px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  safe-area: 48px
  gutter: 24px
  stack-lg: 64px
  stack-md: 32px
  stack-sm: 16px
  touch-min: 48px
---

## Brand & Style

The brand personality is **technical, professional, and laboratory-precise**, designed to feel like a high-end experimental studio rather than a standard photo booth. It targets upscale events, corporate activations, and luxury venues where tech-forward aesthetics are expected.

The design style is **Corporate Modern with a Minimalist/Technical edge**. It utilizes heavy whitespace, precision-engineered geometric alignment, and a strict adherence to a "Lab" metaphor—clean surfaces, high-contrast text, and vibrant accent "fluids" that guide the user through the capture process. The interface must feel instantaneous and premium, avoiding unnecessary decoration in favor of functional clarity.

- **Emotional Response**: Sophisticated, efficient, reliable, and cutting-edge.
- **Visual Metaphor**: The "Experimental Lab"—where every photo is a precision result.
- **Atmosphere**: Quiet confidence, tactile responsiveness, and high-clarity navigation.

## Colors

The palette is anchored by **Deep Indigo (#1e1b4b)**, which provides an authoritative "Ink" base for all primary communication. The **Accent Indigo (#6366f1)** acts as the "active fluid" of the lab, used exclusively for interactive elements, progress indicators, and successful state completions.

- **Primary (Indigo)**: Reserved for high-level headings, primary buttons, and structural grounding.
- **Secondary (Accent)**: Used for CTAs, active selection states, and the camera countdown.
- **Tertiary (Slate)**: Applied to secondary body text, labels, and non-essential metadata.
- **Neutral**: The background remains a sterile, laboratory-clean white or ultra-light gray to ensure the photos themselves are the most vibrant elements on screen.

For high-contrast QR code blocks, use `surface-white` for the quiet zone and `ink-dark` for the data modules to ensure 100% scan reliability under varying event lighting.

## Typography

The typography system is built for **legibility at arm's length**. We use **Plus Jakarta Sans** for headlines to inject a modern, slightly soft geometric feel that prevents the "Lab" aesthetic from feeling too cold. **Inter** is used for all functional body and label text due to its exceptional clarity on digital screens.

- **Scale**: Sizes are intentionally oversized for the 1080x1920 kiosk display. 
- **Hierarchy**: Use `display-kiosk` for the "Start" screen and main attract loops. Use `headline-lg` for step titles (e.g., "Choose Your Filter").
- **Special Case**: The `countdown` style is used for the 3-2-1 sequence over the live camera feed. It should be high-contrast (white with a subtle dark outer glow or shadow) to remain visible against any background.

## Layout & Spacing

The layout is a **fixed portrait 9:16 grid (1080x1920)** designed for kiosk hardware. 

- **Safe Zones**: A mandatory **48px safe area** must be maintained on all sides to prevent UI clipping by physical bezels.
- **Vertical Rhythm**: Content is stacked vertically. The "Live Preview" or "Photo Result" typically occupies the upper 60% of the screen (in a 2:3 aspect ratio), with controls and navigation fixed to the bottom 40% for ergonomic touch access.
- **No Scrolling**: All interactions must be contained within a single view. If more options are required, use horizontal swiping carousels for filters or pagination dots.
- **Touch Targets**: No interactive element should be smaller than **48x48px**. Primary action buttons should span the full width of the safe area (984px) to ensure ease of use for all guests.

## Elevation & Depth

This system uses **Tonal Layering and Low-Contrast Outlines** rather than heavy shadows to maintain its high-end tech aesthetic.

- **Surface Levels**:
    - **Level 0 (Background)**: `neutral_color_hex` (#f8fafc).
    - **Level 1 (Cards/Containers)**: `surface-white` (#ffffff) with a 1px `border-subtle` (#e2e8f0) outline.
- **Depth**: When an element is selected (like a photo filter), use a 3px solid border of the `secondary_color_hex` (#6366f1) instead of a shadow.
- **Overlays**: For camera countdowns and "Processing" modals, use a semi-transparent `ink-dark` overlay (80% opacity) to dim the background and focus the user on the immediate action.

## Shapes

The shape language balances **geometric precision with approachable softness**. 

- **Base Radius**: 0.5rem (8px) is the standard for cards, input fields, and small containers.
- **Large Radius**: 1rem (16px) is used for primary buttons and large "Step" containers.
- **Kiosk Containers**: The main 2:3 photo frame should have a subtle 8px radius to match the UI, even if the final print output is sharp-edged.
- **Iconography**: Use "Linear" icons with a 2px stroke weight, matching the precision of the typography.

## Components

- **Primary Buttons**: Minimum height of 64px. Background `primary_color_hex`, text `white`. Rounded-lg (16px). Use full-width for "Start" and "Print" actions.
- **Secondary Buttons**: Ghost style with a 2px `border-subtle` and `primary_color_hex` text.
- **Step Navigation**: A horizontal progress bar at the very top of the screen using thin lines. Completed steps are `primary`, active step is `secondary`, and future steps are `border-subtle`.
- **Photo Cards**: Used in the gallery/selection view. 2:3 aspect ratio. Active selection is indicated by a 4px `secondary` border and a checkmark icon in the top-right corner.
- **QR Blocks**: Encased in a white card with 24px padding. Headline text above the QR code should clearly state the action (e.g., "Scan to Download").
- **Inputs**: For email/phone entry, use large 72px height fields with `body-lead` text size to accommodate large fingers and ensure visibility.
- **Status Tags**: Small pills for "New" filters or "Free" options using a `neutral` background and `label-caps` typography.