(*
  ============================================================================
  POU:          ConveyorLogic (PROGRAM)
  PROJECT:      Automated Conveyor Belt System - Sorting & Safety Interlock
  TARGET:       Schneider Electric Modicon M580 (BMEP58 CPU family)
  IDE:          EcoStruxure Control Expert (Unity Pro) V15.1+
  LANGUAGE:     Structured Text (ST) - IEC 61131-3
  TASK:         MAST, periodic, recommended period 50ms (see ARCHITECTURE.md)
  ============================================================================
  FUNCTIONAL SUMMARY
  ------------------------------------------------------------------------
  1) Safety Interlock   - E_Stop loss immediately drops VFD_Run and latches
                           a fault that can only be cleared by an explicit
                           operator initiated Cmd_ManualReset while the
                           E-Stop circuit is healthy.
  2) Part Sorting        - While a part is present at the sort station,
                           Sensor_Color / Sensor_Weight are evaluated and
                           Actuator_Diverter is pulsed for reject or
                           out-of-tolerance parts.
  3) Speed Control        - VFD_Speed_Ref is soft-ramped to the operator
                           Speed_Setpoint whenever the line is running, and
                           forced to 0.0% whenever the line is not running.
  4) Annunciation         - Alarm_Tower reflects Run / Ready / Fault status
                           as a DWORD bit mask beacon.
  ============================================================================
*)
PROGRAM ConveyorLogic
VAR
    (* ------------------------------------------------------------------ *)
    (* Physical inputs - %I memory mapped                                 *)
    (* ------------------------------------------------------------------ *)
    E_Stop              : BOOL;    (* Safety-high: TRUE = circuit healthy, FALSE = E-Stop tripped/loss of signal *)
    Sensor_PartDetect   : BOOL;    (* Photoelectric proximity sensor - part present at sort station *)
    Sensor_Color        : INT;     (* 1 = Reject/Red, 2 = Accept/Green, 3 = Special/Blue *)
    Sensor_Weight       : REAL;    (* Load cell reading, kilograms *)

    (* ------------------------------------------------------------------ *)
    (* Operator / HMI command inputs - momentary pushbuttons               *)
    (* ------------------------------------------------------------------ *)
    Cmd_Start           : BOOL;    (* Momentary Start pushbutton *)
    Cmd_Stop            : BOOL;    (* Momentary Stop pushbutton *)
    Cmd_ManualReset     : BOOL;    (* Momentary Reset pushbutton - required after any E-Stop event *)
    Speed_Setpoint      : REAL := 75.0; (* Operator commanded line speed, 0.0-100.0 % *)

    (* ------------------------------------------------------------------ *)
    (* Physical outputs - %Q memory mapped                                *)
    (* ------------------------------------------------------------------ *)
    VFD_Run             : BOOL;
    VFD_Speed_Ref       : REAL;
    Actuator_Diverter   : BOOL;
    Alarm_Tower         : DWORD;

    (* ------------------------------------------------------------------ *)
    (* Internal state - retained between scans                            *)
    (* ------------------------------------------------------------------ *)
    EStopFaultLatched   : BOOL;
    SystemReady         : BOOL;
    RejectLatched       : BOOL;
    RampedSpeed         : REAL;

    Trig_Reset          : R_TRIG;
    Trig_PartDetect     : R_TRIG;
    Tmr_DiverterDwell   : TON;
    Tmr_SpeedRamp       : TON;

    (* ------------------------------------------------------------------ *)
    (* Tunable constants                                                  *)
    (* ------------------------------------------------------------------ *)
    WEIGHT_MIN_KG        : REAL := 0.20;   (* underweight reject threshold *)
    WEIGHT_MAX_KG        : REAL := 5.00;   (* overweight reject threshold *)
    COLOR_REJECT         : INT  := 1;
    COLOR_ACCEPT         : INT  := 2;
    COLOR_SPECIAL        : INT  := 3;
    DIVERTER_DWELL_TIME  : TIME := T#750ms; (* how long the diverter solenoid stays energized per reject *)
    SPEED_RAMP_TIME      : TIME := T#2s0ms; (* soft-start ramp duration to reach Speed_Setpoint *)

    ALM_BIT_RUN          : DWORD := 16#00000001; (* Bit 0 - Green / Run *)
    ALM_BIT_WARN         : DWORD := 16#00000002; (* Bit 1 - Yellow / Warning *)
    ALM_BIT_FAULT        : DWORD := 16#00000004; (* Bit 2 - Red / Alarm *)
