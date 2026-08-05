# PLC Logic — I/O Register Map & M580 Configuration

## 1. Target Hardware

| Item | Value |
|---|---|
| CPU family | Schneider Electric Modicon M580 (BMEP58•• series) |
| Programming software | EcoStruxure Control Expert (Unity Pro) V15.1+ |
| Program language | Structured Text (ST), IEC 61131-3 |
| Executable POU | `PROGRAM ConveyorLogic` (`src/plc/conveyorLogic.st`) |
| Task | `MAST`, periodic, **50 ms** period (see `docs/ARCHITECTURE.md §2`) |
| Redundancy | Not modeled (single, non-redundant CPU assumed) |

`ConveyorLogic` is intended to be called directly from the `MAST` task's
periodic section. All timers (`TON`) and edge triggers (`R_TRIG`) are
declared as local `VAR` instances so retained state persists correctly
across scans without requiring global data blocks.

## 2. I/O Tag Register Map

### Physical Inputs (`%I`)

| Tag | Type | M580 Channel (example) | Description |
|---|---|---|---|
| `E_Stop` | `BOOL` | `%I0.1.0` (BMXDDI1602 slot 1, ch 0) | Hardware E-Stop circuit, **safety-high logic**: `TRUE` = circuit healthy, `FALSE` = tripped or wiring loss. Wired through a dual-channel safety relay so a broken wire reads `FALSE`, never a stuck `TRUE`. |
| `Sensor_PartDetect` | `BOOL` | `%I0.1.1` | Photoelectric proximity sensor, part present at sort station. |
| `Sensor_Color` | `INT` | `%IW0.2.0` (BMXAMI0410 analog-to-discrete via smart sensor, or fieldbus INT tag) | Color classifier output: `1` = Reject/Red, `2` = Accept/Green, `3` = Special/Blue. |
| `Sensor_Weight` | `REAL` | `%IW0.2.1` | Load cell amplifier output, engineering units = kilograms, scaled in the analog module's channel configuration. |

### Operator / HMI Command Inputs

| Tag | Type | Source | Description |
|---|---|---|---|
| `Cmd_Start` | `BOOL` | HMI / panel pushbutton | Momentary Start request. |
| `Cmd_Stop` | `BOOL` | HMI / panel pushbutton | Momentary Stop request. |
| `Cmd_ManualReset` | `BOOL` | HMI / panel pushbutton | Momentary fault-reset request; only accepted while `E_Stop = TRUE`. |
| `Speed_Setpoint` | `REAL` | HMI slider | Operator commanded line speed, `0.0`–`100.0` %. |

### Physical Outputs (`%Q`)

| Tag | Type | M580 Channel (example) | Description |
|---|---|---|---|
| `VFD_Run` | `BOOL` | `%Q0.3.0` (BMXDDO1602) | Run command to the conveyor VFD, hardwired/fieldbus-interlocked so the drive cannot run without this bit. |
| `VFD_Speed_Ref` | `REAL` | `%QW0.4.0` (BMXAMO0210, or EtherNet/IP speed reference to the drive) | Motor speed reference, `0.0`–`100.0` % of rated speed. |
| `Actuator_Diverter` | `BOOL` | `%Q0.3.1` | Solenoid arm actuator, routes reject/out-of-spec parts off the main lane. |
| `Alarm_Tower` | `DWORD` | `%QD0.5.0` (fieldbus/bit-mapped beacon, or 3x discrete outputs packed into one tag) | Stack-light bitmask: Bit 0 = Green/Run, Bit 1 = Yellow/Warning, Bit 2 = Red/Alarm. |

> Channel addresses above are illustrative examples of a typical BMXDDI/DDO/AMI/AMO
> module mix on an M580 local rack; the actual slot/channel assignment is
> finalized in the Control Expert hardware configuration editor against the
> as-built I/O rack, not by this document.

### Internal / Retained Program Variables

| Variable | Type | Purpose |
|---|---|---|
| `EStopFaultLatched` | `BOOL` | Latched safety fault, cleared only by a valid manual reset. |
| `SystemReady` | `BOOL` | `E_Stop AND NOT EStopFaultLatched` — gates Start. |
| `RejectLatched` | `BOOL` | Sort decision for the part currently between the sensor and the diverter. |
| `RampedSpeed` | `REAL` | Soft-start ramped value written to `VFD_Speed_Ref`. |
| `Trig_Reset`, `Trig_PartDetect` | `R_TRIG` | Rising-edge detectors for the reset pushbutton and the part-present sensor. |
| `Tmr_DiverterDwell` | `TON` | Diverter solenoid energization dwell timer. |
| `Tmr_SpeedRamp` | `TON` | Soft-start ramp timer, `IN := VFD_Run`. |

## 3. Tunable Constants

| Constant | Value | Meaning |
|---|---|---|
| `WEIGHT_MIN_KG` | `0.20` | Underweight reject threshold. |
| `WEIGHT_MAX_KG` | `5.00` | Overweight reject threshold. |
| `COLOR_REJECT` / `COLOR_ACCEPT` / `COLOR_SPECIAL` | `1` / `2` / `3` | `Sensor_Color` classification codes. |
| `DIVERTER_DWELL_TIME` | `T#750ms` | How long `Actuator_Diverter` stays energized per rejected part. |
| `SPEED_RAMP_TIME` | `T#2s0ms` | Soft-start ramp duration to reach `Speed_Setpoint`. |

These are declared as initialized `VAR` (not `VAR CONSTANT`) in
`conveyorLogic.st` so a commissioning engineer can force/adjust them from
Control Expert's animation tables without a source download, then promote
the tuned values back into the source before final release.

## 4. Alarm_Tower Bit Mask

| Bit | Mask (hex) | Color | Set when |
|---|---|---|---|
| 0 | `16#01` | Green | `VFD_Run = TRUE` |
| 1 | `16#02` | Yellow | `SystemReady = TRUE` and `VFD_Run = FALSE` (ready, idle) |
| 2 | `16#04` | Red | `EStopFaultLatched = TRUE` or `E_Stop = FALSE` |

Bits are independent and evaluated every scan (not latched individually —
`Alarm_Tower` is fully recomputed from `DWORD#0` each cycle), so the
beacon always reflects the current scan's state rather than a stale
history.

## 5. Control Rule Cross-Reference

| Prompt requirement | Implementation |
|---|---|
| Force `VFD_Run := FALSE` immediately on `E_Stop` loss | Rung block 1, unconditional `IF NOT E_Stop THEN EStopFaultLatched := TRUE;` evaluated before the Start/Stop seal-in, and `IF ... OR NOT SystemReady THEN VFD_Run := FALSE;` |
| Require explicit manual reset to resume | `Trig_Reset` (`R_TRIG` on `Cmd_ManualReset`) gated by `E_Stop` being currently healthy |
| Evaluate `Sensor_Color` / `Sensor_Weight` on part presence | `Trig_PartDetect` (`R_TRIG` on `Sensor_PartDetect`) latches `RejectLatched` |
| Actuate `Actuator_Diverter` for reject/out-of-spec parts | `RejectLatched` energizes `Tmr_DiverterDwell`, which drives `Actuator_Diverter` for a fixed dwell |
| Adjust `VFD_Speed_Ref` based on throughput/state | Soft-start ramp from 0% to `Speed_Setpoint` while `VFD_Run = TRUE`, else 0% |
