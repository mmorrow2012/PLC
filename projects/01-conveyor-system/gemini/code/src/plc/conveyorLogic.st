PROGRAM ConveyorControl
VAR_INPUT
    bStartPB : BOOL;
    bStopPB : BOOL;
    bEStop : BOOL;
    bItemSensor : BOOL;
END_VAR
VAR_OUTPUT
    bMotorRun : BOOL;
    bAlarmLight : BOOL;
    bRunningLight : BOOL;
END_VAR

// Main control loop
IF NOT bEStop THEN
    bMotorRun := FALSE;
    bAlarmLight := TRUE;
    bRunningLight := FALSE;
ELSIF bStartPB AND bStopPB THEN
    bMotorRun := TRUE;
    bAlarmLight := FALSE;
    bRunningLight := TRUE;
ELSIF NOT bStopPB THEN
    bMotorRun := FALSE;
    bRunningLight := FALSE;
END_IF;
END_PROGRAM
