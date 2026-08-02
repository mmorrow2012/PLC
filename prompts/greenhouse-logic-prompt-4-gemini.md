```markdown
Now that the project environment is scaffolded in `projects/04-greenhouse-climate-control/gemini/code/`, implement the full domain logic, state management, soft-PLC scan loop, and UI components according to the industrial specifications below.

---

### **1. Target Hardware & PLC System Domain**
* **Hardware & Runtime:** Schneider Electric Modicon M580 running EcoStruxure Control Expert (Unity Pro).
* **Language:** Structured Text (`.ST`) adhering to IEC 61131-3 standards.
* **System Focus:** Greenhouse Climate Control — temperature/humidity monitoring, automatic louver venting, misting, heating, and daily scheduling.
* **I/O Tag Mapping:**
  * **Inputs:**
    * `E_Stop` (BOOL): Hardware Emergency Stop switch (Normally Closed / Safety High logic; `FALSE` = Emergency State).
    * `AI_Temp` (REAL): Analog temperature sensor, scaled °C.
    * `AI_Humidity` (REAL): Analog humidity sensor, scaled %RH.
    * `AI_LightLevel` (REAL): Analog light sensor, scaled % of full daylight.
    * `AI_SoilMoisture` (REAL): Analog soil moisture sensor, scaled %.
    * `RTC_HourOfDay` (INT): Real-time-clock hour value (0–23) used for day/night scheduling.
  * **Outputs:**
    * `Louver_Pos` (REAL): Proportional louver actuator position, 0.0 (closed) to 100.0 (fully open).
    * `Pump_Mist` (BOOL): Misting solenoid.
    * `Relay_Heater` (BOOL): Heater relay.
    * `Alarm_Tower` (DWORD): Bitmask status beacon (Bit 0 = Green/Normal, Bit 1 = Yellow/Warning, Bit 2 = Red/Alarm).
  * **Setpoints (internal):**
    * `SP_TempHigh`, `SP_TempLow` (REAL): Day/night temperature band, e.g. `28.0` / `18.0`.
    * `SP_HumidityLow` (REAL): Minimum humidity before misting, e.g. `40.0`.
    * `Deadband_Temp` (REAL): Hysteresis deadband for heater switching, e.g. `1.0`.
    * `DayStartHour`, `DayEndHour` (INT): Scheduling window for misting/venting, e.g. `6` / `20`.

---

### **2. Control Logic Rules (To implement in `.st` and soft-PLC engine)**
1. **Hysteresis Heating:** Turn `Relay_Heater := TRUE` when `AI_Temp < (SP_TempLow - Deadband_Temp)`; turn it `FALSE` when `AI_Temp > (SP_TempLow + Deadband_Temp)`. Heater is disabled outright whenever `AI_Temp >= SP_TempHigh`.
2. **Proportional Venting:** Scale `Louver_Pos` proportionally from `0.0` at `SP_TempHigh` up to `100.0` at `SP_TempHigh + 5.0`°C; fully close (`Louver_Pos := 0.0`) below `SP_TempHigh`.
3. **Misting Schedule:** Run `Pump_Mist := TRUE` only when `AI_Humidity < SP_HumidityLow` AND `RTC_HourOfDay` is within `[DayStartHour, DayEndHour)`; otherwise `FALSE`.
4. **Safety Interlock:** Immediately force `Relay_Heater := FALSE`, `Pump_Mist := FALSE`, and `Louver_Pos := 100.0` (fail-safe vented open) upon `E_Stop` loss (`E_Stop = FALSE`). Require an explicit manual reset action to resume normal control.

---

### **3. Detailed Implementation Requirements**

1. **Structured Text Logic (`src/plc/greenhouseLogic.st`):**
   * Write production-ready Schneider M580 IEC 61131-3 Structured Text implementing the control rules above, including the hysteresis and proportional scaling math.

2. **Zustand I/O Memory Store (`src/store/usePlcStore.ts`):**
   * Define real-time memory image table holding all input/output tags, setpoints, forced override states, and system reset functions.

3. **Soft-PLC Scan Engine (`src/plc/softPlcEngine.ts`):**
   * Build a cyclic execution loop running at ~50ms intervals that reads inputs, executes the hysteresis/scheduling/proportional-venting logic, and updates output tags in the Zustand store.

4. **Dynamic Visualizer (`src/components/Visualizer.tsx`):**
   * Create an interactive SVG dynamic simulation of the greenhouse: louver angle reflecting `Louver_Pos`, mist particle effect when `Pump_Mist = TRUE`, heater glow when `Relay_Heater = TRUE`, and a day/night background tied to `RTC_HourOfDay`.

5. **Code Viewer (`src/components/CodeViewer.tsx`):**
   * Integrate `@monaco-editor/react` to render `greenhouseLogic.st` with syntax highlighting and read-only execution indicators.

6. **HMI Control Panel (`src/components/ControlPanel.tsx`):**
   * Provide industrial SCADA controls to toggle `E_Stop`, manually drive `AI_Temp`/`AI_Humidity`/`RTC_HourOfDay` for testing, and adjust setpoints.

7. **Documentation (`projects/04-greenhouse-climate-control/gemini/docs/`):**
   * Fill `ARCHITECTURE.md` with the scan loop timing and state diagram breakdown.
   * Fill `PLC_LOGIC.md` with the I/O tag register map, setpoints, and Schneider M580 configuration specifics.

```
