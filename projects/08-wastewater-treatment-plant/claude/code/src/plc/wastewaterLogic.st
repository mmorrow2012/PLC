(*=============================================================================
  PROJECT : Municipal Wastewater Treatment & Multi-Basin Aeration Tank Control
  TARGET  : Schneider Electric Modicon M580 / EcoStruxure Control Expert
            (portable to Siemens S7-1500, TIA Portal SCL)
  LANGUAGE: IEC 61131-3 Structured Text (ST) source of the FBD/LD networks
  TASK    : MAST, cyclic, 50 ms period, watchdog 250 ms

  Four DFBs (Derived Function Blocks) are declared below and instantiated by
  the PROGRAM WastewaterPlant at the bottom of this file. Execution order in
  the MAST task is fixed and safety-first:

      1. FB_SafetyInterlock   - trips and inhibits everything downstream
      2. Master run seal-in   - start/stop latch + %MW0 state machine
      3. FB_LeadLagPump       - influent duty/standby pumping + VFD ramp
      4. FB_AerationDO        - dissolved oxygen PI control of the air header
      5. RAS + coagulant      - recirculation and chemical dosing rungs
      6. FB_WeirGateControl   - motorised effluent sluice gate

  The TypeScript port in `wastewaterLogic.ts` mirrors this file section for
  section (same numbering, same rung order) so the two can be diffed.
=============================================================================*)


(*-----------------------------------------------------------------------------
  MEMORY ALLOCATION TABLE (located variables)
-----------------------------------------------------------------------------*)
VAR_GLOBAL
    (* --- Digital inputs -------------------------------------------------- *)
    I_EStop_NC            AT %I0.0   : BOOL;  (* Master E-Stop, NC, TRUE=healthy  *)
    I_PlantStart_PB       AT %I0.1   : BOOL;  (* Plant master run pushbutton      *)
    I_PlantStop_PB        AT %I0.2   : BOOL;  (* Plant master stop pushbutton     *)
    I_ResetFault_PB       AT %I0.3   : BOOL;  (* Alarm reset / fault acknowledge  *)
    I_LSH_Equalization    AT %I0.4   : BOOL;  (* HH float guard, equalization     *)
    I_LSH_AerationA       AT %I0.5   : BOOL;  (* High float guard, aeration A     *)
    I_LSH_AerationB       AT %I0.6   : BOOL;  (* High float guard, aeration B     *)
    I_WeirOpenLS          AT %I0.7   : BOOL;  (* Weir gate fully-open limit sw    *)

    (* --- Analog inputs (4-20 mA scaled) ---------------------------------- *)
    AI_LT_EqBasin         AT %IW100  : REAL;  (* 0.0 .. 10.0 m                    *)
    AI_LT_AerationA       AT %IW102  : REAL;  (* 0.0 ..  6.0 m                    *)
    AI_LT_AerationB       AT %IW104  : REAL;  (* 0.0 ..  6.0 m                    *)
    AI_DO_AerationA       AT %IW106  : REAL;  (* 0.0 .. 10.0 mg/L                 *)
    AI_Turbidity_Effluent AT %IW108  : REAL;  (* 0.0 .. 100.0 NTU                 *)

    (* --- Digital outputs -------------------------------------------------- *)
    Q_Pump_RawInfluent1   AT %Q0.0   : BOOL;  (* Influent pump 1 duty contactor   *)
    Q_Pump_RawInfluent2   AT %Q0.1   : BOOL;  (* Influent pump 2 lag contactor    *)
    Q_Blower_AerationA    AT %Q0.2   : BOOL;  (* Basin A diffuser blower motor    *)
    Q_Blower_AerationB    AT %Q0.3   : BOOL;  (* Basin B diffuser blower motor    *)
    Q_Pump_RAS            AT %Q0.4   : BOOL;  (* Return activated sludge pump     *)
    Q_Pump_Coagulant      AT %Q0.5   : BOOL;  (* Coagulant polymer dosing pump    *)
    Q_Motor_WeirOpen      AT %Q0.6   : BOOL;  (* Weir sluice gate OPEN contactor  *)
    Q_Motor_WeirClose     AT %Q0.7   : BOOL;  (* Weir sluice gate CLOSE contactor *)

    (* --- Analog outputs --------------------------------------------------- *)
    AQ_VFD_InfluentSpeed  AT %QW100  : REAL;  (* Influent VFD reference 0-100 %   *)
    AQ_AirValve_Aeration  AT %QW102  : REAL;  (* Air header valve 0-100 %         *)

    (* --- Internal memory words -------------------------------------------- *)
    M_PlantState          AT %MW0    : INT  := 0;    (* 0/1/2/3/4/99            *)
    M_TargetDO            AT %MW2    : REAL := 2.5;  (* mg/L                    *)
    M_MaxTurbidity        AT %MW4    : REAL := 15.0; (* NTU                     *)
    M_LeadPumpToggle      AT %MW6    : INT  := 1;    (* 1 = P1 lead, 2 = P2 lead*)

    (* --- Internal bits ----------------------------------------------------- *)
    M_PlantRun            AT %M10    : BOOL;  (* Master run seal-in latch        *)
    M_SafetyTrip          AT %M11    : BOOL;  (* Safety interlock trip latch     *)
    M_AlarmActive         AT %M12    : BOOL;  (* Alarm beacon / horn             *)
    M_LeadPumpCall        AT %M13    : BOOL;
    M_LagPumpCall         AT %M14    : BOOL;
    M_BlowerCallA         AT %M15    : BOOL;
    M_BlowerCallB         AT %M16    : BOOL;
    M_WeirOpenCmd         AT %M17    : BOOL;  (* AUTO discharge permit latch     *)
    M_WeirClosedLS        AT %M18    : BOOL;  (* Derived gate-closed flag        *)

    (* --- HMI command image (SCADA faceplate soft buttons) ------------------ *)
    Cmd_WeirManualMode                : BOOL;
    Cmd_WeirJogOpen                   : BOOL;
    Cmd_WeirJogClose                  : BOOL;
    Cmd_SwapLeadPump                  : BOOL;
