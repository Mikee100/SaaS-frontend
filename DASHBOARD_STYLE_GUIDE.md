# Adeera Dashboard Premium Minimal Style Guide

## Visual Principles
- Keep 90% of the UI neutral, quiet, and low-noise.
- Use one accent color for active/interactive states.
- Use semantic colors only for status (success, warning, critical).
- Prefer border definition over heavy shadows.
- Keep information dense but easy to scan.

## Core Tokens (Implemented)
- `--adeera-bg`: `#FAFAFA` / dark `#0A0A0B`
- `--adeera-surface`: `#FFFFFF` / dark `#151517`
- `--adeera-surface-muted`: `#F5F5F6` / dark `#1B1B1E`
- `--adeera-border`: `#E5E5E7` / dark `#26262A`
- `--adeera-text`: `#101012` / dark `#F5F5F6`
- `--adeera-text-muted`: `#6B6B70` / dark `#9A9AA0`
- `--adeera-accent`: `#4F46E5`
- `--adeera-success`: `#16A34A`
- `--adeera-warning`: `#D97706`
- `--adeera-danger`: `#DC2626`

## Type Scale
- Page title: `22px`, semibold, high contrast neutral text
- Section header: `14px`, uppercase, semibold, tracked
- Body text: `13px`
- Metric values: `30px`, semibold, tight tracking

## Radius and Spacing
- Small radius: `8px`
- Medium radius: `10px`
- Large radius: `12px`
- Core spacing rhythm: `4, 8, 12, 16, 20, 24`

## Component Rules
- Sidebar:
  - Icons are neutral by default.
  - Active row uses accent text, soft accent background, and left accent line.
  - Profile/footer area is compact with icon-only sign out affordance.
- Metric cards:
  - Neutral card background + 1px border.
  - Uppercase muted labels.
  - Large neutral value text.
  - Trend signals only in semantic colors.
- Action center/priorities:
  - Subtle bordered rows, no full-width saturated banners.
  - Dot + text pattern for priority severity.
- Charts:
  - Primary series uses accent.
  - Comparison/axes/grid remain neutral.
  - Semantic colors only for explicit positive/negative status.

## Interaction & Motion
- Hover transitions: `150-200ms`.
- Use subtle tint shifts and border changes; avoid color jumps.
- Loading states should use neutral skeleton shimmer.

## Usage Checklist for New Screens
1. Start from `adeera-card` and token vars in globals.
2. Keep one primary CTA per view.
3. Avoid introducing new hue families unless semantic status demands it.
4. Keep labels muted and compact; reserve contrast for values and focus states.
