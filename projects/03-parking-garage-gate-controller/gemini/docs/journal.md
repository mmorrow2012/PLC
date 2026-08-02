# Build Journal - Parking Garage Gate Controller

## Project Scaffolding
- Initialized repository structure.
- Created directory scaffold in `projects/03-parking-garage-gate-controller/gemini/`.

## Logic Implementation — 2026-08-02
<!-- METRICS:logic -->

**Decisions:**
1. Implemented standard IEC 61131-3 Structured Text (`parkingGateLogic.st`) compatible with Schneider Electric Modicon M580 and EcoStruxure Control Expert (Unity Pro).
2. Built a Zustand state store (`usePlcStore.ts`) to serve as the real-time input/output image table, holding tag registers, forced input states, and timer elapsed values.
3. Designed a 50ms cyclic Soft-PLC engine (`softPlcEngine.ts`) that executes physical simulation and state machine transitions synchronously.
4. Created an interactive SVG Visualizer (`Visualizer.tsx`) featuring an animated barrier arm, traffic light stack, inductive loop detection, photoeye safety beam, and warning overlays.
5. Integrated Monaco Editor in `CodeViewer.tsx` to render the ST logic with tabs for real-time memory image viewing.
6. Added full operator HMI Controls (`ControlPanel.tsx`) with pushbuttons, E-Stop trip simulation, auto-drive car feature, and manual overrides.

**Trade-offs / deviations from prompt:**
- Standard IEC Structured Text does not natively include SVG graphics or web UI elements, so a TypeScript Soft-PLC engine was built to execute the exact state transition rules in tandem with standard `.st` code.
- Embedded a physics simulation step inside the 50ms scan loop to derive realistic barrier arm dynamics (30 degrees/sec) and automatic limit switch activation.
