<!-- GENERATED FILE: do not edit directly. Source: prompts/templates/logic/railway-network.md + prompts/manifest.json. Regenerate with: node prompts/generate.mjs -->
```markdown
Now that the project environment is scaffolded in `projects/09-uk-railway-network-controller/gemini/code/`, implement the full domain logic, state management, soft-PLC scan loop, Function Block ladder diagram, timetable engine, and UI components according to the industrial specifications below.

---

### **1. Target Hardware & PLC System Domain**
* **Hardware & Runtime:** Siemens S7-1500F / Schneider Electric Modicon M580 Safety PLC (SIL4 Railway Interlocking CPU).
* **Language:** IEC 61131-3 Function Block Diagram (FBD) and Ladder Logic (LD) with Structured Text (`.ST`).
* **System Focus:** UK Intercity Railway Network & Block Signaling Controller — Connecting 9 Major Stations (**London, Coventry, Birmingham, Bristol, Liverpool, Manchester, Leeds, Glasgow, Edinburgh**). Features axle counter block interlocking, VFD traction motor speed setpoint modulation (speed up / slow down), station departure timetabling, and passenger information board displays (PIS).

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
* `%IW100` - `AI_TractionSpeed_Intercity1` (REAL): Actual Train Speed - Intercity Express 1 (0.0 to 220.0 km/h).
* `%IW102` - `AI_TractionSpeed_Intercity2` (REAL): Actual Train Speed - Intercity Express 2 (0.0 to 220.0 km/h).
* `%IW104` - `AI_TrackCurvature_Limit` (REAL): Automatic Train Protection (ATP) Speed Limit (0.0 to 200.0 km/h).

#### **Digital Outputs (%QX / %Q)**
* `%Q0.0` - `Q_Signal_London_Green` (BOOL): Signal Aspect Aspect Green - London Departure Block.
* `%Q0.1` - `Q_Signal_Brum_Green` (BOOL): Signal Aspect Aspect Green - Birmingham Hub Block.
* `%Q0.2` - `Q_Signal_Manchester_Green` (BOOL): Signal Aspect Aspect Green - Manchester Hub Block.
* `%Q0.3` - `Q_Signal_Scotland_Green` (BOOL): Signal Aspect Aspect Green - Glasgow/Edinburgh Border Block.
* `%Q0.4` - `Q_PointMotor_AlignMain` (BOOL): Motorized Point Switch Motor Contactor (Main Track).
* `%Q0.5` - `Q_PointMotor_AlignBranch` (BOOL): Motorized Point Switch Motor Contactor (Branch Line).
* `%Q0.6` - `Q_PlatformBuzzer` (BOOL): Station Platform Boarding Chime / Warning Horn.
* `%Q0.7` - `Q_MasterSafetyRelay` (BOOL): Traction Current Third-Rail / Overhead Catenary Power Relay.

#### **Analog Outputs (%QW / VFD Traction Motor Speed Reference)**
* `%QW100` - `AQ_VFD_TractionSpeed1` (REAL): Traction Motor VFD Speed Reference Setpoint - Train 1 (0-100%).
* `%QW102` - `AQ_VFD_TractionSpeed2` (REAL): Traction Motor VFD Speed Reference Setpoint - Train 2 (0-100%).

#### **Internal Memory Word Table (%MW)**
* `%MW0` - `M_NetworkState` (INT): Operating State (0=STOPPED, 1=SCHEDULED_RUN, 2=EXPRESS_SERVICE, 99=SIGNAL_FAULT).
* `%MW2` - `M_TargetSpeed_Train1` (REAL): Operator VFD Target Speed Setpoint - Train 1 (0-200 km/h).
* `%MW4` - `M_TargetSpeed_Train2` (REAL): Operator VFD Target Speed Setpoint - Train 2 (0-200 km/h).
* `%MW6` - `M_ActiveBlockCount` (INT): Active Occupied Block Count across UK Network.
* `%MW10` - `%MW50` - Timetable Departure & Arrival Register Table (Station, Scheduled Time, Expected Time, Platform, Status).

---

### **3. Function Block & Ladder Logic Control Rules**

1. **`FB_SpeedSupervision` Function Block**:
   * Compares `%IW100` (`AI_TractionSpeed_Intercity1`) and `%IW102` to `%MW2`, `%MW4` speed sliders and track limits (`%IW104`). Ramps `%QW100` (`AQ_VFD_TractionSpeed1`) up or down to accelerate/decelerate trains smoothly between stations.
2. **`FB_TrackBlockInterlock` Function Block**:
   * Evaluates axle counters (`%I0.3` - `%I0.6`). If a track block is occupied by Train 1, sets trailing signal aspects to RED (`%Q0.0` - `%Q0.3` = FALSE) and holds trailing train at safe braking distance.
3. **`FB_TimetableManager` Function Block**:
   * Updates real-time departure and arrival schedules for **London, Coventry, Birmingham, Bristol, Liverpool, Manchester, Leeds, Glasgow, and Edinburgh**. Dynamically calculates delays and updates status badges (`ON TIME`, `BOARDING`, `DEPARTED`, `DELAYED`).
4. **`FB_SafetyInterlock` Function Block**:
   * Trips on `%I0.0` (`I_EStop_NC` = FALSE) or point switch misalignment (`%I0.7` = FALSE), de-energizing `%Q0.7` (`Q_MasterSafetyRelay`) and locking traction brakes.

---

### **4. Detailed Implementation Requirements**

1. **Tailwind CSS Directives (`src/index.css`):**
   * Use exact standard Tailwind CSS v3 directives: `@tailwind base; @tailwind components; @tailwind utilities;` (do NOT use `@tailwindcss`).
2. **2D UK Network SCADA Map Visualizer (`src/components/Visualizer.tsx`):**
   * Create an interactive SVG UK geographical railway map displaying track lines connecting all 9 stations: **London, Coventry, Birmingham, Bristol, Liverpool, Manchester, Leeds, Glasgow, Edinburgh**.
   * Animate trains moving along tracks between stations, glowing signal head aspect LEDs (Red/Yellow/Green), occupied block highlights, and speed indicators.
3. **Real-Time Station Timetable Board Display:**
   * Render an authentic airport/railway split-flap PIS timetable board displaying Live Departures & Arrivals across all 9 stations with destination, scheduled time, estimated time, platform number, and status badges.
4. **Interactive Train Speed Controls (`src/components/ControlPanel.tsx`):**
   * Provide interactive HMI speed sliders and buttons for `Train 1 Speed Up (Accelerator)`, `Train 1 Slow Down (Brake)`, `Train 2 Speed Control`, `E-Stop`, `Point Switch Toggle`, and `Station Stop Override`.
5. **Live Interactive Ladder Diagram (LD) & Function Block Monitor (`src/components/CodeViewer.tsx`):**
   * Build a live 24V power-flow Ladder Diagram monitor displaying active rungs with Function Blocks (`FB_SpeedSupervision`, `FB_TrackBlockInterlock`, `FB_TimetableManager`, `FB_SafetyInterlock`) that glow green/cyan in real time during scan execution. Include tab toggle to Structured Text (`.ST`).
6. **Step-by-Step Interactive Demo Instructions Panel:** Embed a clear 4-step walkthrough card inside `Visualizer.tsx`.
7. **Documentation & Build Journal:** Fill `ARCHITECTURE.md`, `PLC_LOGIC.md` with complete I/O lists and memory tables, and append `## Logic Implementation — <today's date>` to `journal.md` with `<!-- METRICS:logic -->`.
```
