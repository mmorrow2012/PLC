# PLC Logic — Municipal Wastewater Treatment & Multi-Basin Aeration Control

Target: **Schneider Electric Modicon M580**, EcoStruxure Control Expert (Unity Pro).
Languages: **IEC 61131-3 Function Block Diagram (FBD) + Ladder Diagram (LD)**, with the
program body written as **Structured Text** in [`../code/src/plc/wastewaterLogic.st`](../code/src/plc/wastewaterLogic.st).
Task: **MAST, cyclic, 50 ms period, 250 ms watchdog.**

The executable model in the browser (`../code/src/plc/wastewaterLogic.ts`) is a
section-for-section port of the ST source — same numbering, same rung order — so the
two files can be diffed against each other.

---

## 1. Memory Allocation Table

### 1.1 Digital Inputs (`%IX` / `%I`) — 24 VDC sinking input card

| Address | Symbol | Type | Description |
| --- | --- | --- | --- |
| `%I0.0` | `I_EStop_NC` | BOOL | Master hardware Emergency Stop, **Normally Closed**. `TRUE` = chain healthy. |
| `%I0.1` | `I_PlantStart_PB` | BOOL | Plant master run pushbutton (momentary). |
| `%I0.2` | `I_PlantStop_PB` | BOOL | Plant master stop pushbutton (momentary). |
| `%I0.3` | `I_ResetFault_PB` | BOOL | Alarm reset & fault acknowledgment (momentary). |
| `%I0.4` | `I_LSH_Equalization` | BOOL | High-High level float guard — equalization basin (flooding interlock). |
| `%I0.5` | `I_LSH_AerationA` | BOOL | High level float guard — aeration basin A. |
| `%I0.6` | `I_LSH_AerationB` | BOOL | High level float guard — aeration basin B. |
| `%I0.7` | `I_WeirOpenLS` | BOOL | Motorised effluent weir gate **fully open** limit switch. |

### 1.2 Analog Inputs (`%IW`) — 4-20 mA scaled to engineering units

| Address | Symbol | Type | Range | Description |
| --- | --- | --- | --- | --- |
| `%IW100` | `AI_LT_EqBasin` | REAL | 0.0 – 10.0 m | Ultrasonic level transmitter, equalization basin. |
| `%IW102` | `AI_LT_AerationA` | REAL | 0.0 – 6.0 m | Level transmitter, aeration basin A. |
| `%IW104` | `AI_LT_AerationB` | REAL | 0.0 – 6.0 m | Level transmitter, aeration basin B. |
| `%IW106` | `AI_DO_AerationA` | REAL | 0.0 – 10.0 mg/L | Dissolved oxygen probe, basin A. |
| `%IW108` | `AI_Turbidity_Effluent` | REAL | 0.0 – 100.0 NTU | Turbidity sensor, effluent discharge. |

### 1.3 Digital Outputs (`%QX` / `%Q`) — relay/contactor card

| Address | Symbol | Type | Description |
| --- | --- | --- | --- |
| `%Q0.0` | `Q_Pump_RawInfluent1` | BOOL | Influent pump 1 duty contactor. |
| `%Q0.1` | `Q_Pump_RawInfluent2` | BOOL | Influent pump 2 lag contactor. |
| `%Q0.2` | `Q_Blower_AerationA` | BOOL | Aeration basin A diffuser blower motor. |
| `%Q0.3` | `Q_Blower_AerationB` | BOOL | Aeration basin B diffuser blower motor. |
| `%Q0.4` | `Q_Pump_RAS` | BOOL | Return Activated Sludge recirculation pump. |
| `%Q0.5` | `Q_Pump_Coagulant` | BOOL | Chemical coagulant polymer dosing pump. |
| `%Q0.6` | `Q_Motor_WeirOpen` | BOOL | Motorised sluice weir gate OPEN contactor. |
| `%Q0.7` | `Q_Motor_WeirClose` | BOOL | Motorised sluice weir gate CLOSE contactor. |

