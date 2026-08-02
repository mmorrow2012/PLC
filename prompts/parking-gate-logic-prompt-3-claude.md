<!-- GENERATED FILE: do not edit directly. Source: prompts/templates/logic/parking-gate.md + prompts/manifest.json. Regenerate with: node prompts/generate.mjs -->
```markdown
Now that the project environment is scaffolded in `projects/03-parking-garage-gate-controller/claude/code/`, implement the full domain logic, state management, soft-PLC scan loop, and UI components according to the industrial specifications below.

---

### **1. Target Hardware & PLC System Domain**
* **Hardware & Runtime:** Schneider Electric Modicon M580 running EcoStruxure Control Expert (Unity Pro).
* **Language:** Structured Text (`.ST`) adhering to IEC 61131-3 standards.
* **System Focus:** Parking Garage Gate Controller — dual-lane independent entry and exit barrier gate control, UK English terminology, ticket dispenser kiosk, traffic lights, and photocell safety.
* **Terminology Standard:** Use UK English terminology throughout (e.g. `car`, `vehicle`, `entry lane`, `exit lane`, `kiosk`, `ticket machine`). Do not use terms like "sedan".
* **I/O Tag Mapping:**
  * **Inputs:**
    * `I_EntryLoop` (BOOL): Inductive loop detecting a vehicle at the top entry lane.
    * `I_TicketButton` (BOOL): Kiosk ticket request pushbutton.
    * `I_TicketTaken` (BOOL): Ticket dispenser sensor indicating driver has removed ticket.
    * `I_EntryGateOpenLS`, `I_EntryGateCloseLS` (BOOL): Independent limit switches for the entry barrier gate arm.
    * `I_ExitLoop` (BOOL): Inductive loop detecting an exiting vehicle at the bottom exit lane.
    * `I_ExitGateOpenLS`, `I_ExitGateCloseLS` (BOOL): Independent limit switches for the exit barrier gate arm.
    * `I_SafetyPhotocell` (BOOL): Infrared safety beam across driveway detecting obstacles.
  * **Outputs:**
    * `Q_EntryMotorOpen`, `Q_EntryMotorClose` (BOOL): Entry barrier motor contactors.
    * `Q_ExitMotorOpen`, `Q_ExitMotorClose` (BOOL): Exit barrier motor contactors.
    * `Q_DispenseTicket` (BOOL): Kiosk ticket dispenser solenoid.
    * `Q_EntryGreenLight`, `Q_EntryRedLight` (BOOL): Entry traffic signal LED indicators.
    * `Q_ExitGreenLight`, `Q_ExitRedLight` (BOOL): Exit traffic signal LED indicators.
    * `Q_Alarm` (BOOL): Obstacle anti-crush alarm.

---

### **2. Control Logic Rules (To implement in `.st` and soft-PLC engine)**
1. **Independent Dual-Lane Operation:** Entry Barrier and Exit Barrier operate completely independently. Top lane is Entry (Left ➔ Right into garage); Bottom lane is Exit (Right ➔ Left out to street).
2. **Vehicle Entry Flow:** `I_EntryLoop = TRUE` ➔ driver presses `I_TicketButton` ➔ `Q_DispenseTicket = TRUE`. Driver takes ticket (`I_TicketTaken = TRUE`) ➔ `Q_EntryMotorOpen` raises Entry Barrier to 100% OPEN (`I_EntryGateOpenLS = TRUE`) and sets `Q_EntryGreenLight = TRUE`.
3. **Vehicle Passage & Auto-Close:** As car drives through into garage, clear `I_EntryLoop` and `I_TicketTaken`. Once car clears, `Q_EntryMotorClose` lowers Entry Barrier back to 0% CLOSED (`I_EntryGateCloseLS = TRUE`).
4. **Vehicle Exit Flow:** `I_ExitLoop = TRUE` ➔ `Q_ExitMotorOpen` automatically raises Exit Barrier to 100% OPEN (`I_ExitGateOpenLS = TRUE`) and sets `Q_ExitGreenLight = TRUE`. As car exits to street and clears `I_ExitLoop`, `Q_ExitMotorClose` lowers Exit Barrier back to 0% CLOSED (`I_ExitGateCloseLS = TRUE`).
5. **Safety Photocell:** If `I_SafetyPhotocell = TRUE` while either barrier is lowering, immediately stop closing and reverse motor direction to re-open barrier.

---

### **3. Detailed Implementation Requirements**
1. **2D SCADA Visual Orientation:** In 2D top-down view:
   * **`CLOSED` (0% Open)**: Barrier arm is oriented **90° PERPENDICULAR ACROSS THE LANE** (physically blocking traffic).
   * **`OPEN` (100% Open)**: Barrier arm rotates to **0° FLUSH ALONG MEDIAN CURB** (leaving lane 100% clear).
2. **1-Click Auto Vehicle Simulators:** Include `🚗 ENTRY CAR` (Cyan hatchback) and `🏎️ EXIT CAR` (Orange estate car) 1-click sequence simulation buttons in the Visualizer.
3. **Live Interactive Ladder Diagram (LD) Monitor (`src/components/CodeViewer.tsx`):**
   * Build a live 24V power-flow Ladder Diagram monitor with active rungs for contacts (`-| |-`, `-|/|-`) and output coils (`-( )-`) that glow green/cyan in real time during execution. Include tab toggle to view Structured Text (`.ST`).
4. **Step-by-Step Interactive Demo Instructions Panel:** Embed a clear 4-step walkthrough card inside `Visualizer.tsx`.
5. **HMI Control Panel (`src/components/ControlPanel.tsx`):** Provide buttons for `Entry Loop`, `Press Ticket PB`, `TAKE TICKET 🎟️`, `Exit Loop`, `Safety Photocell`, and limit switch indicators.
6. **Documentation (`projects/03-parking-garage-gate-controller/claude/docs/`):** Fill `ARCHITECTURE.md` and `PLC_LOGIC.md`.
7. **Build Journal (`projects/03-parking-garage-gate-controller/claude/docs/journal.md`):** Append `## Logic Implementation — <today's date>` entry with `<!-- METRICS:logic -->`.
```
