# Parking Garage Gate Controller - Build Journal

## Environment Scaffold — 2026-08-02
<!-- METRICS:scaffold -->
- **Execution Duration:** 8.1 seconds
- **Prompt Tokens:** 14,100
- **Output Tokens:** 3,650
- **Total Tokens:** 17,750

**Decisions:**
- Scaffolded Parking Garage Gate Controller System with React 18, Vite, TypeScript, Tailwind CSS v3, and Zustand.
- Designed initial HMI controls and SCADA visualizer shell.

**Trade-offs / deviations from prompt:**
- None. Followed standard workspace scaffold requirements.

## Logic Implementation — 2026-08-02
<!-- METRICS:logic -->
- **Execution Duration:** 18.5 seconds
- **Prompt Tokens:** 36,400
- **Output Tokens:** 8,920
- **Total Tokens:** 45,320

**Decisions:**
- Built dual-lane SCADA layout: Top lane for Entry (Left ➔ Right into garage), Bottom lane for Exit (Right ➔ Left out to street).
- Standardized all terminology to UK English (`car`, `vehicle`, `kiosk`, `ticket machine`, `entry lane`, `exit lane`).
- Implemented fully independent Entry Barrier and Exit Barrier arms and traffic signals.
- Inverted 2D visual orientation: 90° = CLOSED (perpendicular across lane blocking traffic), 0° = OPEN (flush along median curb).
- Added `TAKE TICKET 🎟️` button and ticket dispenser kiosk workflow.
- Built 1-click sequence simulators (`🚗 ENTRY CAR` and `🏎️ EXIT CAR`) with automated vehicle animation.
- Built Live Interactive Ladder Diagram (LD) Monitor in `CodeViewer.tsx` displaying real-time 24V power flow energizing contacts and coils.
- Added step-by-step interactive demo instructions panel to `Visualizer.tsx`.

**Trade-offs / deviations from prompt:**
- Evaluated dual-gate mechanics and vehicle positioning in soft-PLC engine loop for smooth 60fps SVG animation and realistic field interlock behavior.
