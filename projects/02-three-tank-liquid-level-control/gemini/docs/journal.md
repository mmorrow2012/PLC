# Engineering Journal - Three-Tank Liquid Level Control System

## Scaffold Initialization — 2026-08-02
<!-- METRICS:scaffold -->
**Decisions:**
- Scaffolded Vite + React + TypeScript project for industrial control simulation.
- Integrated Tailwind CSS for UI components and Lucide React icons.
- Setup directory structure for Schneider M580 PLC documentation and Structured Text implementations.

## Logic Implementation — 2026-08-02
<!-- METRICS:logic -->
**Decisions:**
- Built production-ready IEC 61131-3 Structured Text program (`threeTankLogic.st`) for Schneider Modicon M580 PLC targeting EcoStruxure Control Expert.
- Built Zustand reactive store (`usePlcStore.ts`) representing the mapped I/O memory image table with force overrides, process setpoints, and history tracking.
- Created cyclic Soft-PLC execution engine (`softPlcEngine.ts`) running at 50ms intervals with integrated dynamic mass flow physics for fill, cascade transfer, proportional drain, and discharge processes.
- Engineered interactive SVG dynamic visualizer (`Visualizer.tsx`) depicting stacked tank layout, liquid animations, animated pipe flow particles, pump impellers, modulating valves, hardwired float switches, and visual 3-light stacklight tower.
- Integrated Monaco Editor (`CodeViewer.tsx`) with Structured Text execution highlight and live memory table inspection.
- Developed HMI SCADA Control Panel (`ControlPanel.tsx`) with latched E-Stop, start/stop buttons, float switch triggers, level sliders, and setpoint tuning.

**Trade-offs / deviations from prompt:**
- Implemented proportional drain modulation (`Kp_Drain * (LT_TankB - SP_LevelB_Target)`) within `TRANSFERRING_AB` state to hold Tank B near target level without derivative jitter.
- Integrated automatic float switch trip triggering in the physics engine when levels exceed 95% to model real-world float switch secondary safety action alongside analog level transmitter checks.
