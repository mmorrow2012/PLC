(*
 * ============================================================================
 * Schneider Electric Modicon M580 PLC Application
 * Software Environment: EcoStruxure Control Expert (Unity Pro v15.0+)
 * Hardware Target: BMEP582040 / Modicon M580 Automation Controller
 * Standard: IEC 61131-3 Structured Text (.ST)
 * Process Name: Three-Tank Liquid Level Control System with Cascade & Overflow Guard
 * ============================================================================
 *)

TYPE E_ProcessState : (
    IDLE            := 0,  (* System Standby / Paused *)
    FILLING_A       := 1,  (* Auto-Fill Tank A via Inlet Pump *)
    TRANSFERRING_AB := 2,  (* Transfer A -> B with Modulated Proportional Gravity Drain B -> C *)
    DRAINING_BC     := 3,  (* Gravity Drain B -> C to Completion *)
    ALARM_STATE     := 4   (* Safety Interlock / Fault Trip State *)
);
END_TYPE

PROGRAM ThreeTankLevelControl
VAR_INPUT
    E_Stop              : BOOL := TRUE;  (* Hardware E-Stop Switch (NC Logic: TRUE = OK, FALSE = Emergency State) *)
    Start_PB            : BOOL := FALSE; (* Operator Start Pushbutton (NO Pulse) *)
    Stop_PB             : BOOL := FALSE; (* Operator Stop Pushbutton (NO Pulse) *)
    Alarm_Reset_PB      : BOOL := FALSE; (* Manual Alarm Reset Pushbutton *)
    LT_TankA            : REAL := 0.0;   (* Level Transmitter Tank A (0.0 to 100.0%) *)
    LT_TankB            : REAL := 0.0;   (* Level Transmitter Tank B (0.0 to 100.0%) *)
    LT_TankC            : REAL := 0.0;   (* Level Transmitter Tank C (0.0 to 100.0%) *)
    LSH_TankA           : BOOL := FALSE; (* Hardwired Float Switch High Level Tank A (NO: TRUE = Overflow) *)
    LSH_TankB           : BOOL := FALSE; (* Hardwired Float Switch High Level Tank B (NO: TRUE = Overflow) *)
END_VAR

VAR_OUTPUT
    Pump_Fill_A         : BOOL := FALSE; (* Inlet Fill Pump for Tank A *)
    Pump_Transfer_AB    : BOOL := FALSE; (* Transfer Pump Tank A to Tank B *)
    Valve_Drain_BC_Pos  : REAL := 0.0;   (* Proportional Drain Valve Position Tank B -> C (0.0 to 100.0%) *)
    Alarm_Overflow      : BOOL := FALSE; (* Latched Overflow Alarm *)
    Alarm_Tower         : DWORD := 16#02;(* Status Beacon Bitmask: Bit 0 = Green, Bit 1 = Yellow, Bit 2 = Red *)
    State_Display       : INT := 0;      (* Current Process State Integer for HMI Telemetry *)
END_VAR

VAR
    CurrentState        : E_ProcessState := E_ProcessState#IDLE;
    E_Stop_Latched      : BOOL := FALSE;
    
    (* Configurable Process Setpoints *)
    SP_LevelA_High      : REAL := 80.0;  (* Tank A Fill Cutoff Setpoint (%) *)
    SP_LevelB_High      : REAL := 85.0;  (* Tank B High Level Guard Setpoint (%) *)
    SP_LevelB_Target    : REAL := 50.0;  (* Tank B Cascade Control Target Level (%) *)
    
    (* Cascade Controller Parameters *)
    Kp_Drain            : REAL := 2.5;   (* Proportional Gain for Drain Valve Modulation *)
    
    (* Helper Edge Registers *)
    Start_Trig          : BOOL := FALSE;
    Start_PB_Prev       : BOOL := FALSE;
    Reset_Trig          : BOOL := FALSE;
    Reset_PB_Prev       : BOOL := FALSE;
    Overflow_Detected   : BOOL := FALSE;
END_VAR

(* ----------------------------------------------------------------------------
 * SECTION 1: EDGE DETECTION & INPUT SANITIZATION
 * ---------------------------------------------------------------------------- *)
Start_Trig := Start_PB AND NOT Start_PB_Prev;
Start_PB_Prev := Start_PB;

Reset_Trig := Alarm_Reset_PB AND NOT Reset_PB_Prev;
Reset_PB_Prev := Alarm_Reset_PB;

(* ----------------------------------------------------------------------------
 * SECTION 2: SAFETY INTERLOCK & OVERFLOW MONITORING
 * ---------------------------------------------------------------------------- *)
