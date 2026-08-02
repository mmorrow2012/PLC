<!-- GENERATED FILE: do not edit directly. Source: prompts/templates/logic/batch-reactor.md + prompts/manifest.json. Regenerate with: node prompts/generate.mjs -->
```markdown
Now that the project environment is scaffolded in `projects/07-chemical-batch-reactor/gemini/code/`, implement the full domain logic, state management, soft-PLC scan loop, Function Block ladder diagram, and UI components according to the industrial specifications below.

---

### **1. Target Hardware & PLC System Domain**
* **Hardware & Runtime:** Schneider Electric Modicon M580 running EcoStruxure Control Expert (Unity Pro) / Siemens S7-1500.
* **Language:** IEC 61131-3 Function Block Diagram (FBD) and Ladder Logic (LD) with Structured Text (`.ST`).
* **System Focus:** Multi-Stage Chemical Batch Reactor & Liquid Blending System — 4 Vessels (Raw Chemical Storage A & B, Heated Mixing Reactor, Product Holding Tank), level transmitters, proportional ratio valves, heating jacket, agitator mixer, and pH neutralizer injection pumps.

---

### **2. Linked Hardware I/O List & Memory Allocation Table**

#### **Digital Inputs (%IX / %I)**
* `%I0.0` - `I_EStop_NC` (BOOL): Master Hardware Emergency Stop switch (Normally Closed, 24VDC).
* `%I0.1` - `I_StartBatch_PB` (BOOL): Operator Start Batch Pushbutton.
* `%I0.2` - `I_StopBatch_PB` (BOOL): Operator Stop / Pause Batch Pushbutton.
* `%I0.3` - `I_ResetFault_PB` (BOOL): Fault Acknowledgment & Reset Pushbutton.
* `%I0.4` - `I_LSH_TankA` (BOOL): High Level Float Guard - Tank A (Overflow Interlock).
* `%I0.5` - `I_LSH_TankB` (BOOL): High Level Float Guard - Tank B (Overflow Interlock).
* `%I0.6` - `I_LSH_Reactor` (BOOL): High Level Float Guard - Reactor Vessel (Overflow Interlock).
* `%I0.7` - `I_AgitatorHealth` (BOOL): Mixer Motor Overload Protection Relay (NC).

#### **Analog Inputs (%IW / 4-20mA Scaled 0.0 - 100.0%)**
* `%IW100` - `AI_LT_TankA` (REAL): Level Transmitter - Raw Chemical Tank A (0.0 to 1000.0 Litres).
* `%IW102` - `AI_LT_TankB` (REAL): Level Transmitter - Raw Chemical Tank B (0.0 to 1000.0 Litres).
* `%IW104` - `AI_LT_Reactor` (REAL): Level Transmitter - Chemical Mixing Reactor (0.0 to 2000.0 Litres).
* `%IW106` - `AI_TT_Reactor` (REAL): Temperature Transmitter - Heating Jacket (0.0 to 150.0 °C).
* `%IW108` - `AI_pHT_Reactor` (REAL): pH Probe Sensor - Reactor Blend (0.0 to 14.0 pH).

#### **Digital Outputs (%QX / %Q)**
* `%Q0.0` - `Q_PumpA_Run` (BOOL): Raw Chemical Feed Pump A Contactor.
* `%Q0.1` - `Q_PumpB_Run` (BOOL): Raw Chemical Feed Pump B Contactor.
* `%Q0.2` - `Q_Agitator_Run` (BOOL): Reactor High-Shear Agitator Mixer Motor.
* `%Q0.3` - `Q_HeaterJacket_On` (BOOL): Thermal Fluid Heating Element Contactor.
* `%Q0.4` - `Q_PumpAcid_Dose` (BOOL): Acid Dosing Micro-Pump (pH Lowering).
* `%Q0.5` - `Q_PumpBase_Dose` (BOOL): Alkali Base Dosing Micro-Pump (pH Raising).
* `%Q0.6` - `Q_Valve_ProductDrain` (BOOL): Motorized Bottom Discharge Valve (Reactor ➔ Product Holding Tank).
* `%Q0.7` - `Q_AlarmBeacon` (BOOL): Master Audible & Visual Alarm Beacon.

#### **Analog Outputs (%QW / 4-20mA Scaled 0.0 - 100.0%)**
* `%QW100` - `AQ_V1_RatioA` (REAL): Proportional Control Valve A Position (0-100%).
* `%QW102` - `AQ_V2_RatioB` (REAL): Proportional Control Valve B Position (0-100%).

#### **Internal Memory Word Table (%MW)**
* `%MW0` - `M_BatchState` (INT): State Machine (0=IDLE, 1=DOSING_A, 2=DOSING_B, 3=HEATING_MIXING, 4=PH_BALANCING, 5=DRAINING, 99=FAULT).
* `%MW2` - `M_RecipeRatioA` (REAL): Target Recipe Ratio Chemical A (default 600.0 L).
* `%MW4` - `M_RecipeRatioB` (REAL): Target Recipe Ratio Chemical B (default 400.0 L).
* `%MW6` - `M_TargetTemp` (REAL): Target Batch Temperature Setpoint (default 65.0 °C).
* `%MW8` - `M_TargetpH` (REAL): Target pH Neutral Setpoint (default 7.0 pH).

---

### **3. Function Block & Ladder Logic Control Rules**

1. **`FB_BatchBlend` Function Block**:
   * Evaluates `AI_LT_TankA`, `AI_LT_TankB`, and `AI_LT_Reactor` against `%MW2` and `%MW4`.
   * Regulates `%Q0.0` (`Q_PumpA_Run`), `%Q0.1` (`Q_PumpB_Run`), `%QW100` (`AQ_V1_RatioA`), and `%QW102` (`AQ_V2_RatioB`) until target ratio recipe volume is reached in the Reactor.
2. **`FB_TempControl` Function Block**:
   * Controls `%Q0.3` (`Q_HeaterJacket_On`) and `%Q0.2` (`Q_Agitator_Run`) to heat mixture to 65.0°C while preventing hot-spot scorching.
3. **`FB_pHBalancing` Function Block**:
   * Compares `AI_pHT_Reactor` to 7.0 pH setpoint. Pulse-doses `%Q0.4` (`Q_PumpAcid_Dose`) if pH > 7.2 or `%Q0.5` (`Q_PumpBase_Dose`) if pH < 6.8.
4. **`FB_SafetyInterlock` Function Block**:
   * Trips immediately on `%I0.0` (`I_EStop_NC` = FALSE), high float guards (`%I0.4`, `%I0.5`, `%I0.6`), or thermal runaway (> 90°C), locking all pumps and valves CLOSED.

---

### **4. Detailed Implementation Requirements**

1. **Live Interactive Ladder Diagram (LD) & Function Block Monitor (`src/components/CodeViewer.tsx`):**
   * Build a live 24V power-flow Ladder Diagram monitor with Function Blocks (`FB_BatchBlend`, `FB_TempControl`, `FB_pHBalancing`, `FB_SafetyInterlock`) that glow green/cyan in real time during scan loop execution. Include tab toggle to Structured Text (`.ST`).
2. **2D SCADA Visualizer (`src/components/Visualizer.tsx`):**
   * Create an interactive SVG graphic displaying 4 Vessels (Tank A, Tank B, Reactor with heating jacket & rotating mixer blades, Product Tank).
   * Animate rising/falling liquid column levels, proportional valve openings, rotating agitator blades, thermal jacket heat glow, and pH meter readings.
3. **Step-by-Step Interactive Demo Instructions Panel:** Embed a clear 4-step walkthrough card inside `Visualizer.tsx`.
4. **HMI Control Panel (`src/components/ControlPanel.tsx`):** Provide controls for E-Stop, Start Batch, Pause Batch, Reset Fault, Recipe Setpoint Sliders, and manual valve/pump overrides.
5. **Documentation & Build Journal:** Fill `ARCHITECTURE.md`, `PLC_LOGIC.md` with complete I/O lists and memory tables, and append `## Logic Implementation — <today's date>` to `journal.md` with `<!-- METRICS:logic -->`.
```
