## Environment Scaffold — 2025-02-23
<!-- METRICS:scaffold -->
**Decisions:**
- Initialized Vite React TypeScript project for industrial control system dashboard.
- Configured TailwindCSS and Monaco Editor integration.

## Logic Implementation — 2025-02-23
<!-- METRICS:logic -->
**Decisions:**
- Built production-grade Schneider Electric Modicon M580 IEC 61131-3 Structured Text logic (`conveyorLogic.st`).
- Implemented a 50ms cyclic scan soft-PLC engine (`softPlcEngine.ts`) mirroring Modicon M580 MAST task execution.
- Developed Zustand memory store (`usePlcStore.ts`) featuring a real-time tag memory table, counters, and PLC Force Overrides support.
- Created SVG visualizer (`Visualizer.tsx`) with animated conveyor rollers, photoelectric sensor beam, pneumatic diverter arm, and light beacon.
- Integrated Monaco Editor (`CodeViewer.tsx`) for ST code rendering and live tag monitoring alongside industrial HMI controls (`ControlPanel.tsx`).

**Trade-offs / deviations from prompt:**
- Simulated Structured Text edge detection and timer functions directly within the JavaScript soft-PLC cyclic loop for frame-precise simulation while maintaining IEC 61131-3 compliance in the `.st` source file.
