# Heart Component Contract (`HeartVisualization.tsx`)

## Props
- `ladRisk`, `lcxRisk`, `rcaRisk` (number): Raw risk probabilities (0 to 1).
- `ladBand`, `lcxBand`, `rcaBand` (string: "low" | "moderate" | "high"): Risk banding to determine color presentation.
- `ladThreshold`, `lcxThreshold`, `rcaThreshold` (number): Threshold markers for the tooltip and panel.
- `selectedVessel` (VesselKey | null, optional): The actively focused vessel from the parent component.
- `onSelectVessel` ((vessel: VesselKey) => void, optional): Callback triggered when a vessel is clicked on the 3D model or in the component's internal focus bar.

## State and Hover
- Internally maintains `hoveredVessel` and a `tooltip` state.
- Exposes internal click-to-focus behavior and an orbit reset button.
- Default `selected` falls back to 'LAD' if `selectedVessel` is not provided. To keep the heart and parent in two-way sync, the parent must maintain state and pass it down via `selectedVessel` and listen to `onSelectVessel`.

## Canvas & Export (gl options)
- Uses `@react-three/fiber` `<Canvas>`.
- `gl` options initially were `{ antialias: true, alpha: true }`.
- **Note on Exporting:** To allow `html2canvas` or similar PDF generation utilities (Phase 08) to capture the canvas without it appearing blank, `preserveDrawingBuffer: true` must be added to the `<Canvas gl={{...}}>` options.

## Modifications Made
- Added `preserveDrawingBuffer: true` to the `<Canvas>` `gl` prop to allow the Phase 08 PDF export to capture the WebGL context.
- (No other modifications were necessary; `selectedVessel` and `onSelectVessel` were already implemented as optional props).
