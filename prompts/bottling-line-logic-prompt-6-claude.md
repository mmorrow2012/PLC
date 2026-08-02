<!-- GENERATED FILE: do not edit directly. Source: prompts/templates/logic/bottling-line.md + prompts/manifest.json. Regenerate with: node prompts/generate.mjs -->
```markdown
Now that the project environment is scaffolded in `projects/06-bottling-line/claude/code/`, implement the full domain logic, state management, soft-PLC scan loop, and UI components according to the industrial specifications below.

---

### **1. Target Hardware & PLC System Domain**
* **Hardware & Runtime:** Schneider Electric Modicon M580 running EcoStruxure Control Expert (Unity Pro).
* **Language:** Structured Text (`.ST`) adhering to IEC 61131-3 standards.
* **System Focus:** Bottling Line (Advanced) — fill, cap, and label bottles against a selectable recipe, with per-stage quality gates, reject handling, and production counting.
* **I/O Tag Mapping:**
  * **Inputs:**
    * `E_Stop` (BOOL): Hardware Emergency Stop switch (Normally Closed / Safety High logic; `FALSE` = Emergency State).
    * `Sensor_BottlePresent` (BOOL): Proximity sensor confirming a bottle is indexed in station.
    * `Sensor_FillLevel` (REAL): Analog fill-level/weight verification sensor.
    * `Sensor_CapPressure` (REAL): Pressure sensor verifying cap torque/seal.
    * `Sensor_LabelVision` (BOOL): Vision-system pass (`TRUE`)/fail (`FALSE`) signal for label placement.
    * `Recipe_Select` (INT): Operator/HMI recipe selector (`1`, `2`, `3`, ...).
  * **Outputs:**
    * `Motor_FillerIndex` (BOOL): Filler station indexing motor/conveyor step.
    * `Valve_FillDispense` (BOOL): Fill valve.
    * `Actuator_CapPress` (BOOL): Capping press actuator.
    * `Motor_LabelApplicator` (BOOL): Labeler motor.
    * `Actuator_RejectPusher` (BOOL): Reject pusher/diverter for out-of-spec bottles.
    * `Counter_GoodCount`, `Counter_RejectCount` (DINT): Production counters.
    * `Alarm_Tower` (DWORD): Bitmask status beacon (Bit 0 = Green/Run, Bit 1 = Yellow/Warning, Bit 2 = Red/Alarm).
  * **Recipe Table (internal, indexed by `Recipe_Select`):**
    * `Recipe_FillTarget[3]`, `Recipe_FillTolerance[3]` (REAL): Target fill level and allowed +/- tolerance per recipe.
    * `Recipe_CapPressureMin[3]` (REAL): Minimum acceptable cap pressure per recipe.

---

### **2. Control Logic Rules (To implement in `.st` and soft-PLC engine)**
1. **Station Sequencing:** State machine `INDEX → FILL → CAP → LABEL → QUALITY_GATE → INDEX`, advanced by `Motor_FillerIndex` completing and `Sensor_BottlePresent = TRUE` at each station.
2. **Recipe-Driven Fill:** In `FILL`, open `Valve_FillDispense` until `Sensor_FillLevel` reaches `Recipe_FillTarget[Recipe_Select]`, using the active recipe's target/tolerance.
3. **Quality Gates:** In `QUALITY_GATE`, evaluate in order: (a) `Sensor_FillLevel` within `Recipe_FillTarget[Recipe_Select] +/- Recipe_FillTolerance[Recipe_Select]`; (b) `Sensor_CapPressure >= Recipe_CapPressureMin[Recipe_Select]`; (c) `Sensor_LabelVision = TRUE`. If any check fails, actuate `Actuator_RejectPusher` for one cycle and increment `Counter_RejectCount`; if all pass, increment `Counter_GoodCount`.
4. **Safety Interlock:** Immediately force `Motor_FillerIndex`, `Valve_FillDispense`, `Actuator_CapPress`, `Motor_LabelApplicator`, and `Actuator_RejectPusher` all `FALSE` upon `E_Stop` loss (`E_Stop = FALSE`). Require an explicit manual reset action to resume operation; do not reset the production counters on `E_Stop`.

---

### **3. Detailed Implementation Requirements**

1. **Structured Text Logic (`src/plc/bottlingLineLogic.st`):**
   * Write production-ready Schneider M580 IEC 61131-3 Structured Text implementing the control rules above, including the recipe lookup and quality-gate sequencing.

2. **Zustand I/O Memory Store (`src/store/usePlcStore.ts`):**
   * Define real-time memory image table holding all input/output tags, the recipe table, counters, forced override states, and system reset functions.

3. **Soft-PLC Scan Engine (`src/plc/softPlcEngine.ts`):**
   * Build a cyclic execution loop running at ~50ms intervals that reads inputs, executes the station state machine and quality-gate logic, and updates output tags and counters in the Zustand store.

4. **Dynamic Visualizer (`src/components/Visualizer.tsx`):**
   * Create an interactive SVG dynamic simulation of the fill/cap/label stations in line, animating bottle indexing, fill-level rising, cap press actuation, label pass/fail flash, and the reject pusher diverting failed bottles, with a live `Counter_GoodCount`/`Counter_RejectCount` readout.

5. **Code Viewer (`src/components/CodeViewer.tsx`):**
   * Integrate `@monaco-editor/react` to render `bottlingLineLogic.st` with syntax highlighting and read-only execution indicators.

6. **HMI Control Panel (`src/components/ControlPanel.tsx`):**
   * Provide industrial SCADA controls to toggle `E_Stop`, select the active `Recipe_Select`, spawn mock bottles with in-spec/out-of-spec sensor values, and reset the production counters.

7. **Documentation (`projects/06-bottling-line/claude/docs/`):**
   * Fill `ARCHITECTURE.md` with the scan loop timing and state diagram breakdown.
   * Fill `PLC_LOGIC.md` with the I/O tag register map, recipe table, and Schneider M580 configuration specifics.

8. **Build Journal (`projects/06-bottling-line/claude/docs/journal.md`):**
   * Append a new `## Logic Implementation — <today's date>` section below the existing Scaffold entry (do not overwrite it). Immediately below the heading, add the literal marker `<!-- METRICS:logic -->` on its own line (leave untouched). Follow with a `**Decisions:**` section and a `**Trade-offs / deviations from prompt:**` section documenting the implementation choices actually made.

```
