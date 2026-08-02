<!-- GENERATED SOURCE TEMPLATE. Rendered per agent by prompts/generate.mjs. Placeholder: {{AGENT}} -->
```markdown
Now that the project environment is scaffolded in `projects/01-conveyor-system/{{AGENT}}/code/`, implement the full domain logic, state management, soft-PLC scan loop, and UI components according to the industrial specifications below.

---

### **1. Target Hardware & PLC System Domain**
* **Hardware & Runtime:** Schneider Electric Modicon M580 running EcoStruxure Control Expert (Unity Pro).
* **Language:** Structured Text (`.ST`) adhering to IEC 61131-3 standards.
* **System Focus:** Automated Conveyor Belt System with sorting and safety interlock logic.
* **I/O Tag Mapping:**
  * **Inputs:**
    * `E_Stop` (BOOL): Hardware Emergency Stop switch (Normally Closed / Safety High logic; `FALSE` = Emergency State).
    * `Sensor_PartDetect` (BOOL): Photoelectric proximity sensor detecting part presence at the sorting station.
    * `Sensor_Color` (INT): Color classification sensor (1 = Reject/Red, 2 = Accept/Green, 3 = Special/Blue).
    * `Sensor_Weight` (REAL): Load cell sensor measuring part weight in kilograms.
  * **Outputs:**
    * `VFD_Run` (BOOL): Variable Frequency Drive motor run command.
    * `VFD_Speed_Ref` (REAL): Motor speed reference percentage (0.0 to 100.0%).
    * `Actuator_Diverter` (BOOL): Solenoid arm actuator for routing/sorting parts into target lanes.
    * `Alarm_Tower` (DWORD): Bitmask status beacon (Bit 0 = Green/Run, Bit 1 = Yellow/Warning, Bit 2 = Red/Alarm).

---

### **2. Control Logic Rules (To implement in `.st` and soft-PLC engine)**
1. **Safety Interlock:** Immediately force `VFD_Run := FALSE` upon `E_Stop` loss (`E_Stop = FALSE`). Require an explicit manual reset action to resume operation.
2. **Part Sorting:** Evaluate `Sensor_Color` and `Sensor_Weight` thresholds when `Sensor_PartDetect = TRUE`. Actuate `Actuator_Diverter := TRUE` for out-of-spec or designated reject items.
3. **Speed Control:** Adjust `VFD_Speed_Ref` dynamically based on line throughput and system state.

---

### **3. Detailed Implementation Requirements**

1. **Structured Text Logic (`src/plc/conveyorLogic.st`):**
   * Write production-ready Schneider M580 IEC 61131-3 Structured Text implementing the control rules above.

2. **Zustand I/O Memory Store (`src/store/usePlcStore.ts`):**
   * Define real-time memory image table holding all input/output tags, forced override states, and system reset functions.

3. **Soft-PLC Scan Engine (`src/plc/softPlcEngine.ts`):**
   * Build a cyclic execution loop running at ~50ms intervals that reads inputs, executes the soft-PLC logic rules, and updates output tags in the Zustand store.

4. **Dynamic Visualizer (`src/components/Visualizer.tsx`):**
   * Create an interactive SVG or HTML5 Canvas dynamic simulation of the conveyor line.
   * Animate moving parts along the belt when `VFD_Run = TRUE`, toggle sensor lights on part detection, animate the diverter arm, and display red visual overlays when `E_Stop = FALSE`.

5. **Code Viewer (`src/components/CodeViewer.tsx`):**
   * Integrate `@monaco-editor/react` to render `conveyorLogic.st` with syntax highlighting and read-only execution indicators.

6. **HMI Control Panel (`src/components/ControlPanel.tsx`):**
   * Provide industrial SCADA controls to toggle `E_Stop`, spawn mock parts with varying color/weight parameters, and trigger manual resets.

7. **Documentation (`projects/01-conveyor-system/{{AGENT}}/docs/`):**
   * Fill `ARCHITECTURE.md` with the scan loop timing and state diagram breakdown.
   * Fill `PLC_LOGIC.md` with the I/O tag register map and Schneider M580 configuration specifics.

8. **Build Journal (`projects/01-conveyor-system/{{AGENT}}/docs/journal.md`):**
   * Append a new `## Logic Implementation — <today's date>` section below the existing Scaffold entry (do not overwrite it). Immediately below the heading, add the literal marker `<!-- METRICS:logic -->` on its own line (leave untouched). Follow with a `**Decisions:**` section and a `**Trade-offs / deviations from prompt:**` section documenting the implementation choices actually made.

```
