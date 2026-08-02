<!-- GENERATED FILE: do not edit directly. Source: prompts/templates/logic/wastewater-treatment.md + prompts/manifest.json. Regenerate with: node prompts/generate.mjs -->
```markdown
Now that the project environment is scaffolded in `projects/08-wastewater-treatment-plant/claude/code/`, implement the full domain logic, state management, soft-PLC scan loop, Function Block ladder diagram, and UI components according to the industrial specifications below.

---

### **1. Target Hardware & PLC System Domain**
* **Hardware & Runtime:** Schneider Electric Modicon M580 running EcoStruxure Control Expert (Unity Pro) / Siemens S7-1500.
* **Language:** IEC 61131-3 Function Block Diagram (FBD) and Ladder Logic (LD) with Structured Text (`.ST`).
* **System Focus:** Municipal Wastewater Treatment & Multi-Basin Aeration Tank Control System — Equalization Basin, Primary Clarifier, Multi-Stage Aeration Basins (A & B), Secondary Clarifier, Return Activated Sludge (RAS) Pumps, Chemical Coagulant Dosing, and Motorized Effluent Weir Sluice Gates.

---

### **2. Linked Hardware I/O List & Memory Allocation Table**

#### **Digital Inputs (%IX / %I)**
* `%I0.0` - `I_EStop_NC` (BOOL): Master Hardware Emergency Stop switch (Normally Closed, 24VDC).
* `%I0.1` - `I_PlantStart_PB` (BOOL): Plant Master Run Pushbutton.
* `%I0.2` - `I_PlantStop_PB` (BOOL): Plant Master Stop Pushbutton.
* `%I0.3` - `I_ResetFault_PB` (BOOL): Alarm Reset & Fault Acknowledgment.
* `%I0.4` - `I_LSH_Equalization` (BOOL): High-High Level Float Guard - Equalization Basin (Flooding Interlock).
* `%I0.5` - `I_LSH_AerationA` (BOOL): High Level Float Guard - Aeration Basin A.
* `%I0.6` - `I_LSH_AerationB` (BOOL): High Level Float Guard - Aeration Basin B.
* `%I0.7` - `I_WeirOpenLS` (BOOL): Motorized Effluent Weir Gate Fully Open Limit Switch.

#### **Analog Inputs (%IW / 4-20mA Scaled)**
* `%IW100` - `AI_LT_EqBasin` (REAL): Ultrasonic Level Transmitter - Equalization Basin (0.0 to 10.0 Metres).
* `%IW102` - `AI_LT_AerationA` (REAL): Level Transmitter - Aeration Basin A (0.0 to 6.0 Metres).
* `%IW104` - `AI_LT_AerationB` (REAL): Level Transmitter - Aeration Basin B (0.0 to 6.0 Metres).
* `%IW106` - `AI_DO_AerationA` (REAL): Dissolved Oxygen Probe - Basin A (0.0 to 10.0 mg/L).
* `%IW108` - `AI_Turbidity_Effluent` (REAL): Turbidity Sensor - Effluent Discharge (0.0 to 100.0 NTU).

#### **Digital Outputs (%QX / %Q)**
* `%Q0.0` - `Q_Pump_RawInfluent1` (BOOL): Influent Pump 1 Duty Contactor.
* `%Q0.1` - `Q_Pump_RawInfluent2` (BOOL): Influent Pump 2 Lag Contactor.
* `%Q0.2` - `Q_Blower_AerationA` (BOOL): Aeration Basin A Diffuser Blower Motor.
* `%Q0.3` - `Q_Blower_AerationB` (BOOL): Aeration Basin B Diffuser Blower Motor.
* `%Q0.4` - `Q_Pump_RAS` (BOOL): Return Activated Sludge (RAS) Recirculation Pump.
* `%Q0.5` - `Q_Pump_Coagulant` (BOOL): Chemical Coagulant Polymer Dosing Pump.
* `%Q0.6` - `Q_Motor_WeirOpen` (BOOL): Motorized Sluice Weir Gate Open Contactor.
* `%Q0.7` - `Q_Motor_WeirClose` (BOOL): Motorized Sluice Weir Gate Close Contactor.

#### **Analog Outputs (%QW / 4-20mA Scaled)**
* `%QW100` - `AQ_VFD_InfluentSpeed` (REAL): Influent Pump VFD Speed Reference (0-100%).
* `%QW102` - `AQ_AirValve_Aeration` (REAL): Aeration Air Flow Control Valve Position (0-100%).

#### **Internal Memory Word Table (%MW)**
* `%MW0` - `M_PlantState` (INT): Operating State (0=OFF, 1=EQUALIZING, 2=AERATION_ACTIVE, 3=CLARIFYING, 4=EFFLUENT_DISCHARGE, 99=ALARM).
* `%MW2` - `M_TargetDO` (REAL): Dissolved Oxygen Target Setpoint (default 2.5 mg/L).
* `%MW4` - `M_MaxTurbidity` (REAL): Max Allowed Effluent Turbidity Setpoint (default 15.0 NTU).
* `%MW6` - `M_LeadPumpToggle` (INT): Lead-Lag Pump Duty Rotation Toggle (1=Pump 1 Lead, 2=Pump 2 Lead).

---

### **3. Function Block & Ladder Logic Control Rules**

1. **`FB_LeadLagPump` Function Block**:
   * Evaluates `AI_LT_EqBasin`. At 3.0m, starts Lead Influent Pump. At 6.0m, starts Lag Influent Pump and ramps `%QW100` (`AQ_VFD_InfluentSpeed`) to 100%. Alternates lead pump duty on each cycle.
2. **`FB_AerationDO` Function Block**:
   * Compares `AI_DO_AerationA` to `%MW2` (2.5 mg/L). Modulates `%QW102` (`AQ_AirValve_Aeration`) and runs `%Q0.2` (`Q_Blower_AerationA`) to maintain biological digestion oxygen levels.
3. **`FB_WeirGateControl` Function Block**:
   * Controls motorized sluice weir gate (`Q_Motor_WeirOpen`, `Q_Motor_WeirClose`). Opens gate when water in secondary clarifier reaches discharge level AND `AI_Turbidity_Effluent` < 15.0 NTU.
4. **`FB_SafetyInterlock` Function Block**:
   * Trips on `%I0.0` (`I_EStop_NC` = FALSE), high-high float guard (`%I0.4`), or high turbidity (> 25.0 NTU), closing weir gate and triggering alarm.

---

### **4. Detailed Implementation Requirements**

1. **Tailwind CSS Directives (`src/index.css`):**
   * Use exact standard Tailwind CSS v3 directives: `@tailwind base; @tailwind components; @tailwind utilities;` (do NOT use `@tailwindcss`).
2. **Live Interactive Ladder Diagram (LD) & Function Block Monitor (`src/components/CodeViewer.tsx`):**
   * Build a live 24V power-flow Ladder Diagram monitor with Function Blocks (`FB_LeadLagPump`, `FB_AerationDO`, `FB_WeirGateControl`, `FB_SafetyInterlock`) that glow green/cyan in real time during scan loop execution. Include tab toggle to Structured Text (`.ST`).
3. **2D SCADA Visualizer (`src/components/Visualizer.tsx`):**
   * Create an interactive SVG graphic displaying Equalization Basin, Primary Clarifier, Aeration Basins A & B (with air bubble animation), Secondary Clarifier, and Motorized Weir Gate.
   * Animate rising/falling basin levels, bubbling aeration diffusers, VFD pump speeds, and weir gate opening.
4. **Step-by-Step Interactive Demo Instructions Panel:** Embed a clear 4-step walkthrough card inside `Visualizer.tsx`.
5. **HMI Control Panel (`src/components/ControlPanel.tsx`):** Provide controls for E-Stop, Plant Start/Stop, Reset Fault, Lead/Lag Pump Toggle, DO setpoint sliders, and manual weir gate controls.
6. **Documentation & Build Journal:** Fill `ARCHITECTURE.md`, `PLC_LOGIC.md` with complete I/O lists and memory tables, and append `## Logic Implementation — <today's date>` to `journal.md` with `<!-- METRICS:logic -->`.
```
