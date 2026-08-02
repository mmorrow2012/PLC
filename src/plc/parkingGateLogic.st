(*
 * ============================================================================
 * SCHNEIDER ELECTRIC MODICON M580 / ECOSTRUXURE CONTROL EXPERT
 * PROGRAM: Gate_Controller_Main
 * FILE: parkingGateLogic.st
 * STANDARD: IEC 61131-3 Structured Text
 * SYSTEM: Parking Garage Gate Controller
 * DATE: 2026-08-02
 * ============================================================================
 *)

TYPE
    E_GateState : (STATE_IDLE, STATE_OPENING, STATE_OPEN, STATE_CLOSING, STATE_CLOSED, STATE_FAULT);
END_TYPE

VAR_GLOBAL
    // Hardware Inputs (M580 Digital Input Module)
    E_Stop                  : BOOL := TRUE;  // NC Hardware E-Stop Switch (TRUE = Normal/Safe)
    Sensor_VehiclePresence  : BOOL := FALSE; // Inductive Loop Sensor (TRUE = Vehicle Present)
    Sensor_GateOpenLimit    : BOOL := FALSE; // Limit Switch Gate Fully Open
    Sensor_GateClosedLimit  : BOOL := TRUE;  // Limit Switch Gate Fully Closed
    Sensor_Obstruction      : BOOL := FALSE; // Safety Photoeye/Edge (TRUE = Beam Blocked)
    PB_ManualOpen           : BOOL := FALSE; // Operator Manual Open Pushbutton
    PB_ManualClose          : BOOL := FALSE; // Operator Manual Close Pushbutton
    PB_Reset                : BOOL := FALSE; // Operator Fault Reset Pushbutton

    // Hardware Outputs (M580 Digital Output Module)
    Motor_GateUp            : BOOL := FALSE; // Contactor Gate Raise Motor
    Motor_GateDown          : BOOL := FALSE; // Contactor Gate Lower Motor
    Light_Green             : BOOL := FALSE; // Traffic Light Go (Green)
    Light_Red               : BOOL := TRUE;  // Traffic Light Stop (Red)
    Alarm_StuckGate         : BOOL := FALSE; // Latched Fault Indicator
    Buzzer                  : BOOL := FALSE; // Movement Audible Alarm

    // Internal State & Timers
    CurrentState            : E_GateState := STATE_IDLE;
    TON_Watchdog            : TON;           // Gate travel timeout timer
    TON_AutoClose           : TON;           // Delay timer after vehicle clears
    
    // Configurable Parameters
    T_WatchdogTimeout       : TIME := T#8S;  // Maximum travel duration
    T_AutoCloseDelay        : TIME := T#5S;  // Pause before closing
END_VAR

PROGRAM Main_Gate_Control
VAR
    Watchdog_ET : TIME;
    AutoClose_ET: TIME;
