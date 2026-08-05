# PLC Logic — I/O Register Map & M580 Configuration

## 1. Target Hardware

| Item | Value |
|---|---|
| CPU family | Schneider Electric Modicon M580 (BMEP58•• series) |
| Programming software | EcoStruxure Control Expert (Unity Pro) V15.1+ |
| Program language | Structured Text (ST), IEC 61131-3 |
| Executable POU | `PROGRAM ParkingGateLogic` (`src/plc/parkingGateLogic.st`) |
| Task | `MAST`, periodic, **50 ms** period (see `docs/ARCHITECTURE.md §2`) |
| Redundancy | Not modeled (single, non-redundant CPU assumed) |

`ParkingGateLogic` is intended to be called directly from the `MAST`
task's periodic section. All timers (`TON`) and edge triggers (`R_TRIG`)
are declared as local `VAR` instances so retained state persists correctly
across scans without requiring global data blocks.

## 2. I/O Tag Register Map

### Physical Inputs (`%I`)

| Tag | Type | M580 Channel (example) | Description |
|---|---|---|---|
| `E_Stop` | `BOOL` | `%I0.1.0` (BMXDDI1602 slot 1, ch 0) | Hardware E-Stop circuit, **safety-high logic**: `TRUE` = circuit healthy, `FALSE` = tripped or wiring loss. Wired through a dual-channel safety relay so a broken wire reads `FALSE`, never a stuck `TRUE`. |
| `Sensor_VehiclePresence` | `BOOL` | `%I0.1.1` | Inductive loop / photoeye, vehicle waiting at the gate. |
| `Sensor_GateOpenLimit` | `BOOL` | `%I0.1.2` | Limit switch, gate fully open. |
| `Sensor_GateClosedLimit` | `BOOL` | `%I0.1.3` | Limit switch, gate fully closed. |
| `Sensor_Obstruction` | `BOOL` | `%I0.1.4` | Safety photoeye / pressure-sensitive edge sensor, obstruction in the gate's path. Wired as a safety-rated input, not a standard discrete input, in an as-built installation. |

### Operator Override Pushbuttons

| Tag | Type | Source | Description |
|---|---|---|---|
| `PB_ManualOpen` | `BOOL` | Panel / HMI momentary pushbutton | Manual open override from `IDLE`; also the up-direction stuck-gate/E-Stop acknowledgement jog. |
| `PB_ManualClose` | `BOOL` | Panel / HMI momentary pushbutton | Manual close override from `OPEN`; also the down-direction stuck-gate/E-Stop acknowledgement jog. |

### Physical Outputs (`%Q`)

| Tag | Type | M580 Channel (example) | Description |
|---|---|---|---|
| `Motor_GateUp` | `BOOL` | `%Q0.2.0` (BMXDDO1602) | Gate motor "raise" contactor. Mutually exclusive with `Motor_GateDown` (guarded in section 6 of `parkingGateLogic.st`). |
| `Motor_GateDown` | `BOOL` | `%Q0.2.1` | Gate motor "lower" contactor. Mutually exclusive with `Motor_GateUp`. |
| `Light_Green` | `BOOL` | `%Q0.2.2` | Traffic light — proceed, gate open. |
| `Light_Red` | `BOOL` | `%Q0.2.3` | Traffic light — stop, gate closed or in motion. |
| `Alarm_StuckGate` | `BOOL` | `%Q0.2.4` | Latched watchdog-timeout alarm, drives a panel/HMI beacon. |
| `Buzzer` | `BOOL` | `%Q0.2.5` | Audible warning, energized during `OPENING`/`CLOSING` travel and during stuck-gate jog recovery. |

> Channel addresses above are illustrative examples of a typical BMXDDI/DDO
> module mix on an M580 local rack; the actual slot/channel assignment is
> finalized in the Control Expert hardware configuration editor against the
> as-built I/O rack, not by this document.

### Internal / Retained Program Variables