END_VAR

(* ======================================================================= *)
(* 1) SAFETY INTERLOCK - highest scan priority, evaluated first every scan *)
(* ======================================================================= *)

(* Loss of the E-Stop circuit immediately and unconditionally latches a
   fault. VFD_Run is forced off in the same scan - this is not deferred to
   a lower-priority rung. *)
IF NOT E_Stop THEN
    EStopFaultLatched := TRUE;
END_IF;

(* An explicit operator reset action is required to clear the fault, and it
   is only accepted while the safety circuit is currently healthy. This
   prevents "resetting through" an active E-Stop condition. *)
Trig_Reset(CLK := Cmd_ManualReset);
IF Trig_Reset.Q AND E_Stop THEN
    EStopFaultLatched := FALSE;
END_IF;

SystemReady := E_Stop AND NOT EStopFaultLatched;

(* Run/Stop seal-in. Stop, loss of ready, or the E-Stop fault always wins
   over a Start request in the same scan. *)
IF Cmd_Stop OR NOT SystemReady THEN
    VFD_Run := FALSE;
ELSIF Cmd_Start AND SystemReady THEN
    VFD_Run := TRUE;
END_IF;

(* ======================================================================= *)
(* 2) SPEED CONTROL - soft-ramp VFD_Speed_Ref toward Speed_Setpoint         *)
(* ======================================================================= *)

Tmr_SpeedRamp(IN := VFD_Run, PT := SPEED_RAMP_TIME);

IF VFD_Run THEN
    IF Tmr_SpeedRamp.Q THEN
        RampedSpeed := Speed_Setpoint;
    ELSE
        RampedSpeed := Speed_Setpoint *
            (DINT_TO_REAL(TIME_TO_DINT(Tmr_SpeedRamp.ET)) / DINT_TO_REAL(TIME_TO_DINT(SPEED_RAMP_TIME)));
    END_IF;
ELSE
    RampedSpeed := 0.0;
END_IF;

VFD_Speed_Ref := RampedSpeed;

(* ======================================================================= *)
(* 3) PART SORTING - evaluate color/weight on part arrival, pulse diverter *)
(* ======================================================================= *)

Trig_PartDetect(CLK := Sensor_PartDetect);

IF Trig_PartDetect.Q THEN
    IF (Sensor_Color = COLOR_REJECT) OR
       (Sensor_Weight < WEIGHT_MIN_KG) OR
       (Sensor_Weight > WEIGHT_MAX_KG) THEN
        RejectLatched := TRUE;
    ELSE
        RejectLatched := FALSE;
    END_IF;
END_IF;

(* The diverter solenoid is energized for a fixed dwell period once a
   reject/out-of-spec part is confirmed, giving the part time to travel
   from the sensor to the diverter arm and be routed off the main lane. *)
Tmr_DiverterDwell(IN := RejectLatched AND Trig_PartDetect.Q, PT := DIVERTER_DWELL_TIME);
IF Trig_PartDetect.Q AND RejectLatched THEN
    Actuator_Diverter := TRUE;
ELSIF Tmr_DiverterDwell.Q THEN
    Actuator_Diverter := FALSE;
    RejectLatched := FALSE;
END_IF;

(* ======================================================================= *)
(* 4) ANNUNCIATION - Alarm_Tower bit mask (Bit0=Run, Bit1=Warn, Bit2=Fault) *)
(* ======================================================================= *)

Alarm_Tower := DWORD#0;

IF VFD_Run THEN
    Alarm_Tower := Alarm_Tower OR ALM_BIT_RUN;
ELSIF SystemReady THEN
    Alarm_Tower := Alarm_Tower OR ALM_BIT_WARN;
END_IF;

IF EStopFaultLatched OR NOT E_Stop THEN
    Alarm_Tower := Alarm_Tower OR ALM_BIT_FAULT;
END_IF;

END_PROGRAM
