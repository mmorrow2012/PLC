# UK Intercity Railway Network & Signaling Controller — System Architecture

## Architecture Overview
The UK Intercity Railway Network & Signaling Controller models an industrial Siemens S7-1500F / Modicon M580 SIL4 safety PLC runtime supervising train traffic, signaling block interlocking, VFD traction motor speed modulation, and station Passenger Information System (PIS) timetabling across 9 major UK stations.

## Key Subsystems
1. **2D UK Geographical Map SCADA Mimic (`Visualizer.tsx`)**:
   - Interactive SVG map connecting **London, Coventry, Birmingham, Bristol, Liverpool, Manchester, Leeds, Glasgow, and Edinburgh**.
   - Live position tracking of intercity trains with speed gauges and signal aspect LEDs.
2. **Passenger Information System (PIS) Timetable Display**:
   - Real-time station departure & arrival matrix board showing train name, origin, destination, platform, scheduled vs actual arrival time, and status (`ON TIME`, `BOARDING`, `DEPARTED`, `DELAYED`).
3. **Master HMI & Speed Control Console (`ControlPanel.tsx`)**:
   - VFD speed setpoint sliders (0-200 km/h) with one-click `Speed Up (+20)` and `Slow Down (-20)` buttons.
   - Motorized track point switch toggle (`MAIN` vs `BRANCH` line).
   - Master Railway E-Stop and Fault Reset controls.
4. **PLC Process Engine Monitor (`CodeViewer.tsx`)**:
   - Live 24V power flow Ladder Diagram (LD) monitor with active Function Blocks (`FB_SpeedSupervision`, `FB_TrackBlockInterlock`, `FB_TimetableManager`, `FB_SafetyInterlock`).
