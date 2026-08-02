```markdown
Now that the project environment is scaffolded in `projects/05-traffic-light-controller/claude/code/`, implement the full domain logic, state management, soft-PLC scan loop, and UI components according to the industrial specifications below.

---

### **1. Target Hardware & PLC System Domain**
* **Hardware & Runtime:** Schneider Electric Modicon M580 running EcoStruxure Control Expert (Unity Pro).
* **Language:** Structured Text (`.ST`) adhering to IEC 61131-3 standards.
* **System Focus:** Traffic Light Controller with Pedestrian Call — synchronized NS/EW light sequencing, pedestrian call handling, and sensor fault detection.
* **I/O Tag Mapping:**
  * **Inputs:**
    * `E_Stop` (BOOL): Hardware Emergency Stop / maintenance override switch (Normally Closed / Safety High logic; `FALSE` = flash-red maintenance state).
    * `PB_PedCall_NS`, `PB_PedCall_EW` (BOOL): Raw pedestrian call pushbutton contacts (require debouncing).
    * `Fault_Reset` (BOOL): Operator pushbutton to acknowledge and clear a latched fault.
  * **Outputs:**
    * `Light_NS` (INT enum: `0=RED, 1=YELLOW, 2=GREEN`): North-South vehicle signal head.
    * `Light_EW` (INT enum: `0=RED, 1=YELLOW, 2=GREEN`): East-West vehicle signal head.
    * `Signal_PedNS`, `Signal_PedEW` (BOOL): Walk (`TRUE`) / Don't Walk (`FALSE`) pedestrian signals.
    * `Alarm_SensorFault` (BOOL): Latched fault indicator.
  * **Timing Parameters (internal):**
    * `T_NSGreen`, `T_EWGreen` (TIME): `T#30s` / `T#25s` normal green phase durations.
    * `T_TurnPhase` (TIME): `T#5s` protected turn phase duration.
    * `T_Yellow` (TIME): `T#3s` yellow clearance interval.
    * `T_PedWalk` (TIME): `T#10s` minimum walk phase when a pedestrian call is active.
    * `T_Debounce` (TIME): `T#50ms` minimum contact-stable time for pedestrian pushbuttons.

---

### **2. Control Logic Rules (To implement in `.st` and soft-PLC engine)**
1. **Sequenced State Machine:** `NS_GREEN (T_NSGreen) → NS_YELLOW (T_Yellow) → NS_TURN (T_TurnPhase) → EW_GREEN (T_EWGreen) → EW_YELLOW (T_Yellow) → EW_TURN (T_TurnPhase) → NS_GREEN ...`, each phase driven by a `TON` timer.
2. **Pedestrian Call Handling:** Debounce `PB_PedCall_NS`/`PB_PedCall_EW` (input must be stable `TRUE` for `T_Debounce` before latching a call). A latched call for a given approach extends that approach's next `GREEN` phase to at least `T_PedWalk` and asserts the matching `Signal_PedNS`/`Signal_PedEW := TRUE` for the walk duration before returning to `FALSE` during the yellow/turn phases.
3. **Safety Cross-Check:** At every scan, verify `Light_NS = 2 (GREEN)` and `Light_EW = 2 (GREEN)` are never simultaneously `TRUE`. If they are, immediately force both to `0 (RED)`, latch `Alarm_SensorFault := TRUE`, and hold all-red until `Fault_Reset` is pressed.
4. **Safety/Maintenance Interlock:** Upon `E_Stop = FALSE`, abandon the sequence and drive both `Light_NS` and `Light_EW` into a flashing-red maintenance pattern (toggle `RED` on/off at 1Hz) until `E_Stop` is restored and `Fault_Reset` is pressed.

---

### **3. Detailed Implementation Requirements**

1. **Structured Text Logic (`src/plc/trafficLightLogic.st`):**
   * Write production-ready Schneider M580 IEC 61131-3 Structured Text implementing the control rules above, including the phase-sequencing timers and debounce logic.

2. **Zustand I/O Memory Store (`src/store/usePlcStore.ts`):**
   * Define real-time memory image table holding all input/output tags, phase/timer state, forced override states, and fault reset functions.

3. **Soft-PLC Scan Engine (`src/plc/softPlcEngine.ts`):**
   * Build a cyclic execution loop running at ~50ms intervals that reads inputs, executes the phase sequencer, debounce, and safety cross-check logic, and updates output tags in the Zustand store.

4. **Dynamic Visualizer (`src/components/Visualizer.tsx`):**
   * Create an interactive SVG dynamic simulation of the four-way intersection: NS/EW signal heads reflecting `Light_NS`/`Light_EW`, pedestrian Walk/Don't Walk icons, and a flashing red overlay during the maintenance/fault state.

5. **Code Viewer (`src/components/CodeViewer.tsx`):**
   * Integrate `@monaco-editor/react` to render `trafficLightLogic.st` with syntax highlighting and read-only execution indicators.

6. **HMI Control Panel (`src/components/ControlPanel.tsx`):**
   * Provide industrial SCADA controls to toggle `E_Stop`, simulate pedestrian button presses, force a simultaneous-green fault for testing, and trigger `Fault_Reset`.

7. **Documentation (`projects/05-traffic-light-controller/claude/docs/`):**
   * Fill `ARCHITECTURE.md` with the scan loop timing and state diagram breakdown.
   * Fill `PLC_LOGIC.md` with the I/O tag register map, phase timing table, and Schneider M580 configuration specifics.

```