END_VAR

    // ------------------------------------------------------------------------
    // 1. EMERGENCY STOP & SAFETY INTERLOCK (HIGHEST PRIORITY)
    // ------------------------------------------------------------------------
    IF NOT E_Stop THEN
        Motor_GateUp   := FALSE;
        Motor_GateDown := FALSE;
        Buzzer         := FALSE;
        Light_Green    := FALSE;
        Light_Red      := TRUE;
        CurrentState   := STATE_FAULT;
        RETURN;
    END_IF;

    // Fault Reset Handling
    IF PB_Reset THEN
        Alarm_StuckGate := FALSE;
        IF CurrentState = STATE_FAULT THEN
            IF Sensor_GateClosedLimit THEN
                CurrentState := STATE_CLOSED;
            ELSIF Sensor_GateOpenLimit THEN
                CurrentState := STATE_OPEN;
            ELSE
                CurrentState := STATE_IDLE;
            END_IF;
        END_IF;
    END_IF;

    // Interlock check for active fault
    IF Alarm_StuckGate THEN
        Motor_GateUp   := FALSE;
        Motor_GateDown := FALSE;
        Buzzer         := FALSE;
        Light_Green    := FALSE;
        Light_Red      := TRUE;
        CurrentState   := STATE_FAULT;
        RETURN;
    END_IF;

    // ------------------------------------------------------------------------
    // 2. STATE MACHINE LOGIC
    // ------------------------------------------------------------------------
    CASE CurrentState OF

        STATE_IDLE:
            Motor_GateUp   := FALSE;
            Motor_GateDown := FALSE;
            Buzzer         := FALSE;
            Light_Green    := FALSE;
            Light_Red      := TRUE;

            IF Sensor_GateClosedLimit THEN
                CurrentState := STATE_CLOSED;
            ELSIF Sensor_GateOpenLimit THEN
                CurrentState := STATE_OPEN;
            ELSIF Sensor_VehiclePresence OR PB_ManualOpen THEN
                CurrentState := STATE_OPENING;
            ELSIF PB_ManualClose THEN
                CurrentState := STATE_CLOSING;
            END_IF;

        STATE_CLOSED:
            Motor_GateUp   := FALSE;
            Motor_GateDown := FALSE;
            Buzzer         := FALSE;
            Light_Green    := FALSE;
            Light_Red      := TRUE;

            // Trigger opening on vehicle detection or manual open
            IF Sensor_VehiclePresence OR PB_ManualOpen THEN
                CurrentState := STATE_OPENING;
            END_IF;

        STATE_OPENING:
            Motor_GateUp   := TRUE;
            Motor_GateDown := FALSE;
            Buzzer         := TRUE;
            Light_Green    := FALSE;
            Light_Red      := TRUE;

            // Check if open limit switch reached
            IF Sensor_GateOpenLimit THEN
                Motor_GateUp := FALSE;
                Buzzer       := FALSE;
                CurrentState := STATE_OPEN;
            END_IF;

        STATE_OPEN:
            Motor_GateUp   := FALSE;
            Motor_GateDown := FALSE;
            Buzzer         := FALSE;
            Light_Green    := TRUE;   // Safe to proceed
            Light_Red      := FALSE;

            // Manual Close override
            IF PB_ManualClose THEN
                CurrentState := STATE_CLOSING;
            END_IF;

            // Auto-Close logic timer handled below in section 3
            IF TON_AutoClose.Q THEN
                CurrentState := STATE_CLOSING;
            END_IF;

        STATE_CLOSING:
            Motor_GateUp   := FALSE;
            Motor_GateDown := TRUE;
            Buzzer         := TRUE;
            Light_Green    := FALSE;
            Light_Red      := TRUE;

            // OBSTRUCTION SAFETY INTERLOCK (Immediate Reversals)
            IF Sensor_Obstruction OR Sensor_VehiclePresence THEN
                Motor_GateDown := FALSE;
                CurrentState   := STATE_OPENING; // Re-open immediately
            ELSIF PB_ManualOpen THEN
                Motor_GateDown := FALSE;
                CurrentState   := STATE_OPENING;
            ELSIF Sensor_GateClosedLimit THEN
                Motor_GateDown := FALSE;
                Buzzer         := FALSE;
                CurrentState   := STATE_CLOSED;
            END_IF;

        STATE_FAULT:
            Motor_GateUp   := FALSE;
            Motor_GateDown := FALSE;
            Buzzer         := FALSE;
            Light_Green    := FALSE;
            Light_Red      := TRUE;

    END_CASE;

    // ------------------------------------------------------------------------
    // 3. TIMERS & WATCHDOG EVALUATION
    // ------------------------------------------------------------------------
    
    // Auto-Close Delay Timer (Runs while OPEN and NO vehicle presence)
    TON_AutoClose(
        IN := (CurrentState = STATE_OPEN) AND NOT Sensor_VehiclePresence,
        PT := T_AutoCloseDelay,
        Q => ,
        ET => AutoClose_ET
    );

    // Watchdog Timer (Runs while OPENING or CLOSING)
    TON_Watchdog(
        IN := (CurrentState = STATE_OPENING) OR (CurrentState = STATE_CLOSING),
        PT := T_WatchdogTimeout,
        Q => ,
        ET => Watchdog_ET
    );

    // Stuck Gate Alarm Trigger
    IF TON_Watchdog.Q THEN
        Alarm_StuckGate := TRUE;
        Motor_GateUp    := FALSE;
        Motor_GateDown  := FALSE;
        Buzzer          := FALSE;
        CurrentState    := STATE_FAULT;
    END_IF;

END_PROGRAM