### 1.4 Analog Outputs (`%QW`) — engineering units scaled to 4-20 mA

| Address | Symbol | Type | Range | Description |
| --- | --- | --- | --- | --- |
| `%QW100` | `AQ_VFD_InfluentSpeed` | REAL | 0 – 100 % | Influent pump VFD speed reference. |
| `%QW102` | `AQ_AirValve_Aeration` | REAL | 0 – 100 % | Aeration air flow control valve position. |

### 1.5 Internal Memory Words (`%MW`)

| Address | Symbol | Type | Default | Description |
| --- | --- | --- | --- | --- |
| `%MW0` | `M_PlantState` | INT | 0 | Operating state — see §2. |
| `%MW2` | `M_TargetDO` | REAL | 2.5 | Dissolved oxygen target setpoint (mg/L). |
| `%MW4` | `M_MaxTurbidity` | REAL | 15.0 | Max allowed effluent turbidity for discharge (NTU). |
| `%MW6` | `M_LeadPumpToggle` | INT | 1 | Lead-lag duty rotation (1 = pump 1 lead, 2 = pump 2 lead). |

### 1.6 Internal Bits (`%M`)

| Address | Symbol | Description |
| --- | --- | --- |
| `%M10` | `M_PlantRun` | Master run seal-in latch. |
| `%M11` | `M_SafetyTrip` | Safety interlock trip latch (retentive). |
| `%M12` | `M_AlarmActive` | Alarm beacon / horn. |
| `%M13` | `M_LeadPumpCall` | Duty (lead) influent pump call. |
| `%M14` | `M_LagPumpCall` | Standby (lag) influent pump call. |
| `%M15` | `M_BlowerCallA` | Basin A digestion air demand. |
| `%M16` | `M_BlowerCallB` | Basin B digestion air demand. |
| `%M17` | `M_WeirOpenCmd` | AUTO discharge permit latch. |
| `%M18` | `M_WeirClosedLS` | Derived gate-closed flag (see §6.4). |

---

## 2. Operating State Machine (`%MW0`)

| Value | State | Meaning |
| --- | --- | --- |
| 0 | `OFF` | Plant stopped, all drives de-energised, weir gate closed. |
| 1 | `EQUALIZING` | Raw influent buffered; lead/lag pumps under level control. |
| 2 | `AERATION_ACTIVE` | Biological digestion; blowers modulating to the DO setpoint. |
| 3 | `CLARIFYING` | Secondary clarification and coagulant dosing. |
| 4 | `EFFLUENT_DISCHARGE` | Effluent inside consent; weir gate open, discharging. |
| 99 | `ALARM` | Safety interlock latched; outputs inhibited, gate driven closed. |

```
        ┌──────────────── I_PlantStop_PB ────────────────┐
        │                                                │
        ▼                                                │
   ┌─────────┐  start PB   ┌──────────────┐  A ≥ 2.0 m  ┌──────────────────┐
   │ 0 OFF   │────────────▶│ 1 EQUALIZING │────────────▶│ 2 AERATION_ACTIVE│
   └─────────┘             └──────────────┘             └──────────────────┘
        ▲                         ▲   ▲                          │
        │                         │   └───── A < 2.0 m ──────────┤
        │                         │                              │ DO held ≥ SP for 8 s
        │              clarifier  │                              ▼
        │              < 1.4 m    │                    ┌──────────────────┐
        │                         └────────────────────│  3 CLARIFYING    │
        │                                              └──────────────────┘
        │                                                        │ clarifier ≥ 2.6 m
   reset PB                                                      │ AND NTU < %MW4
        │                                                        ▼
   ┌─────────┐                                        ┌────────────────────────┐
   │ 99 ALARM│◀───── any trip condition ──────────────│ 4 EFFLUENT_DISCHARGE   │
   └─────────┘        (from every state)              └────────────────────────┘
```