END_VAR

(*-----------------------------------------------------------------------------
  ENGINEERING CONSTANTS
-----------------------------------------------------------------------------*)
VAR_GLOBAL CONSTANT
    EQ_LEAD_START_M        : REAL := 3.0;    (* lead pump call level            *)
    EQ_LAG_START_M         : REAL := 6.0;    (* lag pump call level             *)
    EQ_LAG_STOP_M          : REAL := 4.5;    (* lag pump drop-out level         *)
    EQ_ALL_STOP_M          : REAL := 1.0;    (* both pumps drop out / rotate    *)
    VFD_MIN_PCT            : REAL := 40.0;
    VFD_LEAD_MAX_PCT       : REAL := 85.0;
    VFD_LAG_PCT            : REAL := 100.0;
    VFD_RAMP_PCT_PER_S     : REAL := 45.0;

    DO_DEADBAND            : REAL := 0.25;   (* mg/L either side of setpoint    *)
    DO_KP                  : REAL := 30.0;   (* % valve per mg/L                *)
    DO_KI                  : REAL := 8.0;    (* % valve per mg/L per second     *)
    DO_INTEGRAL_LIMIT      : REAL := 60.0;
    AIR_VALVE_MIN_PCT      : REAL := 15.0;
    AERATION_MIN_LEVEL_M   : REAL := 2.0;    (* diffuser dry-run guard          *)
    T_AERATION_COMPLETE    : TIME := T#8s;   (* DO held at setpoint             *)

    CLARIFIER_DISCHARGE_M      : REAL := 2.6;
    CLARIFIER_DISCHARGE_STOP_M : REAL := 1.4;
    T_WEIR_TRAVEL              : TIME := T#4s;

    TURBIDITY_TRIP_NTU     : REAL := 25.0;   (* hard trip, consent breach       *)
    RAS_MIN_CLARIFIER_M    : REAL := 0.6;
    COAGULANT_DOSE_FRACTION: REAL := 0.6;
END_VAR


