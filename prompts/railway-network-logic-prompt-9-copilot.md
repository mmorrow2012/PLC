<!-- GENERATED FILE: do not edit directly. Source: prompts/templates/logic/railway-network.md + prompts/manifest.json. Regenerate with: node prompts/generate.mjs -->
```markdown
Now that the project environment is scaffolded in `projects/09-uk-railway-network-controller/copilot/code/`, implement the full domain logic, state management, soft-PLC scan loop, Function Block ladder diagram, timetable engine, and UI components according to the industrial specifications below.

---

### **1. Target Hardware & PLC System Domain**
* **Hardware & Runtime:** Schneider Electric Modicon M580 Safety PLC (SIL4 Railway Interlocking CPU running EcoStruxure Control Expert / Unity Pro).
* **Language:** IEC 61131-3 Function Block Diagram (FBD) and Ladder Logic (LD) with Structured Text (`.ST`).
* **System Focus:** UK Intercity Railway Network & Block Signaling Controller — Connecting 9 Major Stations (**London, Coventry, Birmingham, Bristol, Liverpool, Manchester, Leeds, Glasgow, Edinburgh**). Features 5 active intercity express trains, axle counter block interlocking, VFD traction motor speed setpoint modulation (speed up / slow down), station PA speech synthesis, station zone selector, station departure timetabling, and passenger information board displays (PIS).

---

### **2. Linked Hardware I/O List & Memory Allocation Table**

#### **Digital Inputs (%IX / %I)**
* `%I0.0` - `I_EStop_NC` (BOOL): Master Railway Emergency Signal Trip Switch (NC, 24VDC).
* `%I0.1` - `I_MasterRun_PB` (BOOL): Master Timetable Network Service Run Pushbutton.
* `%I0.2` - `I_ResetFault_PB` (BOOL): Signal & Interlock Alarm Reset Pushbutton.
* `%I0.3` - `I_AxleCounter_London` (BOOL): Track Circuit Block Occupancy Sensor - London Terminal.
* `%I0.4` - `I_AxleCounter_Brum` (BOOL): Track Circuit Block Occupancy Sensor - Birmingham New Street.
* `%I0.5` - `I_AxleCounter_Manchester` (BOOL): Track Circuit Block Occupancy Sensor - Manchester Piccadilly.
* `%I0.6` - `I_AxleCounter_Edinburgh` (BOOL): Track Circuit Block Occupancy Sensor - Edinburgh Waverley.
* `%I0.7` - `I_PointSwitch_Normal` (BOOL): Motorized Switch Point Alignment Limit Switch (Main Line).

#### **Analog Inputs (%IW / Speed & Distance Transmitters)**
* `%IW100` - `AI_TractionSpeed_Train1` (REAL): Actual Train Speed - Avanti West Coast #101 (0.0 to 220.0 km/h).
* `%IW102` - `AI_TractionSpeed_Train2` (REAL): Actual Train Speed - LNER Intercity #204 (0.0 to 220.0 km/h).
* `%IW104` - `AI_TractionSpeed_Train3` (REAL): Actual Train Speed - CrossCountry Express #307 (0.0 to 220.0 km/h).
* `%IW106` - `AI_TractionSpeed_Train4` (REAL): Actual Train Speed - TransPennine Express #412 (0.0 to 220.0 km/h).
* `%IW108` - `AI_TractionSpeed_Train5` (REAL): Actual Train Speed - Great Western Railway #518 (0.0 to 220.0 km/h).

#### **Digital Outputs (%QX / %Q)**
* `%Q0.0` - `Q_Signal_London_Green` (BOOL): Signal Aspect Green - London Departure Block.
* `%Q0.1` - `Q_Signal_Brum_Green` (BOOL): Signal Aspect Green - Birmingham Hub Block.
* `%Q0.2` - `Q_Signal_Manchester_Green` (BOOL): Signal Aspect Green - Manchester Hub Block.
* `%Q0.3` - `Q_Signal_Scotland_Green` (BOOL): Signal Aspect Green - Glasgow/Edinburgh Border Block.
* `%Q0.4` - `Q_PointMotor_AlignMain` (BOOL): Motorized Point Switch Motor Contactor (Main Track).
* `%Q0.5` - `Q_PointMotor_AlignBranch` (BOOL): Motorized Point Switch Motor Contactor (Branch Line).
* `%Q0.6` - `Q_PlatformBuzzer` (BOOL): Station Platform Boarding Chime / Warning Horn.
* `%Q0.7` - `Q_MasterSafetyRelay` (BOOL): Traction Current Third-Rail / Overhead Catenary Power Relay.

#### **Analog Outputs (%QW / VFD Traction Motor Speed References)**
* `%QW100` - `AQ_VFD_TractionSpeed1` (REAL): Traction VFD Reference - Train 1 (0-100%).
* `%QW102` - `AQ_VFD_TractionSpeed2` (REAL): Traction VFD Reference - Train 2 (0-100%).
* `%QW104` - `AQ_VFD_TractionSpeed3` (REAL): Traction VFD Reference - Train 3 (0-100%).
* `%QW106` - `AQ_VFD_TractionSpeed4` (REAL): Traction VFD Reference - Train 4 (0-100%).
* `%QW108` - `AQ_VFD_TractionSpeed5` (REAL): Traction VFD Reference - Train 5 (0-100%).

---

### **3. Detailed Implementation Requirements**

1. **Tailwind CSS Directives (`src/index.css`):**
   * Use exact standard Tailwind CSS v3 directives: `@tailwind base; @tailwind components; @tailwind utilities;` (do NOT use `@tailwindcss`).
2. **PostCSS Configuration (`postcss.config.js`):**
   * Must include `export default { plugins: { tailwindcss: {}, autoprefixer: {} } }`.
3. **5 Active Intercity Express Trains:**
   * Include 5 distinct trains moving locked on track line routes:
     - Train 1: **Avanti West Coast #101** (Red `#ef4444`, Route: London ➔ Coventry ➔ Birmingham ➔ Manchester ➔ Glasgow)
     - Train 2: **LNER Intercity #204** (Blue `#0284c7`, Route: London ➔ Leeds ➔ Edinburgh)
     - Train 3: **CrossCountry Express #307** (Pink `#ec4899`, Route: Bristol ➔ Birmingham ➔ Leeds)
     - Train 4: **TransPennine Express #412** (Purple `#a855f7`, Route: Liverpool ➔ Manchester ➔ Leeds)
     - Train 5: **Great Western Railway #518** (Green `#22c55e`, Route: London ➔ Bristol)
