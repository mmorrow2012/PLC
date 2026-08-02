(* ========================================================================= *)
(* CHEMICAL BATCH REACTOR CONTROL PROGRAM                                    *)
(* Standard: IEC 61131-3 Structured Text (ST)                              *)
(* Project: 07-chemical-batch-reactor / Gemini Demonstrator                   *)
(* ========================================================================= *)

PROGRAM BatchReactorControl
VAR_INPUT
    DI_START_PB    : BOOL; (* Start Pushbutton *) 
    DI_STOP_PB     : BOOL; (* Stop Pushbutton *) 
    DI_ESTOP       : BOOL; (* Emergency Stop Active *) 
    DI_MAN_DRAIN   : BOOL; (* Manual Drain Button *) 
    AI_TEMP        : REAL; (* Temperature Sensor (°C) *) 
    AI_LEVEL       : REAL; (* Reactor Level Sensor (Liters) *) 
    AI_PRESSURE    : REAL; (* Reactor Pressure Sensor (bar) *) 
END_VAR

VAR_OUTPUT
    DO_VALVE_A     : BOOL; (* Charge Valve A *) 
    DO_VALVE_B     : BOOL; (* Charge Valve B *) 
    DO_DRAIN_VALVE : BOOL; (* Drain Valve *) 
    DO_AGITATOR    : BOOL; (* Agitator Motor *) 
    DO_HEATER      : BOOL; (* Heater Relay *) 
    DO_COOLING     : BOOL; (* Cooling Jacket Valve *) 
    AO_HEAT_PWM    : REAL; (* Heater Modulation (0-100%) *) 
    AO_AGIT_SPEED  : REAL; (* Agitator Speed Setpoint *) 
END_VAR

VAR
    ePhase         : INT := 0; (* 0:IDLE, 1:CHARGE_A, 2:CHARGE_B, 3:HEAT, 4:REACT, 5:COOL, 6:DRAIN, 99:ESTOP *)
    rSetTemp       : REAL := 85.0; (* Reaction Target Temp °C *)
    rTargetVolA    : REAL := 400.0; (* Liters *)
    rTargetVolB    : REAL := 300.0; (* Liters *)
    tonPhaseTimer  : TON; (* Phase Timer *)
    rTempError     : REAL;
END_VAR

// Main Control Logic
IF DI_ESTOP THEN
    ePhase := 99;
    DO_VALVE_A := FALSE;
    DO_VALVE_B := FALSE;
    DO_DRAIN_VALVE := FALSE;
    DO_AGITATOR := FALSE;
    DO_HEATER := FALSE;
    DO_COOLING := TRUE; (* Safety cooling *)
    AO_HEAT_PWM := 0.0;
    AO_AGIT_SPEED := 0.0;
    RETURN;
END_IF;

CASE ePhase OF
    0: (* IDLE *)
        DO_VALVE_A := FALSE;
        DO_VALVE_B := FALSE;
        DO_DRAIN_VALVE := FALSE;
        DO_AGITATOR := FALSE;
        DO_HEATER := FALSE;
        DO_COOLING := FALSE;
        IF DI_START_PB THEN
            ePhase := 1;
        END_IF;

    1: (* CHARGE REACTANT A *)
        DO_VALVE_A := TRUE;
        IF AI_LEVEL >= rTargetVolA THEN
            DO_VALVE_A := FALSE;
            ePhase := 2;
        END_IF;

    2: (* CHARGE REACTANT B *)
        DO_VALVE_B := TRUE;
        DO_AGITATOR := TRUE;
        AO_AGIT_SPEED := 30.0; (* Low speed mixing *)
        IF AI_LEVEL >= (rTargetVolA + rTargetVolB) THEN
            DO_VALVE_B := FALSE;
            ePhase := 3;
        END_IF;

    3: (* HEATING *)
        DO_AGITATOR := TRUE;
        AO_AGIT_SPEED := 60.0;
        DO_HEATER := TRUE;
        AO_HEAT_PWM := 100.0;
        IF AI_TEMP >= rSetTemp THEN
            ePhase := 4;
        END_IF;

    4: (* REACTION HOLD *)
        DO_AGITATOR := TRUE;
        AO_AGIT_SPEED := 100.0;
        // Basic PID / On-Off heat control
        IF AI_TEMP < rSetTemp THEN
            DO_HEATER := TRUE;
            AO_HEAT_PWM := 50.0;
        ELSE
            DO_HEATER := FALSE;
            AO_HEAT_PWM := 0.0;
        END_IF;
        
    5: (* COOLING *)
        DO_HEATER := FALSE;
        AO_HEAT_PWM := 0.0;
        DO_COOLING := TRUE;
        AO_AGIT_SPEED := 40.0;
        IF AI_TEMP <= 30.0 THEN
            DO_COOLING := FALSE;
            ePhase := 6;
        END_IF;

    6: (* DRAIN *)
        DO_AGITATOR := FALSE;
        DO_DRAIN_VALVE := TRUE;
        IF AI_LEVEL <= 5.0 THEN
            DO_DRAIN_VALVE := FALSE;
            ePhase := 0;
        END_IF;

    99: (* EMERGENCY STOP *)
        IF NOT DI_ESTOP THEN
            ePhase := 0;
        END_IF;
END_CASE;
END_PROGRAM
