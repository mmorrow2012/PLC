# PLC Logic — Three-Tank Liquid Level Control

## Target Configuration (Modicon M580 / EcoStruxure Control Expert)

Assumed rack layout for this demonstrator (local rack 1):

| Slot | Module | Purpose |
|---|---|---|
| 0 | BMEP58 CPU | MAST task, 50 ms cyclic period |
| 1 | BMENOC0301 (Ethernet) | Engineering / SCADA connectivity |
| 2 | BMXDDI1602 (16 pt DI, 24VDC) | Discrete inputs — E_Stop, Start_PB, Stop_PB, LSH_TankA, LSH_TankB |
| 3 | BMXAMI0410 (4 ch AI, 4-20mA) | Analog inputs — LT_TankA, LT_TankB, LT_TankC |
| 4 | BMXDDO1602 (16 pt DO, 24VDC) | Discrete outputs — Pump_Fill_A, Pump_Transfer_AB, Alarm_Overflow |
| 5 | BMXAMO0210 (2 ch AO, 4-20mA / 0-10V) | Analog outputs — Valve_Drain_BC_Pos, Alarm_Tower |

`E_Stop` is wired NC (normally closed) through the hardware safety loop, so
loss of continuity (contact opens, wire break, or E-Stop pressed) reads
`FALSE` at the module — "safety high" logic. This input should also be
hardwired to the M580's Safety-related I/O / master control relay in a real
installation, in addition to being scanned by this program for annunciation
and controlled shutdown.

## I/O Register Map

| Tag | Type | Address (example) | Direction | Description |
|---|---|---|---|---|
| `E_Stop` | BOOL | %IX1.2.0 | Input | NC safety loop; `FALSE` = emergency state |
| `Start_PB` | BOOL | %IX1.2.1 | Input | Momentary NO start pushbutton |
| `Stop_PB` | BOOL | %IX1.2.2 | Input | Momentary NO stop pushbutton |
| `LSH_TankA` | BOOL | %IX1.2.3 | Input | Hardwired high-level float switch, Tank A (independent of `LT_TankA`) |
| `LSH_TankB` | BOOL | %IX1.2.4 | Input | Hardwired high-level float switch, Tank B (independent of `LT_TankB`) |
| `LT_TankA` | REAL | %IW1.3.0 | Input | Tank A level, scaled 0.0–100.0% from 4-20mA |
| `LT_TankB` | REAL | %IW1.3.1 | Input | Tank B level, scaled 0.0–100.0% from 4-20mA |
| `LT_TankC` | REAL | %IW1.3.2 | Input | Tank C level, scaled 0.0–100.0% from 4-20mA |
| `Pump_Fill_A` | BOOL | %QX1.4.0 | Output | Inlet fill pump/valve, supplies Tank A |
| `Pump_Transfer_AB` | BOOL | %QX1.4.1 | Output | Transfer pump, Tank A → Tank B |
| `Alarm_Overflow` | BOOL | %QX1.4.2 | Output | Latched overflow alarm |
| `Valve_Drain_BC_Pos` | REAL | %QW1.5.0 | Output | Proportional gravity-drain valve, Tank B → Tank C, 0.0–100.0% |
| `Alarm_Tower` | DWORD | %QW1.5.1 | Output | Bitmask beacon: Bit0=Green/Run, Bit1=Yellow/Warning, Bit2=Red/Alarm |

Addresses above follow the `%<type><rack>.<slot>.<point>` convention typical
of a Control Expert local-rack configuration and are illustrative for this
portfolio piece; a real project would derive them from the actual hardware
catalog / I/O configuration editor.

## Setpoints (internal, `VAR` block in `threeTankLogic.st`)

