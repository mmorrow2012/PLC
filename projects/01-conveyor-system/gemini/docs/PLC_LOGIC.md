# PLC Logic Specification & I/O Tag Register Mapping

## 1. Controller Hardware Configuration
* **PAC Hardware:** Schneider Electric Modicon M580 (CPU Module: BMEP582040).
* **Ethernet/IP Remote I/O:** Modicon X80 CRA Module (BMXCRA31210).
* **Programming Standard:** IEC 61131-3 Structured Text (`.ST`).
* **Engineering Software:** EcoStruxure Control Expert (formerly Unity Pro).

## 2. I/O Memory Register Mapping Table

| Tag Name | Variable Type | IEC Address | Signal Logic / Range | Description |
| :--- | :--- | :--- | :--- | :--- |
| `E_Stop` | `BOOL` | `%I0.1.0` | NC (Normally Closed). `TRUE` = Safe, `FALSE` = Emergency Stop | Hardware Emergency Stop Pushbutton |
| `Reset_PB` | `BOOL` | `%I0.1.1` | NO (Normally Open) Pulse | Operator Station Manual Reset Button |
| `Sensor_PartDetect` | `BOOL` | `%I0.1.2` | NO Light Beam. `TRUE` = Item Present | Sorting Station Photoelectric Sensor |
| `Sensor_Color` | `INT` | `%IW0.2.0` | `1` = Red (Reject), `2` = Green, `3` = Blue | Color Inspection Sensor Code |
| `Sensor_Weight` | `REAL` | `%MF0.3.0` | `0.0` to `10.0` kg | Strain Gauge Load Cell Scale |
| `Target_Speed` | `REAL` | `%MF0.3.4` | `0.0` to `100.0` % | Operator Speed Reference Setpoint |
| `VFD_Run` | `BOOL` | `%Q0.1.0` | High = Run Command | Main Motor VFD Run Relay |
| `VFD_Speed_Ref` | `REAL` | `%QF0.2.0` | `0.0` to `100.0` % | Analog Speed Output Reference to Drive |
| `Actuator_Diverter` | `BOOL` | `%Q0.1.1` | High = Extend Solenoid Arm | Pneumatic Reject Diverter Arm |
| `Alarm_Tower` | `DWORD` | `%MW100` | Bit 0: Green, Bit 1: Yellow, Bit 2: Red | Status Beacon Light Stack Bitmask |

## 3. Sorting Rules Matrix

| Color Code | Weight Reading | Diverter Arm (`Actuator_Diverter`) | Alarm Beacon State | Outcome |
| :--- | :--- | :--- | :--- | :--- |
| 1 (Red) | Any Weight | `TRUE` | Yellow + Green (0x03) | Diverted to Reject Lane |
| Any Color | < 0.5 kg (Too Light) | `TRUE` | Yellow + Green (0x03) | Diverted to Reject Lane |
| Any Color | > 5.0 kg (Overweight) | `TRUE` | Yellow + Green (0x03) | Diverted to Reject Lane |
| 2 (Green) | 0.5 kg - 5.0 kg | `FALSE` | Green (0x01) | Passes to Main Outfeed |
| 3 (Blue) | 0.5 kg - 5.0 kg | `FALSE` | Green (0x01) | Passes to Main Outfeed |

## 4. Safety Interlock Sequence
1. **Trip Sequence:** Loss of `E_Stop` (`FALSE`) forces `VFD_Run := FALSE`, `VFD_Speed_Ref := 0.0`, `Actuator_Diverter := FALSE`, and sets `Alarm_Tower := 0x04` (Red Beacon).
2. **Latch Behavior:** Returning `E_Stop` to `TRUE` does **not** auto-restart the line. `System_Fault` remains latched.
3. **Reset Sequence:** The operator must issue a `Reset_PB := TRUE` pulse while `E_Stop` is healthy (`TRUE`) to clear the fault condition and resume operation.
