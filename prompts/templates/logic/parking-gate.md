<!-- GENERATED SOURCE TEMPLATE. Rendered per agent by prompts/generate.mjs. Placeholder: {{AGENT}} -->
```markdown
Now that the project environment is scaffolded in `projects/03-parking-garage-gate-controller/{{AGENT}}/code/`, implement the full domain logic, state management, soft-PLC scan loop, and UI components according to the industrial specifications below.

---

### **1. Target Hardware & PLC System Domain**
* **Hardware & Runtime:** Schneider Electric Modicon M580 running EcoStruxure Control Expert (Unity Pro).
* **Language:** Structured Text (`.ST`) adhering to IEC 61131-3 standards.
* **System Focus:** Parking Garage Gate Controller — vehicle-triggered gate raise/lower, indicator lights, stuck-gate/watchdog detection, and obstruction safety.
* **I/O Tag Mapping:**
  * **Inputs:**
    * `E_Stop` (BOOL): Hardware Emergency Stop switch (Normally Closed / Safety High logic; `FALSE` = Emergency State).
    * `Sensor_VehiclePresence` (BOOL): Inductive loop / photoeye detecting a vehicle at the gate.
    * `Sensor_GateOpenLimit` (BOOL): Limit switch, gate fully open.
    * `Sensor_GateClosedLimit` (BOOL): Limit switch, gate fully closed.
    * `Sensor_Obstruction` (BOOL): Safety photoeye/edge sensor detecting an obstruction in the gate's path.
    * `PB_ManualOpen`, `PB_ManualClose` (BOOL): Operator override pushbuttons.
  * **Outputs:**
    * `Motor_GateUp`, `Motor_GateDown` (BOOL): Gate motor direction contactors (mutually exclusive).
    * `Light_Green`, `Light_Red` (BOOL): Traffic light indicators.
    * `Alarm_StuckGate` (BOOL): Latched watchdog-timeout alarm.
    * `Buzzer` (BOOL): Audible warning during gate movement.
  * **Timing Parameters (internal):**
    * `T_WatchdogTimeout` (TIME): Max allowed time for a full open/close travel before declaring a stuck gate (e.g., `T#8s`).
    * `T_AutoCloseDelay` (TIME): Delay after vehicle clears before auto-closing (e.g., `T#5s`).

---

### **2. Control Logic Rules (To implement in `.st` and soft-PLC engine)**
1. **State Machine:** `IDLE → OPENING → OPEN → CLOSING → CLOSED → IDLE`, driven by `Sensor_VehiclePresence`, limit switches, and the auto-close delay timer.
2. **Vehicle Arrival:** From `IDLE`/`CLOSED`, `Sensor_VehiclePresence = TRUE` transitions to `OPENING` (`Motor_GateUp := TRUE`, `Light_Red := TRUE`, `Buzzer := TRUE`) until `Sensor_GateOpenLimit = TRUE`, then `OPEN` (`Light_Green := TRUE`).
3. **Auto-Close:** In `OPEN`, once `Sensor_VehiclePresence = FALSE` for `T_AutoCloseDelay`, transition to `CLOSING` (`Motor_GateDown := TRUE`, `Light_Red := TRUE`, `Buzzer := TRUE`) until `Sensor_GateClosedLimit = TRUE`, then `CLOSED`/`IDLE`.
4. **Obstruction Safety:** While `CLOSING`, if `Sensor_Obstruction = TRUE`, immediately stop `Motor_GateDown`, set `Motor_GateUp := TRUE`, and re-enter `OPENING`.
5. **Stuck Gate Watchdog:** Start a `TON` timer on entering `OPENING`/`CLOSING`. If the relevant limit switch is not reached before `T_WatchdogTimeout` elapses, stop both motors, latch `Alarm_StuckGate := TRUE`, and require manual acknowledgement (via `PB_ManualOpen`/`PB_ManualClose`) to resume.
6. **Safety Interlock:** Immediately force `Motor_GateUp := FALSE` and `Motor_GateDown := FALSE` upon `E_Stop` loss (`E_Stop = FALSE`). Require an explicit manual reset to resume.

---

### **3. Detailed Implementation Requirements**

1. **Structured Text Logic (`src/plc/parkingGateLogic.st`):**
   * Write production-ready Schneider M580 IEC 61131-3 Structured Text implementing the control rules above, including the watchdog `TON` timers.

2. **Zustand I/O Memory Store (`src/store/usePlcStore.ts`):**
   * Define real-time memory image table holding all input/output tags, timer states, forced override states, and system reset functions.

3. **Soft-PLC Scan Engine (`src/plc/softPlcEngine.ts`):**
   * Build a cyclic execution loop running at ~50ms intervals that reads inputs, executes the state machine and watchdog logic, and updates output tags in the Zustand store.

4. **Dynamic Visualizer (`src/components/Visualizer.tsx`):**
   * Create an interactive SVG dynamic simulation of the gate arm, vehicle sensor, and traffic light.
   * Animate the gate arm rotating/rising during `OPENING`/`CLOSING`, toggle the traffic light colors, pulse the buzzer indicator during movement, and show a red obstruction/stuck-gate overlay when `Alarm_StuckGate` or `Sensor_Obstruction` is active.

5. **Code Viewer (`src/components/CodeViewer.tsx`):**
   * Integrate `@monaco-editor/react` to render `parkingGateLogic.st` with syntax highlighting and read-only execution indicators.

6. **HMI Control Panel (`src/components/ControlPanel.tsx`):**
   * Provide industrial SCADA controls to toggle `E_Stop`, simulate vehicle arrival/departure, simulate an obstruction, and trigger manual open/close/reset actions.

7. **Documentation (`projects/03-parking-garage-gate-controller/{{AGENT}}/docs/`):**
   * Fill `ARCHITECTURE.md` with the scan loop timing and state diagram breakdown.
   * Fill `PLC_LOGIC.md` with the I/O tag register map, watchdog timing values, and Schneider M580 configuration specifics.

8. **Build Journal (`projects/03-parking-garage-gate-controller/{{AGENT}}/docs/journal.md`):**
   * Append a new `## Logic Implementation — <today's date>` section below the existing Scaffold entry (do not overwrite it). Immediately below the heading, add the literal marker `<!-- METRICS:logic -->` on its own line (leave untouched). Follow with a `**Decisions:**` section and a `**Trade-offs / deviations from prompt:**` section documenting the implementation choices actually made.

```