4. **2D UK Network SCADA Map Visualizer (`src/components/Visualizer.tsx`):**
   * Create an expanded SVG UK railway map displaying Network Rail color-coded mainlines connecting all 9 stations with offset station labels to prevent text overlap.
   * Industrial signal gantry masts at London, Birmingham, and Manchester approaches with live Red/Green LEDs.
5. **Real-Time Station PIS Timetable Board & Web Speech PA Audio:**
   * Render an authentic PIS timetable board displaying Live Departures & Arrivals for all 5 active trains across all 9 stations.
   * Provide a **Station PA Zone Selector dropdown** (`All Stations`, `London Euston`, `Birmingham New St`, `Manchester Piccadilly`, `Edinburgh Waverley`, etc.) to filter audio announcements.
   * Implement non-interrupting voice announcements via Web Speech API (`window.speechSynthesis`), checking `if (window.speechSynthesis.speaking) return;` to prevent mid-sentence audio cuts.
6. **Human Network Controller Console (`src/components/ControlPanel.tsx`):**
   * Provide interactive controls for 5 train VFD speed setpoint sliders (0-200 km/h), speed up / slow down buttons, individual signal aspect overrides, Temporary Speed Restrictions (TSR 50 km/h), platform reassignment, and catenary power trip.
7. **Live Interactive Ladder Diagram (LD) & Function Block Monitor (`src/components/CodeViewer.tsx`):**
   * Build a live 24V power-flow Ladder Diagram monitor displaying active rungs with Function Blocks (`FB_SpeedSupervision`, `FB_TrackBlockInterlock`, `FB_TimetableManager`, `FB_SafetyInterlock`) that glow green/cyan in real time during scan execution. Include tab toggle to Structured Text (`.ST`).
8. **Step-by-Step Interactive Demo Instructions Panel:** Embed a clear 4-step walkthrough card inside `Visualizer.tsx`.
9. **Documentation & Build Journal:** Fill `ARCHITECTURE.md`, `PLC_LOGIC.md` with complete I/O lists and memory tables, and append `## Logic Implementation — <today's date>` to `journal.md` with `<!-- METRICS:logic -->`.
```
