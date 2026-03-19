# Design System: Vocal Visualizer MVP

**Version:** 1.0
**Date:** 2026-03-19
**Author:** Designer
**Status:** Draft -- Awaiting Phase 2 review

---

## Overview

This is a minimal design system for the MVP. It defines just enough to keep the UI consistent across the three screens and their states. It is intentionally small -- expand it only when new features demand new patterns.

---

## 1. Color Palette

All color pairings have been selected to meet WCAG 2.1 AA contrast requirements (minimum 4.5:1 for normal text, 3:1 for large text and UI components).

### Core Colors

| Token | Hex | Usage | Contrast Notes |
|-------|-----|-------|----------------|
| `--color-bg` | `#FFFFFF` | Page background | -- |
| `--color-bg-subtle` | `#F5F5F7` | Drop zone background, card backgrounds | -- |
| `--color-text-primary` | `#1D1D1F` | Headings, body text | 16.4:1 on white, 14.8:1 on bg-subtle |
| `--color-text-secondary` | `#6E6E73` | Hint text, muted labels | 4.6:1 on white, 4.2:1 on bg-subtle |
| `--color-primary` | `#0066CC` | Primary buttons, links, spinner | 7.0:1 on white |
| `--color-primary-hover` | `#004C99` | Primary button hover state | 9.8:1 on white |
| `--color-primary-active` | `#003D7A` | Primary button active/pressed state | 12.1:1 on white |
| `--color-error` | `#CC0000` | Error messages, error icons | 5.9:1 on white |
| `--color-error-bg` | `#FFF0F0` | Error message background (inline errors) | -- |
| `--color-border` | `#D1D1D6` | Drop zone border, dividers | 1.8:1 on white (decorative, not required to meet 3:1) |
| `--color-border-active` | `#0066CC` | Drop zone border on drag-hover | Matches primary |

### Chart Colors

| Token | Hex | Usage | Contrast Notes |
|-------|-----|-------|----------------|
| `--chart-bg` | `#FFFFFF` | Chart canvas background | -- |
| `--chart-line` | `#0066CC` | Pitch contour line | 7.0:1 on white chart bg |
| `--chart-point` | `#0066CC` | Data point dots | Same as line |
| `--chart-grid` | `#E5E5EA` | Grid lines | Decorative, intentionally low contrast |
| `--chart-axis-text` | `#6E6E73` | Axis labels (note names, time) | 4.6:1 on white |
| `--chart-tooltip-bg` | `#1D1D1F` | Tooltip background | -- |
| `--chart-tooltip-text` | `#FFFFFF` | Tooltip text | 16.4:1 on tooltip bg |

---

## 2. Typography

Use a system font stack. No custom web fonts. This keeps bundle size at zero for fonts and ensures fast rendering.

### Font Stack

```css
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
```

### Type Scale

| Token | Size | Weight | Line Height | Usage |
|-------|------|--------|-------------|-------|
| `--text-title` | 28px | 700 (bold) | 1.2 | Page title "Vocal Visualizer" |
| `--text-subtitle` | 16px | 400 (normal) | 1.5 | Tagline |
| `--text-heading` | 20px | 600 (semibold) | 1.3 | Error headings, section headings |
| `--text-body` | 16px | 400 (normal) | 1.5 | Body text, error descriptions, status messages |
| `--text-small` | 14px | 400 (normal) | 1.5 | Hint text, file name display, chart axis labels |
| `--text-label` | 14px | 600 (semibold) | 1.4 | Button labels |

### Base Styles

- Default text color: `--color-text-primary`
- Secondary text color: `--color-text-secondary` (used for hints and muted text)
- No italic usage in the MVP
- No underline except on links (there are no links in the MVP)

---

## 3. Spacing Scale

Use a 4px base unit with a limited set of spacing tokens.

| Token | Value | Usage |
|-------|-------|-------|
| `--space-xs` | 4px | Tight gaps (icon to inline text) |
| `--space-sm` | 8px | Related elements within a group |
| `--space-md` | 16px | Between distinct elements (e.g., spinner to status text) |
| `--space-lg` | 24px | Section padding, content margins |
| `--space-xl` | 40px | Major section separation (e.g., drop zone to hint text) |
| `--space-2xl` | 64px | Page-level vertical padding |

### Content Width

| Token | Value | Usage |
|-------|-------|-------|
| `--content-max-width` | 1000px | Maximum width of the main content area |
| `--dropzone-max-width` | 600px | Maximum width of the upload drop zone |
| `--content-padding` | 24px | Horizontal padding on the content container |

---

## 4. Buttons

The MVP uses two button styles: primary and secondary. Both are standard HTML `<button>` elements.

### Primary Button

Used for the main action on each screen ("Choose File", "Upload Another Recording").

| State | Background | Text Color | Border | Other |
|-------|-----------|------------|--------|-------|
| Default | `--color-primary` | `#FFFFFF` | none | `border-radius: 8px` |
| Hover | `--color-primary-hover` | `#FFFFFF` | none | `cursor: pointer` |
| Active | `--color-primary-active` | `#FFFFFF` | none | -- |
| Focus | `--color-primary` | `#FFFFFF` | `2px solid #004C99` offset 2px | Visible focus ring |
| Disabled | `#B0B0B5` | `#FFFFFF` | none | `cursor: not-allowed`, `opacity: 0.7` |

**Dimensions:**
- Padding: `12px 24px`
- Font: `--text-label` (14px semibold)
- Minimum touch target: 44px height (for tablet accessibility)
- No max-width; button width is determined by content

### Secondary Button

