# PLC Domain Logic & Tag Mapping Specification

## 1. Modicon M580 I/O Register Tag Mapping

### Digital Inputs (%I)
| Tag Name | Modicon Address | Type | Logic Type | Description |
|---|---|---|---|---|
| `E_Stop` | `%I0.1.0` | BOOL | NC (Normally Closed) | Hardware Emergency Stop Button (1 = Safe, 0 = E-Stop Active) |
| `Sensor_VehiclePresence` | `%I0.1.1` | BOOL | NO (Normally Open) | Inductive loop / photoeye detecting vehicle at gate |
| `Sensor_GateOpenLimit` | `%I0.1.2` | BOOL | NO | Limit switch triggered when gate is 100% fully open |
| `Sensor_GateClosedLimit` | `%I0.1.3` | BOOL | NO | Limit switch triggered when gate is 100% fully closed |
| `Sensor_Obstruction` | `%I0.1.4` | BOOL | NO | Safety optical beam / safety edge sensing obstruction |
| `PB_ManualOpen` | `%I0.1.5` | BOOL | NO | Operator HMI / physical pushbutton to manually open gate |
| `PB_ManualClose` | `%I0.1.6` | BOOL | NO | Operator HMI / physical pushbutton to manually close gate |
| `PB_Reset` | `%I0.1.7` | BOOL | NO | Operator fault acknowledgment pushbutton |

### Digital Outputs (%Q)
| Tag Name | Modicon Address | Type | Description |
|---|---|---|---| 
| `Motor_GateUp` | `%Q0.2.0` | BOOL | Contactor output to raise barrier gate arm |
| `Motor_GateDown` | `%Q0.2.1` | BOOL | Contactor output to lower barrier gate arm |
| `Light_Green` | `%Q0.2.2` | BOOL | Green traffic signal light (Proceed) |
| `Light_Red` | `%Q0.2.3` | BOOL | Red traffic signal light (Stop) |
| `Alarm_StuckGate` | `%Q0.2.4` | BOOL | Latched warning indicator for watchdog timeout |
| `Buzzer` | `%Q0.2.5` | BOOL | Audible warning sounder active during movement |

---

## 2. Timing Parameters

* **`T_WatchdogTimeout`**: Set to `T#8s` (8000 milliseconds). Maximum allowable travel time for gate movement between limit switches.
* **`T_AutoCloseDelay`**: Set to `T#5s` (5000 milliseconds). Delay time after vehicle departs inductive loop before auto-closing.

---

## 3. EcoStruxure Control Expert (Unity Pro) Configuration Notes

1. **Task Type:** Periodic Master Task (MAST) running at 50ms interval.
2. **Motor Mutually Exclusive Protection:** Logic guarantees `Motor_GateUp` and `Motor_GateDown` are never driven `TRUE` simultaneously.
3. **Fail-Safe Behavior:** Unhandled states or loss of hardware enable automatically transition output contactors to `FALSE` (fail-safe close/de-energize).
