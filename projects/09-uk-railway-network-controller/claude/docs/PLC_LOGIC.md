# PLC Logic — UK Intercity Railway Network & Block Signalling Controller

Controller: **Siemens S7-1500F / Schneider Modicon M580 Safety (SIL4)**
Task: `MAST`, cyclic, **50 ms**, watchdog 150 ms
Source of record: [`src/plc/railwayLogic.st`](../code/src/plc/railwayLogic.st)
Executable port: [`src/plc/railwayLogic.ts`](../code/src/plc/railwayLogic.ts)

---

## 1. Hardware I/O list

### 1.1 Digital inputs (`%IX`)

| Address | Symbol | Type | Description | Wiring |
| --- | --- | --- | --- | --- |
| `%I0.0` | `I_EStop_NC` | BOOL | Master railway emergency signal trip switch | **NC**, 24 VDC, fail-safe (broken wire = trip) |
| `%I0.1` | `I_MasterRun_PB` | BOOL | Master timetable network service run pushbutton | NO, momentary, alternate-action in software |
| `%I0.2` | `I_ResetFault_PB` | BOOL | Signal & interlock alarm reset pushbutton | NO, momentary |
| `%I0.3` | `I_AxleCounter_London` | BOOL | Track-circuit block occupancy — London Terminal | Axle-counter head, TRUE = occupied |
| `%I0.4` | `I_AxleCounter_Brum` | BOOL | Track-circuit block occupancy — Birmingham New Street | Axle-counter head |
| `%I0.5` | `I_AxleCounter_Manchester` | BOOL | Track-circuit block occupancy — Manchester Piccadilly | Axle-counter head |
| `%I0.6` | `I_AxleCounter_Edinburgh` | BOOL | Track-circuit block occupancy — Edinburgh Waverley | Axle-counter head |
| `%I0.7` | `I_PointSwitch_Normal` | BOOL | Motorised switch point alignment limit switch (main line) | **NC** detection; TRUE = switch rails closed **and locked** in the commanded lie |

> `%I0.7` proves *correspondence*, not simply the normal lie. It drops out while
> the machine drives over and re-proves once the rails are locked in whichever
> position was commanded. Losing it for longer than the 4 s watchdog is a
> signalling failure, which is what makes it a valid trip condition without
> making the point toggle itself unusable.

### 1.2 Analog inputs (`%IW`)

| Address | Symbol | Type | Range | Description |
| --- | --- | --- | --- | --- |
| `%IW100` | `AI_TractionSpeed_Intercity1` | REAL | 0.0 – 220.0 km/h | Actual speed, Intercity Express 1 (`1S47`) |
| `%IW102` | `AI_TractionSpeed_Intercity2` | REAL | 0.0 – 220.0 km/h | Actual speed, Intercity Express 2 (`1E23`) |
| `%IW104` | `AI_TrackCurvature_Limit` | REAL | 0.0 – 200.0 km/h | ATP track-curvature speed-limit telegram for the lead service |

The trailing service's ATP ceiling is read out of the same static permanent-way
speed table held in `FB_SpeedSupervision` (`_ATP_Limit_T2` on the LD monitor).

### 1.3 Digital outputs (`%QX`)

| Address | Symbol | Type | Description | Protected block |
| --- | --- | --- | --- | --- |
| `%Q0.0` | `Q_Signal_London_Green` | BOOL | Green aspect — London departure block | `SEC_LON_COV` |
| `%Q0.1` | `Q_Signal_Brum_Green` | BOOL | Green aspect — Birmingham hub block | `BLK_BHM` |
| `%Q0.2` | `Q_Signal_Manchester_Green` | BOOL | Green aspect — Manchester hub block | `BLK_MAN` |
| `%Q0.3` | `Q_Signal_Scotland_Green` | BOOL | Green aspect — Glasgow/Edinburgh border block | `BLK_GLA` |
| `%Q0.4` | `Q_PointMotor_AlignMain` | BOOL | Point machine contactor — main track (normal lie) | Birmingham North Jn |
| `%Q0.5` | `Q_PointMotor_AlignBranch` | BOOL | Point machine contactor — branch line (reverse lie) | Birmingham North Jn |
| `%Q0.6` | `Q_PlatformBuzzer` | BOOL | Station platform boarding chime / warning horn | — |
| `%Q0.7` | `Q_MasterSafetyRelay` | BOOL | Traction current third-rail / catenary power relay | Network wide |

### 1.4 Analog outputs (`%QW`)

| Address | Symbol | Type | Range | Description |
| --- | --- | --- | --- | --- |
| `%QW100` | `AQ_VFD_TractionSpeed1` | REAL | 0 – 100 % | Traction motor VFD speed reference, Train 1 |
| `%QW102` | `AQ_VFD_TractionSpeed2` | REAL | 0 – 100 % | Traction motor VFD speed reference, Train 2 |

