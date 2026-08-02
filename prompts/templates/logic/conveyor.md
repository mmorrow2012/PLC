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
    * `Reset_PB` (BOOL): Pushbutton to reset latched safety faults.
    * `Sensor_PartDetect` (BOOL): Photoelectric proximity sensor detecting part presence at sorting station.
    * `Sensor_Color` (INT): Color classification sensor (1 = Red/Reject, 2 = Green/Accept, 3 = Blue/Special).
    * `Sensor_Weight` (REAL): Load cell sensor measuring part weight in kilograms.
  * **Outputs:**
    * `VFD_Run` (BOOL): Variable Frequency Drive motor run command.
    * `VFD_Speed_Ref` (REAL): Motor speed reference percentage (0.0 to 100.0%).
    * `Actuator_Diverter` (BOOL): Solenoid arm actuator for routing rejected parts into side chute.
    * `Alarm_Tower` (DWORD): Bitmask status beacon.

---

### **2. Control Logic Rules (To implement in `.st` and soft-PLC engine)**
1. **Safety Interlock:** Immediately force `VFD_Run := FALSE` upon `E_Stop` loss (`E_Stop = FALSE`). Require an explicit manual reset (`Reset_PB`) to resume operation.
2. **Part Sorting & Counter Logic:** When `Sensor_PartDetect = TRUE`, evaluate part color/spec. Actuate `Actuator_Diverter := TRUE` for rejected items. Ensure rejected items immediately increment `partCountReject` and `partCountTotal` metrics as they enter the divert chute (`p.diverted && !p.passed`).
3. **Speed Control:** Adjust `VFD_Speed_Ref` dynamically based on HMI speed slider (0-100%).

---

### **3. Detailed Implementation Requirements**
1. **Live Interactive Ladder Diagram (LD) Monitor (`src/components/CodeViewer.tsx`):**
   * Build a live 24V power-flow Ladder Diagram monitor displaying active rungs (`-| |-`, `-|/|-`, `-( )-`) that glow green/cyan in real time during PLC scan loops. Include a tab toggle to Structured Text (`.ST`).
2. **Step-by-Step Interactive Demo Instructions Panel:** Embed a clear 4-step walkthrough card inside `Visualizer.tsx`.
3. **Dynamic Visualizer (`src/components/Visualizer.tsx`):** Animate moving package items, VFD belt speed, optical sensor beams, diverter arm actuation, and metric counters.
4. **HMI Control Panel (`src/components/ControlPanel.tsx`):** Provide controls for E-Stop, Manual Reset, VFD Speed Slider, Spawn Green (Accept), Spawn Red (Reject), and Force Table.
5. **Documentation & Build Journal:** Fill `ARCHITECTURE.md`, `PLC_LOGIC.md`, and append `## Logic Implementation — <today's date>` to `journal.md` with `<!-- METRICS:logic -->`.
```