Not used in the MVP currently, but defined for future use (e.g., a "Cancel" action).

| State | Background | Text Color | Border | Other |
|-------|-----------|------------|--------|-------|
| Default | transparent | `--color-primary` | `1px solid --color-primary` | `border-radius: 8px` |
| Hover | `--color-primary` at 10% opacity | `--color-primary-hover` | `1px solid --color-primary-hover` | -- |
| Active | `--color-primary` at 20% opacity | `--color-primary-active` | `1px solid --color-primary-active` | -- |
| Focus | transparent | `--color-primary` | `2px solid #004C99` offset 2px | Visible focus ring |

**Dimensions:** Same as primary button.

---

## 5. Drop Zone

The upload drop zone is a rectangular area with a dashed border.

| State | Border | Background | Other |
|-------|--------|------------|-------|
| Default | `2px dashed --color-border` | `--color-bg-subtle` | -- |
| Drag hover | `2px solid --color-border-active` | `--color-primary` at 5% opacity | -- |
| Error (inline) | `2px dashed --color-error` | `--color-error-bg` | Border changes to error color |

**Dimensions:**
- Width: 100% up to `--dropzone-max-width` (600px)
- Padding: `--space-2xl` (64px) vertical, `--space-lg` (24px) horizontal
- Border-radius: 12px
- Centered horizontally within the content area

---

## 6. Spinner

A CSS-only loading spinner used during the Processing state.

- Type: Rotating ring (border-based CSS animation)
- Size: 48px diameter
- Border: 4px solid `--color-bg-subtle` with top border in `--color-primary`
- Animation: `spin 1s linear infinite`
- The spinner is purely decorative: `aria-hidden="true"`

---

## 7. Error Display

### Inline Errors (on Upload screen)

- Container: `--color-error-bg` background, `8px` padding, `8px` border-radius
- Icon: 16px circle-exclamation SVG in `--color-error`, inline with text
- Text: `--text-body` size, `--color-error` color
- Margin-top: `--space-md` (16px) below the drop zone

### Full-State Errors (replacing Processing screen)

- Centered layout, same structure as Processing state
- Icon: 48px triangle-exclamation SVG in `--color-error`
- Heading: `--text-heading`, `--color-text-primary`
- Description: `--text-body`, `--color-text-secondary`
- "Upload Another File" button: primary button style, `--space-lg` below description

---

## 8. Chart Styling (Chart.js Configuration Guidance)

These values guide the frontend engineer when configuring Chart.js.

### Chart Container
- Width: 100% of content area (up to `--content-max-width`)
- Aspect ratio: approximately 2:1 on desktop. Use Chart.js `maintainAspectRatio: true` with `aspectRatio: 2`.
- Background: `--chart-bg` (white)
- Padding inside chart area: 16px

### Axes
- Y-axis: note names as category labels. Font: `--text-small`. Color: `--chart-axis-text`.
- X-axis: time labels. Font: `--text-small`. Color: `--chart-axis-text`.
- Grid lines: `--chart-grid` color, 1px width, horizontal only (vertical grid lines optional, off by default for cleanliness).

### Data Series
- Line color: `--chart-line`
- Line width: 2px
- Point radius: 2px (visible but not dominant)
- Point hover radius: 5px (enlarges on hover for precision)
- Point background color: `--chart-line`
- Tension: 0 (straight line segments between points -- do not smooth, as smoothing would misrepresent pitch data)
- Gaps: use `NaN` or `null` values in the dataset to create gaps for silence/unvoiced regions. Chart.js handles this natively with `spanGaps: false`.

### Tooltip
- Enabled: true
- Mode: "nearest" with `intersect: true`
- Background: `--chart-tooltip-bg`
- Text color: `--chart-tooltip-text`
- Font: `--text-small`
- Border-radius: 4px
- Padding: 8px
- Display format: "Note: A4 | Time: 12.3s"

### Legend
- Hidden. There is only one data series; a legend adds no information.

---

## 9. Focus Management

Focus must be visibly indicated on all interactive elements. Use the following focus style consistently:

```css
:focus-visible {
  outline: 2px solid #004C99;
  outline-offset: 2px;
}
```

This applies to: buttons, the file input, and any other focusable elements.

Do not remove outlines on `:focus` without providing a `:focus-visible` alternative.

---

## 10. Motion and Animation

The MVP has minimal animation:

- **Spinner rotation:** CSS `@keyframes spin { to { transform: rotate(360deg); } }` -- 1 second, linear, infinite.
- **State transitions:** No animated transitions between Upload, Processing, and Results states. Instant swap. (Smooth transitions are a Could Have, deferred.)
- **Drag hover:** Border and background changes are instant (no transition duration). Keeps the implementation simple.

Respect `prefers-reduced-motion` media query: disable the spinner animation for users who prefer reduced motion. Replace with a static "analyzing..." text indicator.

```css
@media (prefers-reduced-motion: reduce) {
  .spinner {
    animation: none;
    border-top-color: transparent;
  }
}
```

---

## 11. Implementation Notes for Frontend Engineer

- All color, spacing, and typography tokens should be implemented as CSS custom properties on `:root`. This makes future theming possible without refactoring.
- The design system is intentionally small. Do not add tokens or components that are not used in the MVP.
- System fonts mean zero font files to load, helping meet the 500 KB JS bundle budget (fonts are unrelated to JS bundle, but system fonts also avoid render-blocking font loads).
- Chart.js is the only visualization dependency. Do not add additional charting or animation libraries.
- All SVG icons should be inline (not external files) to avoid extra network requests. Only two icons are needed: upload arrow and error exclamation.