100 % of full scale corresponds to 220 km/h. The reference is slew-limited to
**+0.55 % / −1.80 % per scan** so the demand never steps.

---

## 2. Internal memory allocation

| Address | Symbol | Type | Description |
| --- | --- | --- | --- |
| `%MW0` | `M_NetworkState` | INT | 0 = STOPPED, 1 = SCHEDULED_RUN, 2 = EXPRESS_SERVICE, 99 = SIGNAL_FAULT |
| `%MW2` | `M_TargetSpeed_Train1` | REAL | Operator VFD target speed setpoint, Train 1 (0 – 200 km/h) |
| `%MW4` | `M_TargetSpeed_Train2` | REAL | Operator VFD target speed setpoint, Train 2 (0 – 200 km/h) |
| `%MW6` | `M_ActiveBlockCount` | INT | Occupied block count across the UK network |
| `%MW8` | `M_PermittedSpeed_Train1` | REAL | Solved movement authority, Train 1 (km/h) |
| `%MW9` | `M_PermittedSpeed_Train2` | REAL | Solved movement authority, Train 2 (km/h) |
| `%MW10` – `%MW50` | `M_TimetableTable` | ARRAY [0..7] OF `ST_DepartureRegister` | Departure & arrival register table (see §2.1) |
| `%MW60` | `M_ClockSeconds` | DINT | Network clock, seconds since midnight |
| `%MW70` | `M_WorstDelayMin` | INT | Worst tracked-service delay currently on the network |
| `%M10.0` | `M_NetworkRun` | BOOL | Timetable service run latch |
| `%M10.1` | `M_SafetyTrip` | BOOL | Retentive SIL4 trip latch |
| `%M10.2` | `M_AlarmActive` | BOOL | Audible/visual alarm active |
| `%M10.3` | `M_PointDetectFault` | BOOL | Point detection watchdog expired |
| `%M10.4` | `M_PointReverseCmd` | BOOL | Accepted (route-locked) reverse request |
| `%M10.5` | `M_BrakeDemand_Train1` | BOOL | Brake demand raised by the block interlock |
| `%M10.6` | `M_BrakeDemand_Train2` | BOOL | Brake demand raised by the block interlock |
| `%MD64` | `M_PointDetectTimerMs` | DINT | Detection watchdog accumulator (ms) |
| `%MD68` | `M_BuzzerTimerS` | DINT | Boarding chime one-shot timer (s) |

### 2.1 Timetable register frame (5 words per entry)

| Offset | Word | Meaning |
| --- | --- | --- |
| `+0` | `StationIndex` | Index into the 9-station table |
| `+1` | `ScheduledMin` | Booked time, minutes since midnight |
| `+2` | `ExpectedMin` | Live estimate, minutes since midnight |
| `+3` | `Platform` | Platform allocation |
| `+4` | `StatusCode` | 0 = ON TIME, 1 = BOARDING, 2 = DEPARTED, 3 = DELAYED, 4 = ARRIVED, 5 = CANCELLED |

Eight frames are published at `%MW10`, `%MW15`, `%MW20` … `%MW45`, occupying
`%MW10` – `%MW50`. Tracked services are packed first, then the nearest
background departures.

---

## 3. Track block table

Nineteen axle-counter blocks: one per station throat and one per running
section.

| Block | Kind | Length | Line speed | Successors |
| --- | --- | --- | --- | --- |
| `BLK_LON` | Station — London Euston | 2 km | 60 km/h | `SEC_LON_COV` |
| `SEC_LON_COV` | Section | 152 km | 200 km/h | `BLK_COV` |
| `BLK_COV` | Station — Coventry | 2 km | 60 km/h | `SEC_COV_BHM` |
| `SEC_COV_BHM` | Section | 30 km | 145 km/h | `BLK_BHM` |
| `BLK_BHM` | Station — Birmingham New Street | 2 km | 60 km/h | `SEC_BHM_MAN`, `SEC_BHM_LIV`, `SEC_BHM_LEE` |
| `SEC_BHM_MAN` | Section (main) | 138 km | 175 km/h | `BLK_MAN` |
| `SEC_BHM_LIV` | Section (branch) | 158 km | 160 km/h | `BLK_LIV` |
| `BLK_LIV` | Station — Liverpool Lime Street | 2 km | 60 km/h | `SEC_LIV_MAN` |
| `SEC_LIV_MAN` | Section | 55 km | 120 km/h | `BLK_MAN` |
| `BLK_MAN` | Station — Manchester Piccadilly | 2 km | 60 km/h | `SEC_MAN_GLA` |
| `SEC_MAN_GLA` | Section | 341 km | 200 km/h | `BLK_GLA` |
| `BLK_GLA` | Station — Glasgow Central | 2 km | 60 km/h | `SEC_GLA_EDI` |
| `SEC_GLA_EDI` | Section | 75 km | 130 km/h | `BLK_EDI` |
| `BLK_BRS` | Station — Bristol Temple Meads | 2 km | 60 km/h | `SEC_BRS_BHM` |
| `SEC_BRS_BHM` | Section | 143 km | 180 km/h | `BLK_BHM` |
| `SEC_BHM_LEE` | Section | 190 km | 160 km/h | `BLK_LEE` |
| `BLK_LEE` | Station — Leeds City | 2 km | 60 km/h | `SEC_LEE_EDI` |
| `SEC_LEE_EDI` | Section | 330 km | 195 km/h | `BLK_EDI` |
| `BLK_EDI` | Station — Edinburgh Waverley | 2 km | 60 km/h | terminus |