(* Normally Closed (NC) E-Stop logic check *)
IF NOT E_Stop THEN
    E_Stop_Latched := TRUE;
END_IF;

(* Dual-Layer Overflow Trip Check: Analog Transmitters OR Hardwired Float Switches *)
Overflow_Detected := (LT_TankA >= 100.0) OR (LT_TankB >= 100.0) OR LSH_TankA OR LSH_TankB;

IF Overflow_Detected THEN
    Alarm_Overflow := TRUE;
END_IF;

(* ----------------------------------------------------------------------------
 * SECTION 3: MANUAL ALARM ACKNOWLEDGEMENT & RESET
 * ---------------------------------------------------------------------------- *)
IF Reset_Trig THEN
    (* Reset allowed only if hardware conditions are cleared *)
    IF E_Stop AND NOT Overflow_Detected THEN
        Alarm_Overflow := FALSE;
        E_Stop_Latched := FALSE;
        IF CurrentState = E_ProcessState#ALARM_STATE THEN
            CurrentState := E_ProcessState#IDLE;
        END_IF;
    END_IF;
END_IF;

(* ----------------------------------------------------------------------------
 * SECTION 4: MAIN PROCESS STATE MACHINE
 * ---------------------------------------------------------------------------- *)
IF E_Stop_Latched OR Alarm_Overflow THEN
    (* Immediate Safety Override: Shut off all pumps and close drain valve *)
    CurrentState := E_ProcessState#ALARM_STATE;
    Pump_Fill_A := FALSE;
    Pump_Transfer_AB := FALSE;
    Valve_Drain_BC_Pos := 0.0;
ELSE
    CASE CurrentState OF
        E_ProcessState#IDLE:
            Pump_Fill_A := FALSE;
            Pump_Transfer_AB := FALSE;
            Valve_Drain_BC_Pos := 0.0;
            
            IF Start_Trig THEN
                CurrentState := E_ProcessState#FILLING_A;
            END_IF;

        E_ProcessState#FILLING_A:
            Pump_Fill_A := TRUE;
            Pump_Transfer_AB := FALSE;
            Valve_Drain_BC_Pos := 0.0;
            
            IF Stop_PB THEN
                CurrentState := E_ProcessState#IDLE;
            ELSIF LT_TankA >= SP_LevelA_High THEN
                CurrentState := E_ProcessState#TRANSFERRING_AB;
            END_IF;

        E_ProcessState#TRANSFERRING_AB:
            Pump_Fill_A := FALSE;
            Pump_Transfer_AB := TRUE;
            
            (* Cascade Proportional Drain Control on Tank B *)
            IF LT_TankB > SP_LevelB_Target THEN
                Valve_Drain_BC_Pos := (LT_TankB - SP_LevelB_Target) * Kp_Drain;
                IF Valve_Drain_BC_Pos > 100.0 THEN
                    Valve_Drain_BC_Pos := 100.0;
                END_IF;
            ELSE
                Valve_Drain_BC_Pos := 0.0;
            END_IF;
            
            IF Stop_PB THEN
                CurrentState := E_ProcessState#IDLE;
            ELSIF LT_TankA <= 3.0 OR LT_TankB >= SP_LevelB_High THEN
                CurrentState := E_ProcessState#DRAINING_BC;
            END_IF;

        E_ProcessState#DRAINING_BC:
            Pump_Fill_A := FALSE;
            Pump_Transfer_AB := FALSE;
            Valve_Drain_BC_Pos := 100.0;
            
            IF Stop_PB THEN
                CurrentState := E_ProcessState#IDLE;
            ELSIF LT_TankB <= 2.0 THEN
                CurrentState := E_ProcessState#IDLE;
            END_IF;

        E_ProcessState#ALARM_STATE:
            Pump_Fill_A := FALSE;
            Pump_Transfer_AB := FALSE;
            Valve_Drain_BC_Pos := 0.0;
    END_CASE;
END_IF;

(* ----------------------------------------------------------------------------
 * SECTION 5: ALARM TOWER BEACON BITMASK GENERATION
 * Bit 0 (16#01) = Green  (Auto Process Running)
 * Bit 1 (16#02) = Yellow (Standby / Idle)
 * Bit 2 (16#04) = Red    (Alarm / Fault Active)
 * ---------------------------------------------------------------------------- *)
IF CurrentState = E_ProcessState#ALARM_STATE THEN
    Alarm_Tower := 16#04; (* Red *)
ELSIF CurrentState = E_ProcessState#IDLE THEN
    Alarm_Tower := 16#02; (* Yellow *)
ELSE
    Alarm_Tower := 16#01; (* Green *)
END_IF;

(* Telemetry Output Assignment *)
State_Display := CurrentState;