A trip is **stop dominant**: it drops `M_PlantRun`, so acknowledging the alarm returns
the plant to `OFF` and the operator must press START again. This is deliberate — an
unattended auto-restart after a flooding or consent-breach trip is not acceptable.

---

## 3. Function Blocks

Execution order in the MAST task is fixed and safety-first. Each network below maps
1:1 onto a network in the live LD/FBD monitor in the app.

### 3.1 `FB_SafetyInterlock` — Network 1 (scanned first)

| Pin | Dir | Source |
| --- | --- | --- |
| `EStopHealthy` | IN | `%I0.0` |
| `FloatHH_Eq` | IN | `%I0.4` |
| `Turbidity` | IN | `%IW108` |
| `ResetPB` | IN | `%I0.3` |
| `Trip` | OUT | `%M11` |
| `AlarmActive` | OUT | `%M12` |
| `AlarmCode` | OUT | first-out trip code |
| `ForceWeirShut` | OUT | to `FB_WeirGateControl` |

Trips on **any** of:

* `I_EStop_NC = FALSE` — hardware E-Stop chain broken (code 1)
* `I_LSH_Equalization = TRUE` — basin flooding (code 2)
* `AI_Turbidity_Effluent > 25.0 NTU` — discharge consent breach (code 3)

While tripped, every actuator is de-energised (§7) **and the weir gate is actively
driven closed** so out-of-spec effluent cannot reach the watercourse. The latch is
retentive: it clears only on a **rising edge** of `%I0.3` *and* only once every trip
condition has physically cleared — pressing reset while the cause is still present
does nothing.

`AlarmCode` is a **first-out** indication: the reason captured is the one that was
true at the instant the latch set, so a cascading second fault does not mask the
root cause.

### 3.2 `FB_LeadLagPump` — Network 3

| Setpoint | Value | Behaviour |
| --- | --- | --- |
| `EQ_LEAD_START_M` | 3.0 m | Start LEAD influent pump. |
| `EQ_LAG_START_M` | 6.0 m | Start LAG influent pump, VFD reference → 100 %. |
| `EQ_LAG_STOP_M` | 4.5 m | LAG pump drops out (hysteresis). |
| `EQ_ALL_STOP_M` | 1.0 m | Both pumps drop out; **duty rotates**. |

VFD reference (`%QW100`):

* lead only → linear **40 % … 85 %** across the 3.0 – 6.0 m band
* lead + lag → **100 %**
* no call → **0 %**

The reference is **rate limited to 45 %/s** rather than stepped, emulating the drive's
commissioned accel/decel ramp.

**Duty rotation** flips `%MW6` on the *falling* edge of the pump call (basin emptied
below 1.0 m), or immediately on an HMI swap request. Note that a safety trip also
drops the call and therefore rotates the duty — intentional, since the standby pump
should take the next start after an abnormal shutdown.

**Permissive:** `M_PlantRun AND NOT M_SafetyTrip AND NOT %I0.5 AND NOT %I0.6`. Either
aeration high-level float inhibits influent pumping — you must not push more flow into
a basin that is already about to overflow.

### 3.3 `FB_AerationDO` — Network 4

Compares `%IW106` against `%MW2` and modulates `%QW102`:

```
err      := M_TargetDO - AI_DO_AerationA
integral := CLAMP(integral + KI · err · dt, ±60)          KI = 8 %/mg/L/s
valve    := CLAMP(15 + KP · err + integral, 15 … 100)     KP = 30 %/mg/L
```

Blower call uses a **symmetric ±0.25 mg/L deadband** around the setpoint so probe
noise cannot chatter the motor contactors. Basin B trails basin A off the shared
air header.

**Dry-run interlock:** a blower is hard-blocked below `2.0 m` of basin level —
running fine-bubble diffusers in air destroys the membranes. The high-level floats
(`%I0.5` / `%I0.6`) also force their blower off.

