(*
 * Schneider Electric Modicon M580 (BMEP582040) Structured Text Logic
 * EcoStruxure Control Expert (Unity Pro) Compatible Program
 * Application: Automated Sorting Conveyor System with Safety Interlock
 * Standard: IEC 61131-3 ST
 *)

PROGRAM Conveyor_Sorting_Control
VAR_INPUT
    E_Stop            : BOOL := TRUE;  (* NC Hardware Safety Switch (FALSE = Active E-STOP) *)
    Reset_PB          : BOOL := FALSE; (* Manual Fault Reset Pushbutton Pulse *)
    Sensor_PartDetect : BOOL := FALSE; (* Photoelectric Part Presence Sensor *)
    Sensor_Color      : INT  := 0;     (* 1 = Red/Reject, 2 = Green/Accept, 3 = Blue/Special *)
    Sensor_Weight     : REAL := 0.0;   (* Load cell reading in Kilograms *)
    Target_Speed      : REAL := 75.0;  (* Desired VFD Speed Reference (0.0 to 100.0%) *)
END_VAR

VAR_OUTPUT
    VFD_Run           : BOOL := FALSE; (* VFD Main Contact & Motor Run Command *)
    VFD_Speed_Ref     : REAL := 0.0;   (* Motor Speed Reference Percentage (0.0 - 100.0%) *)
    Actuator_Diverter : BOOL := FALSE; (* Pneumatic Diverter Arm Solenoid *)
    Alarm_Tower       : DWORD := 16#00000004; (* Bit 0: Green, Bit 1: Yellow, Bit 2: Red *)
END_VAR

VAR
    System_Fault      : BOOL := TRUE;  (* Safety Interlock Latch State *)
    Part_Count_Total  : DINT := 0;
    Part_Count_Reject : DINT := 0;
    Part_Count_Accept : DINT := 0;
    
    (* Operational Thresholds *)
    MIN_WEIGHT_KG     : REAL := 0.5;   (* Min allowed item weight *)
    MAX_WEIGHT_KG     : REAL := 5.0;   (* Max allowed item weight *)
    COLOR_REJECT_CODE : INT  := 1;     (* Red Color Reject Code *)
    
    (* Edge Detection Registers *)
    Trig_PartDetect   : BOOL := FALSE;
    Prev_PartDetect   : BOOL := FALSE;
END_VAR

// ----------------------------------------------------------------------------
// 1. SAFETY INTERLOCK & TRIP EXECUTION (IEC 61131-3 Safety Compliance)
// ----------------------------------------------------------------------------
IF NOT E_Stop THEN
    // E-STOP LOST: Force Immediate Emergency Shutdown
    System_Fault      := TRUE;
    VFD_Run           := FALSE;
    VFD_Speed_Ref     := 0.0;
    Actuator_Diverter := FALSE;
    Alarm_Tower       := 16#00000004; // Bit 2 = TRUE (Red Beacon / Alarm)
ELSIF Reset_PB AND System_Fault THEN
    // Manual Reset Pulse Acknowledged
    System_Fault      := FALSE;
END_IF;

// ----------------------------------------------------------------------------
// 2. MAIN CONVEYOR & SORTING CONTROL SCAN
// ----------------------------------------------------------------------------
IF NOT System_Fault THEN
    // Enable Motor Drive
    VFD_Run := TRUE;
    
    // Speed Reference Clamping (0.0% to 100.0%)
    IF Target_Speed > 100.0 THEN
        VFD_Speed_Ref := 100.0;
    ELSIF Target_Speed < 0.0 THEN
        VFD_Speed_Ref := 0.0;
    ELSE
        VFD_Speed_Ref := Target_Speed;
    END_IF;

    // ------------------------------------------------------------------------
    // 3. AUTOMATED PART SORTING EVALUATION
    // ------------------------------------------------------------------------
    IF Sensor_PartDetect THEN
        // Condition for Diverter Actuation:
        // 1. Part Color matches Reject Code (Red = 1)
        // 2. Part Weight is below minimum threshold (< 0.5kg)
        // 3. Part Weight exceeds maximum threshold (> 5.0kg)
        IF (Sensor_Color = COLOR_REJECT_CODE) OR 
           (Sensor_Weight < MIN_WEIGHT_KG) OR 
           (Sensor_Weight > MAX_WEIGHT_KG) THEN
            
            Actuator_Diverter := TRUE;  (* Engage Diverter Solenoid *)
            Alarm_Tower       := 16#00000003; (* Bit 0 & Bit 1: Green + Yellow Warning *)
        ELSE
            Actuator_Diverter := FALSE; (* Keep Belt Clear for Accept Path *)
            Alarm_Tower       := 16#00000001; (* Bit 0: Green Run Only *)
        END_IF;
    ELSE
        Actuator_Diverter := FALSE;
        Alarm_Tower       := 16#00000001; (* Bit 0: Normal Operating State *)
    END_IF;

    // Edge Detection for Production Counters
    Trig_PartDetect := Sensor_PartDetect AND NOT Prev_PartDetect;
    Prev_PartDetect := Sensor_PartDetect;

    IF Trig_PartDetect THEN
        Part_Count_Total := Part_Count_Total + 1;
        IF Actuator_Diverter THEN
            Part_Count_Reject := Part_Count_Reject + 1;
        ELSE
            Part_Count_Accept := Part_Count_Accept + 1;
        END_IF;
    END_IF;

ELSE
    // Fallback Safe State Output Override
    VFD_Run           := FALSE;
    VFD_Speed_Ref     := 0.0;
    Actuator_Diverter := FALSE;
    Alarm_Tower       := 16#00000004; // Red Beacon Active
END_IF;

END_PROGRAM
