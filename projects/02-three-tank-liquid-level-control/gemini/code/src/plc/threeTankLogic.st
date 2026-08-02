(* Three-Tank Liquid Level Control System *)
(* IEC 61131-3 Structured Text *)

PROGRAM ThreeTankControl
VAR_INPUT
    AutoMode : BOOL;
    Tank1_Level : REAL; (* 0.0 to 100.0 % *)
    Tank2_Level : REAL;
    Tank3_Level : REAL;
END_VAR

VAR_OUTPUT
    Pump1_Run : BOOL;
    Pump2_Run : BOOL;
    Valve1_Open : BOOL;
    Valve2_Open : BOOL;
    Valve3_Open : BOOL;
    Alarm_HighLevel : BOOL;
    Alarm_LowLevel : BOOL;
END_VAR

VAR
    Tank1_SP : REAL := 70.0;
    Tank2_SP : REAL := 50.0;
    Tank3_SP : REAL := 30.0;
    Hysteresis : REAL := 2.0;
END_VAR

IF AutoMode THEN
    IF Tank1_Level < (Tank1_SP - Hysteresis) THEN
        Pump1_Run := TRUE;
    ELSIF Tank1_Level > (Tank1_SP + Hysteresis) THEN
        Pump1_Run := FALSE;
    END_IF;

    Valve1_Open := Tank1_Level > 20.0 AND Tank2_Level < Tank2_SP;
    Valve2_Open := Tank2_Level > 15.0 AND Tank3_Level < Tank3_SP;
END_IF;

END_PROGRAM
