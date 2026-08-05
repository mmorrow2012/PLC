(*
  Program:      ThreeTankLevelControl
  Target:       Schneider Electric Modicon M580 (EcoStruxure Control Expert / Unity Pro)
  Language:     IEC 61131-3 Structured Text (ST)
  Task:         MAST, cyclic, ~50 ms period (see docs/ARCHITECTURE.md)

  Description:  Three-tank cascade level control. Tank A auto-fills, then
                transfers into Tank B, which gravity-drains into Tank C
                through a proportional valve regulating LT_TankB near
                SP_LevelB_Target. Independent hardwired float switches
                (LSH_TankA/B) back up the analog transmitters for overflow
                protection, and the hardware E-Stop loop is a hard safety
                interlock ahead of the sequencer.

  I/O map:      See docs/PLC_LOGIC.md for the full register/address table.
*)
PROGRAM ThreeTankLevelControl

VAR CONSTANT
    TANK_B_DRAINED_THRESHOLD : REAL := 5.0;   (* LT_TankB at/below this => DRAINING_BC -> IDLE *)
    VALVE_PROPORTIONAL_GAIN  : REAL := 5.0;   (* Kp for the Tank B drain-valve proportional controller *)
END_VAR

VAR
    (* ---- Discrete inputs (physical, see PLC_LOGIC.md for addresses) ---- *)
    E_Stop             : BOOL;   (* NC safety loop; FALSE = emergency state *)
    Start_PB           : BOOL;   (* momentary NO pushbutton *)
    Stop_PB            : BOOL;   (* momentary NO pushbutton *)
    LSH_TankA          : BOOL;   (* hardwired high-level float switch, Tank A *)
    LSH_TankB          : BOOL;   (* hardwired high-level float switch, Tank B *)

    (* ---- Analog inputs, scaled 0.0-100.0% from 4-20 mA ---- *)
    LT_TankA           : REAL;
    LT_TankB           : REAL;
    LT_TankC           : REAL;

    (* ---- Discrete / analog outputs ---- *)
    Pump_Fill_A        : BOOL;
    Pump_Transfer_AB   : BOOL;
    Valve_Drain_BC_Pos : REAL;   (* 0.0-100.0% proportional valve *)
    Alarm_Overflow     : BOOL;   (* latched *)
    Alarm_Tower        : DWORD;  (* Bit0=Green/Run, Bit1=Yellow/Warning, Bit2=Red/Alarm *)

    (* ---- Setpoints (internal, operator-adjustable via HMI) ---- *)
    SP_LevelA_High     : REAL := 80.0;
    SP_LevelB_High     : REAL := 80.0;
    SP_LevelB_Target   : REAL := 50.0;

    (* ---- Sequencer state: 0=IDLE 1=FILLING_A 2=TRANSFERRING_AB 3=DRAINING_BC ---- *)
    State              : INT := 0;

    (* ---- Internal working variables ---- *)
    OverflowCondition  : BOOL;
    EStopTripped       : BOOL;
    Interlocked        : BOOL;
    ValveCmd           : REAL;
END_VAR

(* ============================================================
   1. OVERFLOW PROTECTION
      Evaluated and latched every scan, independent of sequencer state.
   ============================================================ *)
OverflowCondition := (LT_TankA >= 100.0) OR (LT_TankB >= 100.0) OR LSH_TankA OR LSH_TankB;

IF OverflowCondition THEN
    Alarm_Overflow := TRUE;
END_IF;

(* Manual reset: Start_PB acknowledges and clears the latch, but only once
   the field condition that caused it has actually cleared. Reset returns
   the sequencer to IDLE; a subsequent Start_PB press is required to
   re-enter FILLING_A. *)
IF Alarm_Overflow AND Start_PB AND NOT OverflowCondition THEN
    Alarm_Overflow := FALSE;
    State := 0; (* IDLE *)
END_IF;

(* ============================================================
   2. SAFETY INTERLOCK
      E-Stop loss forces IDLE immediately and blocks the sequencer.
   ============================================================ *)
EStopTripped := NOT E_Stop;
IF EStopTripped THEN
    State := 0; (* IDLE *)
END_IF;

Interlocked := EStopTripped OR Alarm_Overflow;

(* ============================================================
   3. SEQUENCER
      Advances only while healthy (no E-Stop trip, no latched overflow
      alarm). Stop_PB aborts to IDLE from any state.
   ============================================================ *)
IF NOT Interlocked THEN
    IF Stop_PB THEN
        State := 0; (* IDLE *)
    ELSE
        CASE State OF
            0: (* IDLE *)
                IF Start_PB THEN
                    State := 1; (* FILLING_A *)
                END_IF;

            1: (* FILLING_A *)
                IF LT_TankA >= SP_LevelA_High THEN
                    State := 2; (* TRANSFERRING_AB *)
                END_IF;

            2: (* TRANSFERRING_AB *)
                IF LT_TankB >= SP_LevelB_High THEN
                    State := 3; (* DRAINING_BC *)
                END_IF;

            3: (* DRAINING_BC *)
                IF LT_TankB <= TANK_B_DRAINED_THRESHOLD THEN
                    State := 0; (* IDLE *)
                END_IF;
        END_CASE;
    END_IF;
END_IF;

(* ============================================================
   4. OUTPUT MAPPING
   ============================================================ *)
Pump_Fill_A        := FALSE;
Pump_Transfer_AB   := FALSE;
Valve_Drain_BC_Pos := 0.0;

IF EStopTripped THEN
    (* Requirement 4: force all pumps FALSE, hold the drain valve fully
       closed while the E-Stop circuit is broken. *)
    Valve_Drain_BC_Pos := 0.0;
ELSIF Alarm_Overflow THEN
    (* Requirement 3: pumps forced off; the gravity drain valve is driven
       fully open as a protective measure, actively relieving Tank B
       toward Tank C while the fault is latched. *)
    Valve_Drain_BC_Pos := 100.0;
ELSE
    CASE State OF
        1: (* FILLING_A *)
            Pump_Fill_A := TRUE;

        2: (* TRANSFERRING_AB *)
            Pump_Transfer_AB := TRUE;
            (* Simple proportional control holding LT_TankB near
               SP_LevelB_Target by modulating the BC drain valve. *)
            ValveCmd := VALVE_PROPORTIONAL_GAIN * (LT_TankB - SP_LevelB_Target);
            Valve_Drain_BC_Pos := MAX(0.0, MIN(100.0, ValveCmd));

        3: (* DRAINING_BC *)
            Valve_Drain_BC_Pos := 100.0;
    END_CASE;
END_IF;

(* ============================================================
   5. TOWER LIGHT STATUS BITMASK
   ============================================================ *)
Alarm_Tower := DWORD#0;
IF (Alarm_Overflow OR EStopTripped) THEN
    Alarm_Tower := Alarm_Tower OR 16#04;   (* Bit 2 - Red / Alarm *)
ELSIF State <> 0 THEN
    Alarm_Tower := Alarm_Tower OR 16#01;   (* Bit 0 - Green / Run *)
ELSE
    Alarm_Tower := Alarm_Tower OR 16#02;   (* Bit 1 - Yellow / Warning (standby) *)
END_IF;

END_PROGRAM