**Batch complete:** when DO is held at or above setpoint continuously for **8 s**, the
digestion batch is marked done and the state machine advances to `CLARIFYING`.

### 3.4 `FB_WeirGateControl` — Network 6

Discharge permit (`%M17`) requires **both** conditions:

```
OPEN   : clarifier ≥ 2.6 m  AND  AI_Turbidity_Effluent < M_MaxTurbidity
CLOSE  : clarifier <  1.4 m  OR   AI_Turbidity_Effluent ≥ M_MaxTurbidity
         OR ForceShut (safety trip)
```

Effluent quality has **veto power** — a clarifier that is full but dirty stays shut and
lets the coagulant dosing bring turbidity back down.

`%Q0.6` and `%Q0.7` are **hard mutually exclusive** (rung 6.3); energising both would
short a reversing starter. MANUAL mode allows jogging the gate from the HMI, but a
safety trip overrides MANUAL and drives the gate closed regardless.

**Derived closed position (rung 6.4):** the field I/O list provides only `%I0.7`
(fully open). The closed position is therefore derived from a **4 s travel timer** on
the CLOSE contactor — the standard approach when a gate has a single limit switch and
a torque/travel timeout in the other direction.

### 3.5 Network 5 — RAS and coagulant dosing (plain LD rungs)

```
Q_Pump_RAS       := M_PlantRun AND NOT M_SafetyTrip AND (%MW0 ≥ 2)
                    AND clarifier > 0.6 m AND AI_LT_AerationA < 5.5 m

Q_Pump_Coagulant := M_PlantRun AND NOT M_SafetyTrip AND (%MW0 ≥ 3)
                    AND AI_Turbidity_Effluent > (M_MaxTurbidity × 0.6)
```

Dosing starts at **60 % of the consent limit**, well before the weir gate would be
held shut, so the plant corrects quality proactively rather than reactively.

---

## 4. Section 7 — Final Safety Enforcement

The last rung of every scan re-asserts the de-energised state, so no earlier rung can
leave a drive energised through a trip:

```
IF M_SafetyTrip OR NOT M_PlantRun THEN
    Q_Pump_RawInfluent1 := FALSE;   Q_Pump_RawInfluent2 := FALSE;
    Q_Blower_AerationA  := FALSE;   Q_Blower_AerationB  := FALSE;
    Q_Pump_RAS          := FALSE;   Q_Pump_Coagulant    := FALSE;
    AQ_VFD_InfluentSpeed := 0.0;    AQ_AirValve_Aeration := 0.0;
END_IF;
```

The weir contactors are deliberately **excluded** — the gate must still be able to
drive closed while the trip is latched.

---

## 5. Deviations from the specification

* **No secondary clarifier level transmitter exists in the prompt's I/O table**, yet
  `FB_WeirGateControl` is specified to open when "water in secondary clarifier reaches
  discharge level". Rather than invent an unrequested `%IW` address, the level is
  passed into the control program as a named process value
  (`ProcessContext.clarifierLevel`) sourced from the plant model. On real hardware
  this would be one more 4-20 mA channel.
* **No closed limit switch** for the weir gate — derived from a travel timer (§3.4).
* **`I_LSH_AerationA` / `I_LSH_AerationB` are treated as inhibits, not trips.** Only
  the equalization basin's High-**High** guard (`%I0.4`) is listed by the spec as the
  flooding interlock, so the aeration floats instead block influent pumping and force
  their blower off. This keeps a single high float on one basin from shutting the
  whole works down.
* **HMI command tags** (`Cmd_WeirManualMode`, `Cmd_WeirJogOpen`, `Cmd_WeirJogClose`,
  `Cmd_SwapLeadPump`) are unlocated SCADA soft buttons, not field I/O.
* **Pump-stop and lag-drop-out levels (1.0 m / 4.5 m)** are not given by the spec; they
  are the hysteresis bands needed to stop the contactors chattering at the 3.0 m and
  6.0 m start points.