| Variable | Type | Purpose |
|---|---|---|
| `GateState` | `INT` | Sequencer state: `ST_IDLE`(0) / `ST_OPENING`(1) / `ST_OPEN`(2) / `ST_CLOSING`(3) / `ST_CLOSED`(4). |
| `EStopFaultLatched` | `BOOL` | Latched safety fault, cleared only by a valid manual acknowledgement. |
| `Trig_EStopReset` | `R_TRIG` | Rising-edge detector on `PB_ManualOpen OR PB_ManualClose`, gates the E-Stop fault reset. |
| `Trig_ManualOpen`, `Trig_ManualClose` | `R_TRIG` | Rising-edge detectors for the manual override transitions (`IDLE→OPENING`, `OPEN→CLOSING`). |
| `Tmr_AutoClose` | `TON` | Auto-close dwell timer, `IN := (GateState = ST_OPEN) AND NOT Sensor_VehiclePresence`. |
| `Tmr_WatchdogOpen` | `TON` | Stuck-gate guard for `OPENING`, `IN := (GateState = ST_OPENING)`. |
| `Tmr_WatchdogClose` | `TON` | Stuck-gate guard for `CLOSING`, `IN := (GateState = ST_CLOSING)`. |

## 3. Tunable Constants

| Constant | Value | Meaning |
|---|---|---|
| `T_WatchdogTimeout` | `T#8s` | Max allowed travel time (either direction) before declaring a stuck gate. |
| `T_AutoCloseDelay` | `T#5s` | Delay after the vehicle clears before auto-closing. |
| `ST_IDLE` / `ST_OPENING` / `ST_OPEN` / `ST_CLOSING` / `ST_CLOSED` | `0`/`1`/`2`/`3`/`4` | `GateState` enumeration codes. |

These are declared as initialized `VAR` (not `VAR CONSTANT`) in
`parkingGateLogic.st` so a commissioning engineer can force/adjust them
from Control Expert's animation tables without a source download, then
promote the tuned values back into the source before final release.

## 4. Control Rule Cross-Reference

| Prompt requirement | Implementation |
|---|---|
| `IDLE → OPENING` on vehicle arrival, `Motor_GateUp`/`Light_Red`/`Buzzer` on, until `Sensor_GateOpenLimit`, then `OPEN` with `Light_Green` | `ParkingGateLogic` section 3, `ST_IDLE`/`ST_OPENING` case branches |
| `OPEN` auto-closes after `T_AutoCloseDelay` once the vehicle clears | `Tmr_AutoClose` (section 2), gates the `ST_OPEN → ST_CLOSING` transition (section 3) |
| Obstruction during `CLOSING` reverses to `OPENING` | `ST_CLOSING` case branch, `IF Sensor_Obstruction THEN ... GateState := ST_OPENING` |
| Watchdog `TON` on `OPENING`/`CLOSING`; timeout stops both motors, latches `Alarm_StuckGate`, requires manual acknowledgement | `Tmr_WatchdogOpen`/`Tmr_WatchdogClose` (section 2) + section 4 (latch) + section 5 (manual jog recovery, gated on `PB_ManualOpen`/`PB_ManualClose` held while `E_Stop` healthy) |
| `E_Stop` loss forces `Motor_GateUp`/`Motor_GateDown` off immediately; explicit manual reset required | Section 1 (`EStopFaultLatched` set the instant `E_Stop = FALSE`, `Trig_EStopReset` gated on `E_Stop` healthy to clear it) and section 7 (absolute, last-word enforcement every scan) |

## 5. Alarm & Annunciation Behavior

* `Alarm_StuckGate` is level-latched (not edge-triggered) — once set, it
  remains `TRUE` across scans regardless of `GateState` until explicitly
  cleared by the section 5 manual-jog recovery path.
* `Light_Red`/`Light_Green` are fully recomputed every scan from the
  current `GateState` (and forced to `Light_Red := TRUE` / `Light_Green :=
  FALSE` whenever `Alarm_StuckGate` or the E-Stop fault is active), so the
  signal always reflects the current scan's state rather than a stale
  history — the same "recompute, don't accumulate" annunciation pattern
  used for `Alarm_Tower` in the sibling `01-conveyor-system` project.
* `Buzzer` is `TRUE` during `OPENING`/`CLOSING` travel and during an
  active stuck-gate manual jog, and is forced `FALSE` by both the
  watchdog latch (section 4) and the final safety enforcement (section 7)
  so it never sounds while the motors are held off.