(* #REGION safety *)
(*=============================================================================
  SECTION 1 - FB_SafetyInterlock  (DFB, highest priority, scanned first)
  ---------------------------------------------------------------------------
  Trips on ANY of:
      * %I0.0 I_EStop_NC = FALSE          (hardware E-Stop chain broken)
      * %I0.4 I_LSH_Equalization = TRUE   (HH float, basin flooding)
      * AI_Turbidity_Effluent > 25.0 NTU  (discharge consent breach)
  While tripped every actuator is inhibited and the weir gate is DRIVEN CLOSED
  so that out-of-spec effluent cannot reach the watercourse. The latch is
  retentive - it only clears on a rising edge of %I0.3 I_ResetFault_PB AND
  only once every trip condition has physically cleared.
=============================================================================*)
FUNCTION_BLOCK FB_SafetyInterlock
VAR_INPUT
    EStopHealthy  : BOOL;   (* %I0.0 - TRUE when the NC chain is intact *)
    FloatHH_Eq    : BOOL;   (* %I0.4 *)
    Turbidity     : REAL;   (* %IW108 *)
    ResetPB       : BOOL;   (* %I0.3 *)
END_VAR
VAR_OUTPUT
    Trip          : BOOL;   (* latched trip - inhibits all drives *)
    AlarmActive   : BOOL;   (* beacon / horn *)
    AlarmCode     : INT;    (* 0 none, 1 e-stop, 2 flood, 3 turbidity *)
    ForceWeirShut : BOOL;   (* demand to drive the sluice gate closed *)
END_VAR
VAR
    R_Reset       : R_TRIG;
    CondActive    : BOOL;
END_VAR

    (* Rung 1.1 - collect the live trip conditions (parallel branch = OR) *)
    CondActive := (NOT EStopHealthy) OR FloatHH_Eq OR (Turbidity > TURBIDITY_TRIP_NTU);

    (* Rung 1.2 - SET the retentive trip latch and capture the first-out code *)
    IF CondActive AND NOT Trip THEN
        Trip := TRUE;
        IF NOT EStopHealthy THEN
            AlarmCode := 1;
        ELSIF FloatHH_Eq THEN
            AlarmCode := 2;
        ELSE
            AlarmCode := 3;
        END_IF;
    END_IF;

    (* Rung 1.3 - RESET latch: rising edge acknowledgement, conditions clear *)
    R_Reset(CLK := ResetPB);
    IF R_Reset.Q AND NOT CondActive THEN
        Trip      := FALSE;
        AlarmCode := 0;
    END_IF;

    (* Rung 1.4 - alarm beacon and weir-shut demand follow the latch *)
    AlarmActive   := Trip;
    ForceWeirShut := Trip;

END_FUNCTION_BLOCK
(* #ENDREGION safety *)


(* #REGION leadlag *)
(*=============================================================================
  SECTION 3 - FB_LeadLagPump  (DFB)
  ---------------------------------------------------------------------------
  Duty/standby influent pumping from the equalization basin, driven by the
  ultrasonic level transmitter %IW100:

      level >= 3.0 m .......... start LEAD pump, VFD ramps 40 % -> 85 %
      level >= 6.0 m .......... start LAG pump,  VFD reference -> 100 %
      level <  4.5 m .......... LAG pump drops out (hysteresis)
      level <  1.0 m .......... both pumps drop out, duty rotates 1 <-> 2

  Duty rotation equalises running hours: on the falling edge of the pump call
  M_LeadPumpToggle alternates between 1 (pump 1 lead) and 2 (pump 2 lead).
  The VFD reference is rate limited to 45 %/s to emulate the drive's
  configured accel/decel ramp rather than stepping the analog output.
=============================================================================*)
FUNCTION_BLOCK FB_LeadLagPump
VAR_INPUT
    Enable        : BOOL;   (* plant running AND not tripped AND no HH float *)
    Level         : REAL;   (* %IW100 *)
    SwapRequest   : BOOL;   (* HMI immediate duty swap, rising edge *)
    dt            : REAL;   (* scan period in seconds *)
END_VAR
VAR_IN_OUT
    LeadToggle    : INT;    (* %MW6 *)
    SpeedRef      : REAL;   (* %QW100 - rate limited in place *)
END_VAR
VAR_OUTPUT
    Pump1         : BOOL;   (* %Q0.0 *)
    Pump2         : BOOL;   (* %Q0.1 *)
    LeadCall      : BOOL;   (* %M13 *)
    LagCall       : BOOL;   (* %M14 *)
END_VAR
VAR
    F_Call        : F_TRIG;
    R_Swap        : R_TRIG;
    TargetSpeed   : REAL;
    Span          : REAL;
    MaxStep       : REAL;
END_VAR

    (* Rung 3.1 - lead pump call with hysteresis *)
    IF NOT Enable THEN
        LeadCall := FALSE;
        LagCall  := FALSE;
    ELSE
        IF Level >= EQ_LEAD_START_M THEN
            LeadCall := TRUE;
        ELSIF Level < EQ_ALL_STOP_M THEN
            LeadCall := FALSE;
        END_IF;

        (* Rung 3.2 - lag pump call with its own hysteresis band *)
        IF Level >= EQ_LAG_START_M THEN
            LagCall := TRUE;
        ELSIF Level < EQ_LAG_STOP_M THEN
            LagCall := FALSE;
        END_IF;

        LagCall := LagCall AND LeadCall;
    END_IF;

    (* Rung 3.3 - duty rotation on the falling edge of the pump call *)
    F_Call(CLK := LeadCall);
    R_Swap(CLK := SwapRequest);
    IF F_Call.Q OR R_Swap.Q THEN
        IF LeadToggle = 1 THEN
            LeadToggle := 2;
        ELSE
            LeadToggle := 1;
        END_IF;
    END_IF;

    (* Rung 3.4 - map the duty/standby calls onto the physical contactors *)
    IF LeadToggle = 1 THEN
        Pump1 := LeadCall;
        Pump2 := LagCall;
    ELSE
        Pump1 := LagCall;
        Pump2 := LeadCall;
    END_IF;

    (* Rung 3.5 - VFD speed reference with accel/decel ramp limiting *)
    IF LagCall THEN
        TargetSpeed := VFD_LAG_PCT;
    ELSIF LeadCall THEN
        Span := (Level - EQ_LEAD_START_M) / (EQ_LAG_START_M - EQ_LEAD_START_M);
        IF Span < 0.0 THEN Span := 0.0; END_IF;
        IF Span > 1.0 THEN Span := 1.0; END_IF;
        TargetSpeed := VFD_MIN_PCT + Span * (VFD_LEAD_MAX_PCT - VFD_MIN_PCT);
    ELSE
        TargetSpeed := 0.0;
    END_IF;

    MaxStep := VFD_RAMP_PCT_PER_S * dt;
    IF TargetSpeed > SpeedRef THEN
        SpeedRef := MIN(TargetSpeed, SpeedRef + MaxStep);
    ELSE
        SpeedRef := MAX(TargetSpeed, SpeedRef - MaxStep);
    END_IF;

END_FUNCTION_BLOCK
(* #ENDREGION leadlag *)


(* #REGION aeration *)
(*=============================================================================
  SECTION 4 - FB_AerationDO  (DFB)
  ---------------------------------------------------------------------------
  Maintains biological digestion oxygen in the multi-stage aeration basins.
  The dissolved oxygen probe %IW106 is compared against the %MW2 setpoint
  (2.5 mg/L default) and a PI algorithm modulates the air header control
  valve %QW102. The diffuser blowers %Q0.2 / %Q0.3 start on a deadband
  around the setpoint so the motors are not chattered by probe noise.

  Dry-run protection: a blower can never run with its basin below 2.0 m -
  running diffusers in air destroys the membranes.
=============================================================================*)
FUNCTION_BLOCK FB_AerationDO
VAR_INPUT
    Enable        : BOOL;
    DO_Measured   : REAL;   (* %IW106 *)
    DO_Setpoint   : REAL;   (* %MW2 *)
    LevelA        : REAL;   (* %IW102 *)
    LevelB        : REAL;   (* %IW104 *)
    FloatHH_A     : BOOL;   (* %I0.5 *)
    FloatHH_B     : BOOL;   (* %I0.6 *)
    dt            : REAL;
END_VAR
VAR_IN_OUT
    Integral      : REAL;
    AtTargetMs    : REAL;   (* aeration-complete accumulator *)
END_VAR
VAR_OUTPUT
    BlowerA       : BOOL;   (* %Q0.2 *)
    BlowerB       : BOOL;   (* %Q0.3 *)
    ValvePos      : REAL;   (* %QW102 *)
    CallA         : BOOL;   (* %M15 *)
    CallB         : BOOL;   (* %M16 *)
    AerationDone  : BOOL;
END_VAR
VAR
    Err           : REAL;
    Demand        : REAL;
END_VAR

    Err := DO_Setpoint - DO_Measured;

    (* Rung 4.1 - blower call with symmetric deadband around the setpoint *)
    IF NOT Enable THEN
        CallA := FALSE;
    ELSIF Err > DO_DEADBAND THEN
        CallA := TRUE;
    ELSIF Err < (0.0 - DO_DEADBAND) THEN
        CallA := FALSE;
    END_IF;

    (* Rung 4.2 - basin B trails basin A; both are fed from the same header *)
    CallB := CallA AND Enable;

    (* Rung 4.3 - diffuser dry-run interlock *)
    BlowerA := CallA AND (LevelA >= AERATION_MIN_LEVEL_M);
    BlowerB := CallB AND (LevelB >= AERATION_MIN_LEVEL_M);

    (* Rung 4.4 - PI modulation of the air header control valve *)
    IF BlowerA OR BlowerB THEN
        Integral := Integral + DO_KI * Err * dt;
        IF Integral >  DO_INTEGRAL_LIMIT THEN Integral :=  DO_INTEGRAL_LIMIT; END_IF;
        IF Integral < (0.0 - DO_INTEGRAL_LIMIT) THEN Integral := 0.0 - DO_INTEGRAL_LIMIT; END_IF;
        Demand := AIR_VALVE_MIN_PCT + DO_KP * Err + Integral;
        IF Demand < AIR_VALVE_MIN_PCT THEN Demand := AIR_VALVE_MIN_PCT; END_IF;
        IF Demand > 100.0 THEN Demand := 100.0; END_IF;
        ValvePos := Demand;
    ELSE
        Integral := 0.0;
        ValvePos := 0.0;
    END_IF;

    (* Rung 4.5 - high level float guards force the air off and inhibit inflow *)
    IF FloatHH_A THEN BlowerA := FALSE; END_IF;
    IF FloatHH_B THEN BlowerB := FALSE; END_IF;

    (* Rung 4.6 - digestion batch complete when DO is held at setpoint *)
    IF Enable AND (DO_Measured >= (DO_Setpoint - DO_DEADBAND)) THEN
        AtTargetMs := AtTargetMs + dt * 1000.0;
    ELSE
        AtTargetMs := 0.0;
    END_IF;
    AerationDone := AtTargetMs >= TIME_TO_REAL(T_AERATION_COMPLETE);

END_FUNCTION_BLOCK
(* #ENDREGION aeration *)


(* #REGION weir *)
(*=============================================================================
  SECTION 6 - FB_WeirGateControl  (DFB)
  ---------------------------------------------------------------------------
  Drives the motorised effluent sluice weir gate. The gate only opens when
  the secondary clarifier has reached discharge level AND the effluent
  turbidity is inside the %MW4 consent limit (15.0 NTU default):

      OPEN  : ClarifierLevel >= 2.6 m AND Turbidity < M_MaxTurbidity
      CLOSE : ClarifierLevel <  1.4 m OR  Turbidity >= M_MaxTurbidity
              OR ForceShut (safety interlock)

  Only %I0.7 (fully open) exists in the field; the closed position is derived
  from a 4 s travel timer on the CLOSE contactor. %Q0.6 and %Q0.7 are
  hard mutually exclusive - both contactors energised would short the
  reversing starter.
=============================================================================*)
FUNCTION_BLOCK FB_WeirGateControl
VAR_INPUT
    Enable          : BOOL;
    ForceShut       : BOOL;   (* from FB_SafetyInterlock *)
    ClarifierLevel  : REAL;
    Turbidity       : REAL;   (* %IW108 *)
    MaxTurbidity    : REAL;   (* %MW4 *)
    OpenLS          : BOOL;   (* %I0.7 *)
    ManualMode      : BOOL;
    JogOpen         : BOOL;
    JogClose        : BOOL;
    dt              : REAL;
END_VAR
VAR_IN_OUT
    OpenCmd         : BOOL;   (* %M17 - AUTO discharge permit latch *)
    CloseTimerMs    : REAL;
    ClosedLS        : BOOL;   (* %M18 *)
END_VAR
VAR_OUTPUT
    MotorOpen       : BOOL;   (* %Q0.6 *)
    MotorClose      : BOOL;   (* %Q0.7 *)
END_VAR
VAR
    QualityOK       : BOOL;
END_VAR

    QualityOK := Turbidity < MaxTurbidity;

    (* Rung 6.1 - AUTO discharge permit latch *)
    IF ForceShut OR NOT Enable OR NOT QualityOK THEN
        OpenCmd := FALSE;
    ELSIF ClarifierLevel >= CLARIFIER_DISCHARGE_M THEN
        OpenCmd := TRUE;
    ELSIF ClarifierLevel < CLARIFIER_DISCHARGE_STOP_M THEN
        OpenCmd := FALSE;
    END_IF;

    (* Rung 6.2 - contactor commands, AUTO vs MANUAL jog *)
    IF ForceShut THEN
        MotorOpen  := FALSE;
        MotorClose := NOT ClosedLS;
    ELSIF ManualMode THEN
        MotorOpen  := JogOpen AND NOT JogClose AND NOT OpenLS;
        MotorClose := JogClose AND NOT JogOpen AND NOT ClosedLS;
    ELSE
        MotorOpen  := OpenCmd AND NOT OpenLS;
        MotorClose := NOT OpenCmd AND NOT ClosedLS;
    END_IF;

    (* Rung 6.3 - hard mutual exclusion on the reversing starter *)
    IF MotorOpen AND MotorClose THEN
        MotorOpen  := FALSE;
        MotorClose := FALSE;
    END_IF;

    (* Rung 6.4 - derived closed position from the CLOSE travel timer *)
    IF MotorClose THEN
        CloseTimerMs := CloseTimerMs + dt * 1000.0;
        IF CloseTimerMs >= TIME_TO_REAL(T_WEIR_TRAVEL) THEN
            ClosedLS   := TRUE;
            MotorClose := FALSE;
        END_IF;
    ELSE
        IF MotorOpen THEN
            ClosedLS     := FALSE;
            CloseTimerMs := 0.0;
        END_IF;
    END_IF;

END_FUNCTION_BLOCK
(* #ENDREGION weir *)


(* #REGION program *)
(*=============================================================================
  PROGRAM WastewaterPlant - MAST task body, 50 ms cyclic
=============================================================================*)
PROGRAM WastewaterPlant
VAR
    FB_Safety   : FB_SafetyInterlock;
    FB_Pumps    : FB_LeadLagPump;
    FB_Aeration : FB_AerationDO;
    FB_Weir     : FB_WeirGateControl;
    R_Start     : R_TRIG;
    R_Stop      : R_TRIG;
    dt          : REAL := 0.05;          (* MAST period in seconds *)
    ClarifierLevel : REAL;               (* secondary clarifier, from plant model *)
    PumpEnable  : BOOL;
    AerEnable   : BOOL;
    AerationDone: BOOL;
    Integral    : REAL;
    AtTargetMs  : REAL;
    CloseTimer  : REAL;
END_VAR

(*--- SECTION 1 : safety interlock, scanned first ---------------------------*)
FB_Safety(EStopHealthy := I_EStop_NC,
          FloatHH_Eq   := I_LSH_Equalization,
          Turbidity    := AI_Turbidity_Effluent,
          ResetPB      := I_ResetFault_PB);

M_SafetyTrip  := FB_Safety.Trip;
M_AlarmActive := FB_Safety.AlarmActive;

(*--- SECTION 2 : master run seal-in and %MW0 state machine -----------------*)
R_Start(CLK := I_PlantStart_PB);
R_Stop (CLK := I_PlantStop_PB);

IF M_SafetyTrip OR R_Stop.Q THEN
    M_PlantRun := FALSE;                          (* stop dominant *)
ELSIF R_Start.Q THEN
    M_PlantRun := TRUE;
END_IF;

IF M_SafetyTrip THEN
    M_PlantState := 99;                           (* ALARM *)
ELSIF NOT M_PlantRun THEN
    M_PlantState := 0;                            (* OFF *)
ELSE
    CASE M_PlantState OF
        0, 99:
            M_PlantState := 1;                    (* -> EQUALIZING *)
        1:
            IF AI_LT_AerationA >= AERATION_MIN_LEVEL_M THEN
                M_PlantState := 2;                (* -> AERATION_ACTIVE *)
            END_IF;
        2:
            IF AerationDone THEN
                M_PlantState := 3;                (* -> CLARIFYING *)
            ELSIF AI_LT_AerationA < AERATION_MIN_LEVEL_M THEN
                M_PlantState := 1;
            END_IF;
        3:
            IF (ClarifierLevel >= CLARIFIER_DISCHARGE_M)
               AND (AI_Turbidity_Effluent < M_MaxTurbidity) THEN
                M_PlantState := 4;                (* -> EFFLUENT_DISCHARGE *)
            END_IF;
        4:
            IF ClarifierLevel < CLARIFIER_DISCHARGE_STOP_M THEN
                M_PlantState := 1;                (* cycle repeats *)
            END_IF;
    END_CASE;
END_IF;

(*--- SECTION 3 : influent lead/lag pumping ---------------------------------*)
PumpEnable := M_PlantRun AND NOT M_SafetyTrip
              AND NOT I_LSH_AerationA AND NOT I_LSH_AerationB;

FB_Pumps(Enable      := PumpEnable,
         Level       := AI_LT_EqBasin,
         SwapRequest := Cmd_SwapLeadPump,
         dt          := dt,
         LeadToggle  := M_LeadPumpToggle,
         SpeedRef    := AQ_VFD_InfluentSpeed);

Q_Pump_RawInfluent1 := FB_Pumps.Pump1;
Q_Pump_RawInfluent2 := FB_Pumps.Pump2;
M_LeadPumpCall      := FB_Pumps.LeadCall;
M_LagPumpCall       := FB_Pumps.LagCall;

(*--- SECTION 4 : dissolved oxygen control ----------------------------------*)
AerEnable := M_PlantRun AND NOT M_SafetyTrip AND (M_PlantState >= 2);

FB_Aeration(Enable      := AerEnable,
            DO_Measured := AI_DO_AerationA,
            DO_Setpoint := M_TargetDO,
            LevelA      := AI_LT_AerationA,
            LevelB      := AI_LT_AerationB,
            FloatHH_A   := I_LSH_AerationA,
            FloatHH_B   := I_LSH_AerationB,
            dt          := dt,
            Integral    := Integral,
            AtTargetMs  := AtTargetMs);

Q_Blower_AerationA   := FB_Aeration.BlowerA;
Q_Blower_AerationB   := FB_Aeration.BlowerB;
AQ_AirValve_Aeration := FB_Aeration.ValvePos;
M_BlowerCallA        := FB_Aeration.CallA;
M_BlowerCallB        := FB_Aeration.CallB;
AerationDone         := FB_Aeration.AerationDone;

(*--- SECTION 5 : RAS recirculation and coagulant dosing --------------------*)
(* Rung 5.1 - RAS returns settled biomass to the head of the aeration train *)
Q_Pump_RAS := M_PlantRun AND NOT M_SafetyTrip
              AND (M_PlantState >= 2)
              AND (ClarifierLevel > RAS_MIN_CLARIFIER_M)
              AND (AI_LT_AerationA < 5.5);

(* Rung 5.2 - polymer coagulant dosing to knock down carry-over solids *)
Q_Pump_Coagulant := M_PlantRun AND NOT M_SafetyTrip
                    AND (M_PlantState >= 3)
                    AND (AI_Turbidity_Effluent > (M_MaxTurbidity * COAGULANT_DOSE_FRACTION));

(*--- SECTION 6 : motorised effluent weir sluice gate -----------------------*)
FB_Weir(Enable         := M_PlantRun,
        ForceShut      := FB_Safety.ForceWeirShut,
        ClarifierLevel := ClarifierLevel,
        Turbidity      := AI_Turbidity_Effluent,
        MaxTurbidity   := M_MaxTurbidity,
        OpenLS         := I_WeirOpenLS,
        ManualMode     := Cmd_WeirManualMode,
        JogOpen        := Cmd_WeirJogOpen,
        JogClose       := Cmd_WeirJogClose,
        dt             := dt,
        OpenCmd        := M_WeirOpenCmd,
        CloseTimerMs   := CloseTimer,
        ClosedLS       := M_WeirClosedLS);

Q_Motor_WeirOpen  := FB_Weir.MotorOpen;
Q_Motor_WeirClose := FB_Weir.MotorClose;

(*--- SECTION 7 : final safety enforcement (de-energise on trip) ------------*)
IF M_SafetyTrip OR NOT M_PlantRun THEN
    Q_Pump_RawInfluent1  := FALSE;
    Q_Pump_RawInfluent2  := FALSE;
    Q_Blower_AerationA   := FALSE;
    Q_Blower_AerationB   := FALSE;
    Q_Pump_RAS           := FALSE;
    Q_Pump_Coagulant     := FALSE;
    AQ_VFD_InfluentSpeed := 0.0;
    AQ_AirValve_Aeration := 0.0;
END_IF;

END_PROGRAM
(* #ENDREGION program *)
