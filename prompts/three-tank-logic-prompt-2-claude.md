```markdown
Now that the project environment is scaffolded in `projects/02-three-tank-liquid-level-control/claude/code/`, implement the full domain logic, state management, soft-PLC scan loop, and UI components according to the industrial specifications below.

---

### **1. Target Hardware & PLC System Domain**
* **Hardware & Runtime:** Schneider Electric Modicon M580 running EcoStruxure Control Expert (Unity Pro).
* **Language:** Structured Text (`.ST`) adhering to IEC 61131-3 standards.
* **System Focus:** Three-Tank Liquid Level Control — auto-fill Tank A, transfer to Tank B, gravity drain to Tank C, with cascade control and overflow protection.
* **I/O Tag Mapping:**
  * **Inputs:**
    * `E_Stop` (BOOL): Hardware Emergency Stop switch (Normally Closed / Safety High logic; `FALSE` = Emergency State).
    * `Start_PB` / `Stop_PB` (BOOL): Operator start/stop pushbuttons.
    * `LT_TankA`, `LT_TankB`, `LT_TankC` (REAL): Analog level transmitters, scaled 0.0–100.0% from 4-20mA.
    * `LSH_TankA`, `LSH_TankB` (BOOL): Hardwired high-level float switches (independent overflow guard, separate from the analog transmitters).
  * **Outputs:**
    * `Pump_Fill_A` (BOOL): Inlet fill pump/valve supplying Tank A.
    * `Pump_Transfer_AB` (BOOL): Transfer pump moving liquid from Tank A to Tank B.
    * `Valve_Drain_BC_Pos` (REAL): Proportional gravity-drain valve position (0.0–100.0%) from Tank B to Tank C.
    * `Alarm_Overflow` (BOOL): Latched overflow alarm.
    * `Alarm_Tower` (DWORD): Bitmask status beacon (Bit 0 = Green/Run, Bit 1 = Yellow/Warning, Bit 2 = Red/Alarm).
  * **Setpoints (internal):**
    * `SP_LevelA_High`, `SP_LevelB_High` (REAL): Fill/transfer cutoff setpoints.
    * `SP_LevelB_Target` (REAL): Cascade control target level for Tank B.

---

### **2. Control Logic Rules (To implement in `.st` and soft-PLC engine)**
1. **State Machine:** `IDLE → FILLING_A → TRANSFERRING_AB → DRAINING_BC → IDLE`, advanced by level thresholds and `Start_PB`/`Stop_PB`.
2. **Cascade/Fill Control:** In `FILLING_A`, run `Pump_Fill_A` until `LT_TankA >= SP_LevelA_High`, then transition to `TRANSFERRING_AB`. In `TRANSFERRING_AB`, run `Pump_Transfer_AB` while modulating `Valve_Drain_BC_Pos` proportionally to hold `LT_TankB` near `SP_LevelB_Target` (simple proportional control is sufficient — full PID not required).
3. **Overflow Protection:** If `LT_TankA >= 100.0` or `LT_TankB >= 100.0` or either `LSH_TankA`/`LSH_TankB` trips, immediately force `Pump_Fill_A := FALSE`, `Pump_Transfer_AB := FALSE`, latch `Alarm_Overflow := TRUE`, and require a manual reset (via `Start_PB` after alarm acknowledgement) to resume.
4. **Safety Interlock:** Immediately force all pumps `FALSE` and hold `Valve_Drain_BC_Pos := 0.0` upon `E_Stop` loss (`E_Stop = FALSE`). Require an explicit manual reset action to resume operation.

---

### **3. Detailed Implementation Requirements**

1. **Structured Text Logic (`src/plc/threeTankLogic.st`):**
   * Write production-ready Schneider M580 IEC 61131-3 Structured Text implementing the control rules above.

2. **Zustand I/O Memory Store (`src/store/usePlcStore.ts`):**
   * Define real-time memory image table holding all input/output tags, setpoints, forced override states, and system reset functions.

3. **Soft-PLC Scan Engine (`src/plc/softPlcEngine.ts`):**
   * Build a cyclic execution loop running at ~50ms intervals that reads inputs, executes the soft-PLC logic rules (including the state machine and proportional drain control), and updates output tags in the Zustand store.

4. **Dynamic Visualizer (`src/components/Visualizer.tsx`):**
   * Create an interactive SVG dynamic simulation of the three tanks stacked in cascade (A → B → C).
   * Animate rising/falling liquid level fills for each tank, valve/pump indicator states, and a red visual overlay/pulse when `Alarm_Overflow` or `E_Stop = FALSE`.

5. **Code Viewer (`src/components/CodeViewer.tsx`):**
   * Integrate `@monaco-editor/react` to render `threeTankLogic.st` with syntax highlighting and read-only execution indicators.

6. **HMI Control Panel (`src/components/ControlPanel.tsx`):**
   * Provide industrial SCADA controls to toggle `E_Stop`, `Start_PB`/`Stop_PB`, manually nudge analog level inputs for testing, and trigger alarm resets.

7. **Documentation (`projects/02-three-tank-liquid-level-control/claude/docs/`):**
   * Fill `ARCHITECTURE.md` with the scan loop timing and state diagram breakdown.
   * Fill `PLC_LOGIC.md` with the I/O tag register map, setpoints, and Schneider M580 configuration specifics.

```
