<!-- GENERATED SOURCE TEMPLATE. Rendered per agent by prompts/generate.mjs. Placeholder: {{AGENT}} -->
```markdown
Now that the project environment is scaffolded in `projects/02-three-tank-liquid-level-control/{{AGENT}}/code/`, implement the full domain logic, state management, soft-PLC scan loop, and UI components according to the industrial specifications below.

---

### **1. Target Hardware & PLC System Domain**
* **Hardware & Runtime:** Schneider Electric Modicon M580 running EcoStruxure Control Expert (Unity Pro).
* **Language:** Structured Text (`.ST`) adhering to IEC 61131-3 standards.
* **System Focus:** Three-Tank Liquid Level Control — auto-fill Tank 1, cascade transfer to Tank 2, drain to Tank 3 with level regulation and valve/pump control.
* **I/O Tag Mapping:**
  * **Inputs:**
    * `E_Stop` (BOOL): Emergency Stop switch (`FALSE` = Emergency State).
    * `LT_Tank1`, `LT_Tank2`, `LT_Tank3` (REAL): Level transmitters scaled 0.0–100.0%.
  * **Outputs:**
    * `P1` (BOOL): Tank 1 inlet fill pump.
    * `V1` (BOOL): Valve 1 transfer solenoid (Tank 1 ➔ Tank 2).
    * `V2` (BOOL): Valve 2 transfer solenoid (Tank 2 ➔ Tank 3).
    * `V3` (BOOL): Valve 3 process outlet drain solenoid.

---

### **2. Control Logic & Simulation Rules (To implement in `.st` and soft-PLC engine)**
1. **Engine Wire-Up:** Ensure the green `RUN PLC` button calls `plcEngine.start()` to launch the cyclic scan loop and `plcEngine.stop()` when stopped.
2. **Auto Control (AUTO):**
   * `P1 := Tank1_Level < 70.0%` (fill Tank 1).
   * `V1 := Tank1_Level > 15.0% AND Tank2_Level < 50.0%` (transfer Tank 1 ➔ Tank 2).
   * `V2 := Tank2_Level > 15.0% AND Tank3_Level < 30.0%` (transfer Tank 2 ➔ Tank 3).
   * `V3 := Tank3_Level > 25.0%` (drain Tank 3).
3. **Hydraulic Simulation:** Include fluid level physics inside `tick()` so liquid columns dynamically rise and fall in response to active pumps and valves.

---

### **3. Detailed Implementation Requirements**
1. **Live Interactive Ladder Diagram (LD) Monitor (`src/components/CodeViewer.tsx`):**
   * Build a live 24V power-flow Ladder Diagram monitor displaying active rungs (`-| |-`, `-( )-`) that glow green/cyan in real time during execution. Include tab toggle to Structured Text (`.ST`).
2. **Step-by-Step Interactive Demo Instructions Panel:** Embed a clear 4-step walkthrough card inside `Visualizer.tsx`.
3. **Dynamic Visualizer (`src/components/Visualizer.tsx`):** Create an interactive P&ID graphic showing liquid height columns for Tank 1, Tank 2, Tank 3, valve states, and pump indicators.
4. **HMI Control Panel (`src/components/ControlPanel.tsx`):** Provide controls for RUN PLC / STOP PLC, AUTO / MANUAL mode toggle, and manual valve/pump override buttons.
5. **Documentation & Build Journal:** Fill `ARCHITECTURE.md`, `PLC_LOGIC.md`, and append `## Logic Implementation — <today's date>` to `journal.md` with `<!-- METRICS:logic -->`.
```
