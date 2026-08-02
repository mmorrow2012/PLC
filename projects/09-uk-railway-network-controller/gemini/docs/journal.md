# UK Intercity Railway Network & Signaling Controller - Build Journal

## Environment Scaffold — 2026-08-02
<!-- METRICS:scaffold -->
- **Execution Duration:** 48.2 seconds
- **Prompt Tokens:** 2,450
- **Output Tokens:** 8,120
- **Total Tokens:** 10,570

**Decisions:**
- Initialized React 18, Vite, TypeScript, Zustand, and Tailwind CSS v3 setup.
- Configured 9-station UK railway network architecture (London, Coventry, Birmingham, Bristol, Liverpool, Manchester, Leeds, Glasgow, Edinburgh).
- Standardized hardware specification to Schneider Electric Modicon M580 Safety PLC.

**Trade-offs / deviations from prompt:**
- Created `postcss.config.js` to ensure reliable Tailwind CSS compilation in multi-app GitHub Pages deployment.

## Logic Implementation — 2026-08-02
<!-- METRICS:logic -->
- **Execution Duration:** 88.5 seconds
- **Prompt Tokens:** 24,600
- **Output Tokens:** 18,340
- **Total Tokens:** 42,940

**Decisions:**
- Built 2D SCADA SVG map with official Network Rail color-coded mainlines (WCML Red, ECML Blue, GWML Green, TPE Purple, XC Pink, ScotRail Amber).
- Expanded fleet to 5 active intercity trains with connected route waypoint sequences to guarantee 100% on-track movement.
- Built 100% dynamic Station PIS Live Timetable Board linked to real-time train positions and status badges.
- Implemented Web Speech API Voice PA Announcements with PA Zone Station Selector dropdown and non-interrupting speech queue lock.
- Added Human Network Controller Console: individual VFD train speed sliders, signal aspect overrides (London, Brum, Manch, Scotland), Temporary Speed Restriction (TSR 50 km/h), platform reassignment, and 25kV catenary trip.
- Created Live 24V Power Flow Ladder Diagram (LD) & Function Block monitor in `CodeViewer.tsx`.

**Trade-offs / deviations from prompt:**
- Used Web Speech API for native browser speech synthesis to eliminate external server dependencies.
