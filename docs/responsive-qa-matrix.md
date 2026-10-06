# Responsive QA Matrix

This document outlines the responsive testing outcomes for the CardioVision3D frontend interface, tracking layout adjustments from mobile (360px) to desktop (1440px+).

## Breakpoint Strategy
- **Mobile (360px - 767px)**: Stacked layouts, mobile drawer navigation instead of sidebar, bottom-anchored or full-width buttons.
- **Tablet (768px - 1023px)**: Two-column grid configurations, compact sidebar, visible topbar actions.
- **Desktop (1024px - 1440px+)**: Expanded sidebar, full three-column or expanded grid layouts, optimized 3D canvas rendering space.

## View Verification

| Route | Mobile (360px) | Tablet (768px) | Desktop (1024px+) | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Login / Register** | Form takes full width; subtle background hidden. | Brand panel is visible (compact); form takes right 50%. | Brand panel takes 50% width; form is centered in remaining space. | ✅ Pass |
| **Dashboard** | Stat cards stack vertically (1 col). Recent patients list scrolls horizontally if needed. | Stat cards (2 col grid). | Stat cards (4 col grid). Risk distribution chart spans full width. | ✅ Pass |
| **Assessment Wizard** | Stepper collapses to numbers or minimal text. Inputs stack vertically (1 col). | Stepper fully visible. Inputs use 2 col grid. | Inputs use 3 col grid for maximum density. | ✅ Pass |
| **Analysis (Heart 3D)** | Heart canvas restricted to 300px height. Action buttons (Export, Edit) stack. | Heart canvas scales gracefully. Action buttons inline. | Heart canvas takes 100% of available split-pane or primary column. | ✅ Pass |
| **Records List** | Table collapses. Uses block-layout or card-layout for each patient row if necessary (table overflow-x auto). | Full table visible with standard columns. | Full table, extra whitespace utilized for larger typography. | ✅ Pass |
| **Records Detail** | Tabs become scrollable horizontally. | Tab layout standard. Content split nicely. | Side-by-side comparison (inputs vs analysis). | ✅ Pass |

## Known Viewport Issues (Gaps)
- **3D Heart Canvas on Mobile Safari**: Can occasionally trigger vertical scrolling conflicts if the user swipes directly on the canvas without using the designated UI controls. Touch overlay is active but edge cases remain.
- **Data Tables on Very Small Screens (320px)**: The Records table requires horizontal scrolling. While functional, a future enhancement could switch this to a "Card" layout purely via CSS container queries.
- **PDF Export Modal on Mobile**: Can feel cramped; scrolling the preview iframe on mobile is occasionally jittery.

## Accessibility (WCAG 2.2 AA)
All routes have been audited for accessibility via `@axe-core/playwright`. 
- **Landmarks**: `<main>`, `<header>`, and `<aside>` semantic tags have been applied globally.
- **Color Contrast**: Verified; specific fixes applied to fallback avatars.
- **Focus**: `usePageTitle` custom hook ensures the primary `<h1>` is focused dynamically on route transitions for screen-reader awareness.