| Tag | Default | Description |
|---|---|---|
| `SP_LevelA_High` | 80.0% | Tank A fill cutoff — `FILLING_A → TRANSFERRING_AB` |
| `SP_LevelB_High` | 80.0% | Tank B transfer cutoff — `TRANSFERRING_AB → DRAINING_BC` |
| `SP_LevelB_Target` | 50.0% | Cascade target level for Tank B during `TRANSFERRING_AB` |
| `TANK_B_DRAINED_THRESHOLD` (constant) | 5.0% | Tank B considered empty — `DRAINING_BC → IDLE` |
| `VALVE_PROPORTIONAL_GAIN` (constant) | 5.0 | Kp for the Tank B drain-valve proportional controller |

`TANK_B_DRAINED_THRESHOLD` and `VALVE_PROPORTIONAL_GAIN` are not named in
the original I/O list — they are internal tuning constants required to make
the `DRAINING_BC → IDLE` transition and the proportional controller
concrete. See `journal.md` for the reasoning.

## State Machine

`State` (`INT`, 0–3) drives the sequencer:

| Value | Name | Pump_Fill_A | Pump_Transfer_AB | Valve_Drain_BC_Pos |
|---|---|---|---|---|
| 0 | `IDLE` | FALSE | FALSE | 0.0% |
| 1 | `FILLING_A` | TRUE | FALSE | 0.0% |
| 2 | `TRANSFERRING_AB` | FALSE | TRUE | `Kp * (LT_TankB - SP_LevelB_Target)`, clamped 0–100% |
| 3 | `DRAINING_BC` | FALSE | FALSE | 100.0% |

Transitions:

- `IDLE → FILLING_A`: `Start_PB` pressed (system healthy).
- `FILLING_A → TRANSFERRING_AB`: `LT_TankA >= SP_LevelA_High`.
- `TRANSFERRING_AB → DRAINING_BC`: `LT_TankB >= SP_LevelB_High`.
- `DRAINING_BC → IDLE`: `LT_TankB <= TANK_B_DRAINED_THRESHOLD`.
- Any state `→ IDLE`: `Stop_PB` pressed (healthy operator abort).

## Interlocks (evaluated every scan, ahead of the sequencer)

### Overflow Protection

Trip condition: `LT_TankA >= 100.0 OR LT_TankB >= 100.0 OR LSH_TankA OR LSH_TankB`.

On trip: `Pump_Fill_A := FALSE`, `Pump_Transfer_AB := FALSE`,
`Alarm_Overflow := TRUE` (latched). The BC drain valve is driven to
**100% open** while the alarm is latched — a deliberate protective
interpretation (see `journal.md`): the prompt only specifies forcing the two
pumps off, and leaving the gravity-drain valve fully open is the safe
action that actively relieves Tank B toward Tank C rather than leaving the
system static.

Reset: requires the trip condition to have cleared **and** a `Start_PB`
press. Reset returns `State := IDLE`; a further `Start_PB` press is needed
to resume `FILLING_A`.

### Safety Interlock (E-Stop)

Trip condition: `E_Stop = FALSE`.

On trip, every scan: `Pump_Fill_A := FALSE`, `Pump_Transfer_AB := FALSE`,
`Valve_Drain_BC_Pos := 0.0`, `State := IDLE`. Unlike the overflow alarm,
there is no separate latch bit — the interlock is purely a function of the
live `E_Stop` input. "Manual reset to resume" is satisfied by the fact that
the sequencer sits in `IDLE` and requires an explicit `Start_PB` press to
re-enter `FILLING_A`, exactly like a normal stopped state; it will not
auto-resume when `E_Stop` returns to `TRUE`.

## Tower Light (`Alarm_Tower`, DWORD bitmask)

| Bit | Color | Condition |
|---|---|---|
| 0 | Green / Run | `State <> IDLE` and no active interlock |
| 1 | Yellow / Warning | `State = IDLE` and no active interlock (standby, ready) |
| 2 | Red / Alarm | `Alarm_Overflow = TRUE` or `E_Stop = FALSE` |

Only one bit is set at a time in the current logic (red takes priority over
green/yellow); the field is a `DWORD` bitmask rather than an enum so
additional status bits can be added later without breaking the interface.
