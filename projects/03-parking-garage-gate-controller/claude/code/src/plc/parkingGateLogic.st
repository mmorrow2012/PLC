(*
  ============================================================================
  POU:          ParkingGateLogic (PROGRAM)
  PROJECT:      Parking Garage Gate Controller - Vehicle Access & Safety
  TARGET:       Schneider Electric Modicon M580 (BMEP58 CPU family)
  IDE:          EcoStruxure Control Expert (Unity Pro) V15.1+
  LANGUAGE:     Structured Text (ST) - IEC 61131-3
  TASK:         MAST, periodic, recommended period 50ms (see ARCHITECTURE.md)
  ============================================================================
  FUNCTIONAL SUMMARY
  ------------------------------------------------------------------------
  1) Safety Interlock    - E_Stop loss immediately drops both gate motor
                            outputs and latches a fault that can only be
                            cleared by an explicit operator acknowledgement
                            (rising edge on either manual pushbutton) while
                            the E-Stop circuit is healthy.
  2) Gate Sequencer       - GateState walks IDLE -> OPENING -> OPEN ->
                            CLOSING -> CLOSED -> IDLE, driven by the vehicle
                            presence sensor, the open/closed limit switches,
                            and the auto-close delay timer. PB_ManualOpen /
                            PB_ManualClose act as operator override pushbuttons
                            that can also drive the sequence directly.
  3) Obstruction Safety   - While CLOSING, an active obstruction sensor
                            immediately reverses the gate (stops
                            Motor_GateDown, drives Motor_GateUp) and returns
                            the sequencer to OPENING.
  4) Stuck Gate Watchdog  - Independent TON timers guard the OPENING and
                            CLOSING travel times. If the relevant limit
                            switch is not reached before T_WatchdogTimeout
                            elapses, both motors are stopped and
                            Alarm_StuckGate is latched, requiring a manual
                            pushbutton acknowledgement/jog to recover.
  ============================================================================
*)
PROGRAM ParkingGateLogic
VAR
    (* ------------------------------------------------------------------ *)
    (* Physical inputs - %I memory mapped                                 *)
    (* ------------------------------------------------------------------ *)
    E_Stop                  : BOOL := TRUE;  (* Safety-high: TRUE = circuit healthy, FALSE = E-Stop tripped/loss of signal *)
    Sensor_VehiclePresence  : BOOL;          (* Inductive loop / photoeye - vehicle waiting at the gate *)
    Sensor_GateOpenLimit    : BOOL;          (* Limit switch - gate fully open *)
    Sensor_GateClosedLimit  : BOOL := TRUE;  (* Limit switch - gate fully closed *)
    Sensor_Obstruction      : BOOL;          (* Safety photoeye / edge sensor - obstruction in the gate's path *)

    (* ------------------------------------------------------------------ *)
    (* Operator override pushbuttons - momentary, panel or HMI mounted     *)
    (* ------------------------------------------------------------------ *)
    PB_ManualOpen           : BOOL;    (* Manual open override / stuck-gate & E-Stop acknowledgement (up direction) *)
    PB_ManualClose          : BOOL;    (* Manual close override / stuck-gate & E-Stop acknowledgement (down direction) *)

    (* ------------------------------------------------------------------ *)
    (* Physical outputs - %Q memory mapped                                *)
    (* ------------------------------------------------------------------ *)
    Motor_GateUp            : BOOL;    (* Gate motor "raise" contactor - mutually exclusive with Motor_GateDown *)
    Motor_GateDown          : BOOL;    (* Gate motor "lower" contactor - mutually exclusive with Motor_GateUp *)
    Light_Green             : BOOL;    (* Traffic light - proceed, gate open *)
    Light_Red               : BOOL := TRUE; (* Traffic light - stop, gate closed or in motion *)
    Alarm_StuckGate         : BOOL;    (* Latched watchdog-timeout alarm *)
    Buzzer                  : BOOL;    (* Audible warning during gate movement *)

    (* ------------------------------------------------------------------ *)
    (* Internal state - retained between scans                            *)
    (* ------------------------------------------------------------------ *)
    GateState               : INT := 0; (* ST_IDLE .. ST_CLOSED, see constants below *)
    EStopFaultLatched        : BOOL;

    Trig_EStopReset         : R_TRIG;   (* Rising edge on either manual PB, accepted only while E_Stop is healthy *)
    Trig_ManualOpen         : R_TRIG;   (* Rising edge on PB_ManualOpen - manual override to OPENING from IDLE/CLOSED *)
    Trig_ManualClose        : R_TRIG;   (* Rising edge on PB_ManualClose - manual override to CLOSING from OPEN *)

    Tmr_AutoClose           : TON;      (* Auto-close dwell once OPEN and the vehicle has cleared *)
    Tmr_WatchdogOpen        : TON;      (* Stuck-gate guard for the OPENING travel *)
    Tmr_WatchdogClose       : TON;      (* Stuck-gate guard for the CLOSING travel *)

    (* ------------------------------------------------------------------ *)
    (* Tunable timing constants                                           *)
    (* ------------------------------------------------------------------ *)
    T_WatchdogTimeout       : TIME := T#8s; (* Max allowed travel time before declaring a stuck gate *)
    T_AutoCloseDelay        : TIME := T#5s; (* Delay after vehicle clears before auto-closing *)

    (* ------------------------------------------------------------------ *)
    (* GateState enumeration constants                                    *)
    (* ------------------------------------------------------------------ *)
    ST_IDLE                 : INT := 0;
    ST_OPENING              : INT := 1;
    ST_OPEN                 : INT := 2;
    ST_CLOSING              : INT := 3;
    ST_CLOSED               : INT := 4;
END_VAR

(* ======================================================================= *)
(* 1) SAFETY INTERLOCK - highest scan priority, evaluated first every scan *)
(* ======================================================================= *)