---

## 4. Function blocks

### 4.1 `FB_SafetyInterlock` — SIL4, solved first

```
Trip condition  :=  NOT I_EStop_NC  OR  PointDetectFault
PointDetectFault:=  TON(IN := NOT I_PointSwitch_Normal, PT := T#4s).Q

IF TripCondition   THEN M_SafetyTrip := TRUE;
ELSIF I_ResetFault_PB THEN M_SafetyTrip := FALSE; END_IF;

Q_MasterSafetyRelay := M_NetworkRun AND NOT M_SafetyTrip;
```

* Set-dominant, retentive latch — survives a warm restart.
* The reset only takes effect with every trip condition already healthy, so
  hammering `%I0.2` with the mushroom still depressed achieves nothing.
* Dropping `%Q0.7` isolates the catenary, which applies the emergency brake
  (3.2 km/h·s) to both services regardless of the VFD references.
* A trip also clears `M_NetworkRun`, so recovery is deliberately two-handed:
  release the mushroom → RESET → START SERVICE.

### 4.2 `FB_TrackBlockInterlock` — absolute block working

Aspect solver, evaluated for every one of the 19 blocks:

| Condition | Aspect | Movement authority |
| --- | --- | --- |
| Safety trip, or the network is not running | **RED** | 0 km/h |
| Own block occupied | **RED** | braking curve to 0 at the block joint |
| Own block clear, any successor occupied | **YELLOW** | 90 km/h, reducing to 40 km/h inside 30 km |
| Successors clear, any second-order successor occupied | **DOUBLE YELLOW** | min(line speed, 145 km/h) |
| Otherwise | **GREEN** | full line speed |

The four hard-wired heads (`%I0.3` – `%I0.6`) overwrite the corresponding
entries of the remote evaluator image, so a stale telegram cannot mask a failed
counter — and so forcing an axle counter from the HMI really does put the
protecting signal back to danger.

Brake demand for a service is raised when the aspect protecting its next block
is at danger and it is either standing at a platform or within the 14 km
braking distance. The plant additionally refuses to let a train pass a block
joint into an occupied block, which is the overlap protection.

Coils:

```
Q_Signal_London_Green     := aspect(SEC_LON_COV) = GREEN
Q_Signal_Brum_Green       := aspect(BLK_BHM)     = GREEN
Q_Signal_Manchester_Green := aspect(BLK_MAN)     = GREEN
Q_Signal_Scotland_Green   := aspect(BLK_GLA)     = GREEN
M_ActiveBlockCount        := Σ occupied blocks              (→ %MW6)
```

### 4.3 `FB_SpeedSupervision` — VFD traction modulation

```
v_permitted := MIN( setpoint      %MW2 / %MW4,
                    line speed    (165 km/h SCHEDULED, 200 km/h EXPRESS),
                    ATP limit     %IW104 / track database,
                    block line speed,
                    movement authority from the aspect ahead )

authority(RED)           := (distance_to_joint / 14 km) × line_speed   → 0 at the joint
authority(YELLOW)        := 90 km/h, or 40 km/h inside 30 km
authority(DOUBLE YELLOW) := MIN(line_speed, 145 km/h)
authority(GREEN)         := line_speed

demand_pct := v_permitted / 220 × 100
%QW := slew(demand_pct, +0.55 %/scan, −1.80 %/scan)   — 0 % if %Q0.7 is dropped
```

Traction dynamics in the plant: +0.62 km/h·s accelerating, −1.25 km/h·s on the
service brake, −3.2 km/h·s on the emergency brake.

### 4.4 `FB_TimetableManager`

* Advances `%MW60` by the scan period × 120 (demo time compression).
* Alternate-action run selector on the rising edge of `%I0.1`; forced FALSE by
  a safety trip.
* Operating-state machine:

| Condition (evaluated in order) | `%MW0` |
| --- | --- |
| `M_SafetyTrip` | 99 SIGNAL_FAULT |
| NOT `M_NetworkRun` | 0 STOPPED |
| Express service requested | 2 EXPRESS_SERVICE |
| Otherwise | 1 SCHEDULED_RUN |

* Grades each tracked service against its booked plan (150 km/h planning speed,
  6 min booked dwell) and publishes the delay in `%MW70`. Delay is measured
  against **booked mileage**, so a diversion via the Liverpool branch — extra
  distance plus an unbooked call — correctly appears as lateness rather than
  being absorbed.
* Status badge per call: `DEPARTED` / `ARRIVED` once passed, `BOARDING` while
  standing at the platform, `DELAYED` at ≥ 5 minutes down or while `%MW0 = 99`,
  otherwise `ON TIME`.
* `%Q0.6` sounds for the last 60 simulated seconds of every station dwell.
* `EXPRESS_SERVICE` raises the line-speed ceiling to 200 km/h and cuts the dwell
  from 6 minutes to 2 minutes 30.

### 4.5 `FB_PointMachine` — Birmingham North Junction

```
IF NOT M_SafetyTrip AND JunctionClear THEN
    M_PointReverseCmd := HMI_PointReverseRequest;      (* route locking *)
END_IF;

Q_PointMotor_AlignMain   := NOT M_PointReverseCmd AND NOT %I0.7 AND NOT M_SafetyTrip;
Q_PointMotor_AlignBranch :=     M_PointReverseCmd AND NOT %I0.7 AND NOT M_SafetyTrip;
```

* `JunctionClear` is `NOT G_BlockOccupied[BLK_BHM]` — a set route can never be
  pulled from under a train.
* The contactors drop as soon as detection re-proves in the commanded lie
  (≈ 2.4 s swing time).
* A train standing at Birmingham may not depart until detection is proved.

---

## 5. Ladder / FBD networks

| Network | Title | Coils |
| --- | --- | --- |
| 1 | `FB_SafetyInterlock` (SIL4) | `M_SafetyTrip` (S/R), `Q_MasterSafetyRelay`, `M_PointDetectFault` |
| 2 | `FB_TrackBlockInterlock` | `%Q0.0` – `%Q0.3`, `M_ActiveBlockCount`, brake demands |
| 3 | `FB_SpeedSupervision` | `%QW100`, `%QW102`, ATP overspeed flags |
| 4 | `FB_TimetableManager` | `M_NetworkRun`, `%Q0.6`, `%MW0`, delay alarm |
| 5 | Point machine & route locking | `%Q0.4`, `%Q0.5`, `M_PointReverseCmd` |

Every contact, comparison box, function-block body and coil in the monitor is
evaluated live against the process image each refresh, so power flow, element
conduction and coil state animate exactly as they do in TIA Portal's online
program view.

---

## 6. Commissioning scenarios

| # | Action | Expected result |
| --- | --- | --- |
| 1 | Press **START SERVICE** (`%I0.1`) | `%M10.0` latches, `%Q0.7` picks up, aspects step to green, `1S47` departs London at its booked 08:05 |
| 2 | Drag the Train 1 slider to 200 km/h | `%MW2 = 200`, `%QW100` ramps up, but the block line speed and `%IW104` still cap the train (e.g. 145 km/h on Coventry–Birmingham) |
| 3 | Force `%I0.4` (Birmingham axle counter) to `1` | `%Q0.1` drops, the Birmingham aspect goes red, the approaching service brakes on the ATP curve and stands at the block joint showing **HELD AT SIGNAL** |
| 4 | Request the branch route while `%I0.4` is forced | Request refused — route locking holds `M_PointReverseCmd` until the junction block clears |
| 5 | Clear the force, then toggle the point | `%Q0.5` picks up, `%I0.7` drops for ~2.4 s then re-proves, `1S47` diverts via Liverpool and the PIS boards flip to `DELAYED` |
| 6 | Force `%I0.7` to `0` and wait 4 s | Detection watchdog expires, `M_PointDetectFault`, `%MW0 = 99`, all aspects at danger |
| 7 | Press **E-STOP** (`%I0.0` opens) | `%MW0 = 99`, `%Q0.7` drops, both services emergency brake to standstill |
| 8 | Release the mushroom, press **RESET** (`%I0.2`) | Trip unlatches to `%MW0 = 0`; a second press of **START SERVICE** is required to resume |
| 9 | Enable **EXPRESS** | `%MW0 = 2`, line-speed ceiling 200 km/h, dwells cut to 2 min 30 |
| 10 | Enable **STATION STOP OVERRIDE** on Train 2 | `1E23` runs non-stop through its booked calls; the boards show the calls as passed |
