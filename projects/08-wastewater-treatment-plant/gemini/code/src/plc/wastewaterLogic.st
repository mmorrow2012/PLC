(* Wastewater Treatment Plant PLC Control Program *)
PROGRAM MainControl
VAR
    InfluentLevel AT %IW0 : REAL; (* Level % *)
    DO_Sensor AT %IW1     : REAL; (* Dissolved Oxygen mg/L *)
    
    Blower_Cmd AT %QX0.0  : BOOL; (* Blower Motor Relay *)
    InflowPump AT %QX0.1  : BOOL; (* Influent Pump Relay *)
    Alarm_HighDO AT %QX1.0: BOOL; (* High Oxygen Alarm *)
END_VAR

IF InfluentLevel > 80.0 THEN
    InflowPump := TRUE;
ELSIF InfluentLevel < 20.0 THEN
    InflowPump := FALSE;
END_IF;

IF DO_Sensor < 2.0 THEN
    Blower_Cmd := TRUE;
ELSIF DO_Sensor > 4.0 THEN
    Blower_Cmd := FALSE;
END_IF;

Alarm_HighDO := DO_Sensor > 5.0;

END_PROGRAM