(* Loss of the E-Stop circuit immediately and unconditionally latches a
   fault. Both motor outputs are forced off unconditionally at the very end
   of this scan (section 7) - this is not deferred to a lower-priority rung. *)
IF NOT E_Stop THEN
    EStopFaultLatched := TRUE;
END_IF;

(* An explicit operator acknowledgement (either manual pushbutton) is
   required to clear the fault, and it is only accepted while the safety
   circuit is currently healthy. This prevents "resetting through" an
   active E-Stop condition. *)
Trig_EStopReset(CLK := PB_ManualOpen OR PB_ManualClose);
IF Trig_EStopReset.Q AND E_Stop THEN
    EStopFaultLatched := FALSE;
END_IF;

(* ======================================================================= *)
(* 2) TIMER PRE-EVALUATION - computed against last scan's GateState so the *)
(*    sequencer below can reference fresh .Q/.ET values this same scan     *)
(* ======================================================================= *)

Trig_ManualOpen(CLK := PB_ManualOpen);
Trig_ManualClose(CLK := PB_ManualClose);

Tmr_AutoClose(IN := (GateState = ST_OPEN) AND NOT Sensor_VehiclePresence, PT := T_AutoCloseDelay);
Tmr_WatchdogOpen(IN := (GateState = ST_OPENING), PT := T_WatchdogTimeout);
Tmr_WatchdogClose(IN := (GateState = ST_CLOSING), PT := T_WatchdogTimeout);

(* ======================================================================= *)
(* 3) GATE SEQUENCER - IDLE -> OPENING -> OPEN -> CLOSING -> CLOSED -> IDLE *)
(* ======================================================================= *)

