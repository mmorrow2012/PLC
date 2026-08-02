# Development Journal & Execution Logs

## Project Setup
- Chemical Batch Reactor Soft-PLC built for Schneider Electric Modicon M580 / Siemens S7-1500 target.
- Implemented interactive SCADA visualizer, Function Block & Ladder Diagram viewer, and HMI console.

## Logic Implementation — 2026-08-02
<!-- METRICS:logic -->
- Defined `%IX`, `%IW`, `%QX`, `%QW`, and `%MW` I/O allocation tables according to IEC 61131-3 specifications.
- Created state machine (`M_BatchState`: 0=IDLE, 1=DOSING_A, 2=DOSING_B, 3=HEATING_MIXING, 4=PH_BALANCING, 5=DRAINING, 99=FAULT).
- Built real-time physical process simulation model with proportional valve dosing, heat transfer, closed-loop pH titration, and safety float/estop interlocks.
- Implemented interactive 24V power-flow Ladder Diagram (LD) and Function Block Diagram (FBD) monitor with active line glowing.
- Created SVG SCADA interface with animated dynamic liquid columns, agitator rotation, heating jacket glow, and step-by-step guided walkthrough card.