CASE GateState OF

    ST_IDLE:
        Motor_GateUp   := FALSE;
        Motor_GateDown := FALSE;
        Light_Green    := FALSE;
        Light_Red      := TRUE;
        Buzzer         := FALSE;

        IF Sensor_VehiclePresence OR Trig_ManualOpen.Q THEN
            GateState := ST_OPENING;
        END_IF;

    ST_OPENING:
        Motor_GateUp   := TRUE;
        Motor_GateDown := FALSE;
        Light_Green    := FALSE;
        Light_Red      := TRUE;
        Buzzer         := TRUE;

        IF Sensor_GateOpenLimit THEN
            Motor_GateUp := FALSE;
            Buzzer       := FALSE;
            GateState    := ST_OPEN;
        END_IF;

    ST_OPEN:
        Motor_GateUp   := FALSE;
        Motor_GateDown := FALSE;
        Light_Green    := TRUE;
        Light_Red      := FALSE;
        Buzzer         := FALSE;

        IF Tmr_AutoClose.Q OR Trig_ManualClose.Q THEN
            GateState := ST_CLOSING;
        END_IF;

    ST_CLOSING:
        Motor_GateUp   := FALSE;
        Motor_GateDown := TRUE;
        Light_Green    := FALSE;
        Light_Red      := TRUE;
        Buzzer         := TRUE;

        IF Sensor_Obstruction THEN
            (* Obstruction safety: abandon the close and re-open immediately *)
            Motor_GateDown := FALSE;
            Motor_GateUp   := TRUE;
            GateState      := ST_OPENING;
        ELSIF Sensor_GateClosedLimit THEN
            Motor_GateDown := FALSE;
            Buzzer         := FALSE;
            GateState      := ST_CLOSED;
        END_IF;

    ST_CLOSED:
        Motor_GateUp   := FALSE;
        Motor_GateDown := FALSE;
        Light_Green    := FALSE;
        Light_Red      := TRUE;
        Buzzer         := FALSE;
        GateState      := ST_IDLE;

END_CASE;

(* ======================================================================= *)
(* 4) STUCK GATE WATCHDOG - latch on travel timeout, stop both motors      *)
(* ======================================================================= *)

IF (Tmr_WatchdogOpen.Q OR Tmr_WatchdogClose.Q) AND NOT Alarm_StuckGate THEN
    Alarm_StuckGate := TRUE;
    Motor_GateUp    := FALSE;
    Motor_GateDown  := FALSE;
    Buzzer          := FALSE;
END_IF;

(* ======================================================================= *)
(* 5) STUCK GATE RECOVERY - manual jog to a limit switch clears the latch  *)
(* ======================================================================= *)

IF Alarm_StuckGate THEN
    Motor_GateUp   := FALSE;
    Motor_GateDown := FALSE;
    Light_Green    := FALSE;
    Light_Red      := TRUE;

    IF PB_ManualOpen AND E_Stop THEN
        Motor_GateUp := TRUE;
        IF Sensor_GateOpenLimit THEN
            Motor_GateUp    := FALSE;
            Alarm_StuckGate := FALSE;
            GateState       := ST_OPEN;
        END_IF;
    ELSIF PB_ManualClose AND E_Stop THEN
        Motor_GateDown := TRUE;
        IF Sensor_GateClosedLimit THEN
            Motor_GateDown  := FALSE;
            Alarm_StuckGate := FALSE;
            GateState       := ST_IDLE;
        END_IF;
    END_IF;

    Buzzer := Motor_GateUp OR Motor_GateDown;
END_IF;

(* ======================================================================= *)
(* 6) MUTUAL EXCLUSION GUARD - defensive, should be structurally impossible *)
(* ======================================================================= *)

IF Motor_GateUp AND Motor_GateDown THEN
    Motor_GateUp   := FALSE;
    Motor_GateDown := FALSE;
END_IF;

(* ======================================================================= *)
(* 7) SAFETY INTERLOCK ENFORCEMENT - absolute, last word every scan        *)
(* ======================================================================= *)

IF (NOT E_Stop) OR EStopFaultLatched THEN
    Motor_GateUp   := FALSE;
    Motor_GateDown := FALSE;
    Buzzer         := FALSE;
    Light_Green    := FALSE;
    Light_Red      := TRUE;
END_IF;

END_PROGRAM
