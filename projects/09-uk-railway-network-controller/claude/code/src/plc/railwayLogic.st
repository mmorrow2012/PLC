(*
  ===========================================================================
   UK INTERCITY RAILWAY NETWORK & BLOCK SIGNALLING CONTROLLER
   ---------------------------------------------------------------------------
   Target CPU  : Siemens S7-1500F / Schneider Modicon M580 Safety (SIL4)
   Language    : IEC 61131-3 Structured Text with FBD/LD networks
   Task        : MAST, cyclic, 50 ms, watchdog 150 ms
   Application : London - Coventry - Birmingham - Bristol - Liverpool -
                 Manchester - Leeds - Glasgow - Edinburgh
   ---------------------------------------------------------------------------
   Safety note : %I0.0 (E-Stop) and %I0.7 (point detection) are wired as
                 normally-closed, fail-safe loops. A broken wire therefore
                 reads FALSE and trips the interlocking, dropping the traction
                 supply relay %Q0.7 and applying emergency brakes network wide.
  ===========================================================================
*)

(* #REGION types *)
TYPE
    E_NetworkState :
        (
            STOPPED         := 0,
            SCHEDULED_RUN   := 1,
            EXPRESS_SERVICE := 2,
            SIGNAL_FAULT    := 99
        ) INT;

    E_Aspect :
        (
            ASPECT_RED       := 0,
            ASPECT_YELLOW    := 1,
            ASPECT_DBL_YELLOW := 2,
            ASPECT_GREEN     := 3
        ) INT;

    ST_DepartureRegister : STRUCT
        StationIndex : INT;   (* +0  index into the 9-station table          *)
        ScheduledMin : INT;   (* +1  booked time, minutes since midnight     *)
        ExpectedMin  : INT;   (* +2  live estimate, minutes since midnight   *)
        Platform     : INT;   (* +3  platform allocation                     *)
        StatusCode   : INT;   (* +4  0=ON TIME 1=BOARDING 2=DEPARTED
                                     3=DELAYED 4=ARRIVED 5=CANCELLED        *)
    END_STRUCT;
END_TYPE
(* #ENDREGION types *)

(* #REGION globals *)
VAR_GLOBAL
    (* ---- Digital inputs %IX ------------------------------------------- *)
    I_EStop_NC              AT %I0.0 : BOOL;   (* NC master signal trip     *)
    I_MasterRun_PB          AT %I0.1 : BOOL;   (* timetable service run PB  *)
    I_ResetFault_PB         AT %I0.2 : BOOL;   (* alarm reset PB            *)
    I_AxleCounter_London    AT %I0.3 : BOOL;   (* London Terminal block     *)
    I_AxleCounter_Brum      AT %I0.4 : BOOL;   (* Birmingham New Street     *)
    I_AxleCounter_Manchester AT %I0.5 : BOOL;  (* Manchester Piccadilly     *)
    I_AxleCounter_Edinburgh AT %I0.6 : BOOL;   (* Edinburgh Waverley        *)
    I_PointSwitch_Normal    AT %I0.7 : BOOL;   (* point detection & lock    *)

    (* ---- Analog inputs %IW -------------------------------------------- *)
    AI_TractionSpeed_Intercity1 AT %IW100 : REAL;  (* 0.0 .. 220.0 km/h     *)
    AI_TractionSpeed_Intercity2 AT %IW102 : REAL;  (* 0.0 .. 220.0 km/h     *)
    AI_TrackCurvature_Limit     AT %IW104 : REAL;  (* ATP limit 0 .. 200    *)

    (* ---- Digital outputs %QX ------------------------------------------ *)
    Q_Signal_London_Green     AT %Q0.0 : BOOL;
    Q_Signal_Brum_Green       AT %Q0.1 : BOOL;
    Q_Signal_Manchester_Green AT %Q0.2 : BOOL;
    Q_Signal_Scotland_Green   AT %Q0.3 : BOOL;
    Q_PointMotor_AlignMain    AT %Q0.4 : BOOL;
    Q_PointMotor_AlignBranch  AT %Q0.5 : BOOL;
    Q_PlatformBuzzer          AT %Q0.6 : BOOL;
    Q_MasterSafetyRelay       AT %Q0.7 : BOOL;

    (* ---- Analog outputs %QW ------------------------------------------- *)
    AQ_VFD_TractionSpeed1 AT %QW100 : REAL;   (* traction reference, 0-100% *)
    AQ_VFD_TractionSpeed2 AT %QW102 : REAL;

    (* ---- Internal memory %M / %MW ------------------------------------- *)
    M_NetworkState        AT %MW0  : E_NetworkState;
    M_TargetSpeed_Train1  AT %MW2  : REAL;
    M_TargetSpeed_Train2  AT %MW4  : REAL;
    M_ActiveBlockCount    AT %MW6  : INT;
    M_PermittedSpeed1     AT %MW8  : REAL;
    M_PermittedSpeed2     AT %MW9  : REAL;
    M_TimetableTable      AT %MW10 : ARRAY [0..7] OF ST_DepartureRegister;
    M_ClockSeconds        AT %MW60 : DINT;
    M_WorstDelayMin       AT %MW70 : INT;

    M_NetworkRun          AT %M10.0 : BOOL;
    M_SafetyTrip          AT %M10.1 : BOOL;
    M_AlarmActive         AT %M10.2 : BOOL;
    M_PointDetectFault    AT %M10.3 : BOOL;
    M_PointReverseCmd     AT %M10.4 : BOOL;
    M_BrakeDemand_Train1  AT %M10.5 : BOOL;
    M_BrakeDemand_Train2  AT %M10.6 : BOOL;

    (* ---- Axle-counter evaluator image (remote IO over PROFIsafe) ------- *)
    G_BlockOccupied : ARRAY [0..18] OF BOOL;
    G_BlockAspect   : ARRAY [0..18] OF E_Aspect;
END_VAR

VAR_GLOBAL CONSTANT
    C_ScanMs               : TIME := T#50ms;
    C_PointDetectTimeout   : TIME := T#4s;
    C_BrakingDistanceKm    : REAL := 14.0;
    C_SpeedCapYellow       : REAL := 40.0;
    C_SpeedCapDblYellow    : REAL := 90.0;
    C_LineSpeedScheduled   : REAL := 165.0;
    C_LineSpeedExpress     : REAL := 200.0;
    C_VfdFullScaleKmh      : REAL := 220.0;
    C_VfdRampUpPct         : REAL := 0.55;   (* per scan *)
    C_VfdRampDownPct       : REAL := 1.80;   (* per scan *)
    C_StationDwell         : TIME := T#6m;
    C_DelayThresholdMin    : INT  := 5;
END_VAR
(* #ENDREGION globals *)

(* #REGION safety *)
(*
  -----------------------------------------------------------------------
   FB_SafetyInterlock  -  SIL4, solved first, dominates every other network
  -----------------------------------------------------------------------
   Trips on a broken emergency signal chain (%I0.0 = FALSE) or on loss of
   point detection (%I0.7 = FALSE) held for longer than the detection
   watchdog. The trip latch is retentive: it survives a warm restart and is
   only released by an acknowledged reset with every condition healthy.
*)
FUNCTION_BLOCK FB_SafetyInterlock
VAR_INPUT
    EStopChain   : BOOL;   (* %I0.0 - TRUE = healthy loop *)
    PointDetect  : BOOL;   (* %I0.7 - TRUE = closed and locked *)
    ResetPB      : BOOL;   (* %I0.2 *)
    ScanTime     : TIME;
END_VAR
VAR_OUTPUT
    Trip           : BOOL;
    AlarmActive    : BOOL;
    DetectFault    : BOOL;
    TractionRelay  : BOOL;
END_VAR
VAR
    DetectTimer    : TON;
    TripCondition  : BOOL;
END_VAR

    (* Point detection watchdog - the machine is allowed to be out of
       correspondence while it drives over, but not indefinitely. *)
    DetectTimer(IN := NOT PointDetect, PT := C_PointDetectTimeout);
    DetectFault := DetectTimer.Q;

    TripCondition := (NOT EStopChain) OR DetectFault;

    (* Set-dominant retentive latch *)
    IF TripCondition THEN
        Trip := TRUE;
    ELSIF ResetPB THEN
        Trip := FALSE;
    END_IF;

    AlarmActive   := Trip OR TripCondition;
    TractionRelay := M_NetworkRun AND NOT Trip;
END_FUNCTION_BLOCK
(* #ENDREGION safety *)

(* #REGION interlock *)
(*
  -----------------------------------------------------------------------
   FB_TrackBlockInterlock  -  absolute block working
  -----------------------------------------------------------------------
   Every block carries an axle-counter section. A signal only shows a
   proceed aspect when its own block is clear; the aspect steps down as
   occupancy appears in the blocks beyond it:

        block occupied              -> RED            (danger)
        block clear, next occupied  -> YELLOW         (caution)
        next clear, second occupied -> DOUBLE YELLOW  (prelim. caution)
        otherwise                   -> GREEN          (clear)

   The four hard-wired heads %I0.3 - %I0.6 overwrite the corresponding
   entries of the evaluator image so a failed counter cannot be masked by
   a stale telegram.
*)
FUNCTION_BLOCK FB_TrackBlockInterlock
VAR_INPUT
    AxleLondon      : BOOL;
    AxleBrum        : BOOL;
    AxleManchester  : BOOL;
    AxleEdinburgh   : BOOL;
    SafetyTrip      : BOOL;
    NetworkRun      : BOOL;
END_VAR
VAR_OUTPUT
    SigLondon       : BOOL;
    SigBrum         : BOOL;
    SigManchester   : BOOL;
    SigScotland     : BOOL;
    BlockCount      : INT;
END_VAR
VAR
    i               : INT;
    j               : INT;
    NextOccupied    : BOOL;
    SecondOccupied  : BOOL;
END_VAR

    (* --- Hard-wired heads take precedence over the remote telegrams ---- *)
    G_BlockOccupied[BLK_LON] := AxleLondon;
    G_BlockOccupied[BLK_BHM] := AxleBrum;
    G_BlockOccupied[BLK_MAN] := AxleManchester;
    G_BlockOccupied[BLK_EDI] := AxleEdinburgh;

    BlockCount := 0;
    FOR i := 0 TO 18 DO
        IF G_BlockOccupied[i] THEN
            BlockCount := BlockCount + 1;
        END_IF;
    END_FOR;

    (* --- Aspect solver ------------------------------------------------- *)
    FOR i := 0 TO 18 DO
        IF SafetyTrip OR NOT NetworkRun OR G_BlockOccupied[i] THEN
            G_BlockAspect[i] := ASPECT_RED;
        ELSE
            NextOccupied   := FALSE;
            SecondOccupied := FALSE;
            FOR j := 0 TO 2 DO
                IF BlockSuccessor(i, j) >= 0 THEN
                    IF G_BlockOccupied[BlockSuccessor(i, j)] THEN
                        NextOccupied := TRUE;
                    END_IF;
                    IF SuccessorOccupiedAhead(BlockSuccessor(i, j)) THEN
                        SecondOccupied := TRUE;
                    END_IF;
                END_IF;
            END_FOR;

            IF NextOccupied THEN
                G_BlockAspect[i] := ASPECT_YELLOW;
            ELSIF SecondOccupied THEN
                G_BlockAspect[i] := ASPECT_DBL_YELLOW;
            ELSE
                G_BlockAspect[i] := ASPECT_GREEN;
            END_IF;
        END_IF;
    END_FOR;

    (* --- The four physical signal heads --------------------------------- *)
    SigLondon     := (G_BlockAspect[SEC_LON_COV] = ASPECT_GREEN);
    SigBrum       := (G_BlockAspect[BLK_BHM]     = ASPECT_GREEN);
    SigManchester := (G_BlockAspect[BLK_MAN]     = ASPECT_GREEN);
    SigScotland   := (G_BlockAspect[BLK_GLA]     = ASPECT_GREEN);
END_FUNCTION_BLOCK
(* #ENDREGION interlock *)

(* #REGION speed *)
(*
  -----------------------------------------------------------------------
   FB_SpeedSupervision  -  traction reference modulation
  -----------------------------------------------------------------------
   Solves the movement-authority ceiling as

     v_permitted = MIN( operator setpoint  %MW2 / %MW4,
                        network line speed (state dependent),
                        ATP curvature limit %IW104,
                        permanent-way speed of the occupied block,
                        braking curve towards the next signal )

   and slews %QW100 / %QW102 towards it. A signal at danger is approached
   on a linear ramp that reaches standstill at the block joint, which is
   what makes the train visibly ease down rather than slam on.
*)
FUNCTION_BLOCK FB_SpeedSupervision
VAR_INPUT
    ActualSpeed    : REAL;
    Setpoint       : REAL;
    ATPLimit       : REAL;
    BlockLineSpeed : REAL;
    NextAspect     : E_Aspect;
    DistanceToJoint : REAL;   (* km to the block joint ahead *)
    AtPlatform     : BOOL;
    LineSpeedCap   : REAL;
    TractionHealthy : BOOL;
END_VAR
VAR_IN_OUT
    VfdReference   : REAL;    (* %QW100 or %QW102 *)
END_VAR
VAR_OUTPUT
    Permitted      : REAL;
    BrakeDemand    : BOOL;
    Overspeed      : BOOL;
END_VAR
VAR
    Authority      : REAL;
    DemandPct      : REAL;
END_VAR

    (* --- Movement authority from the aspect ahead ---------------------- *)
    IF AtPlatform THEN
        IF NextAspect = ASPECT_RED THEN
            Authority := 0.0;
        ELSE
            Authority := LineSpeedCap;
        END_IF;
    ELSE
        CASE NextAspect OF
            ASPECT_RED:
                Authority := (DistanceToJoint / C_BrakingDistanceKm) * LineSpeedCap;
                IF Authority > LineSpeedCap THEN Authority := LineSpeedCap; END_IF;
                IF Authority < 0.0 THEN Authority := 0.0; END_IF;
            ASPECT_YELLOW:
                IF DistanceToJoint > 30.0 THEN
                    Authority := C_SpeedCapDblYellow;
                ELSE
                    Authority := C_SpeedCapYellow;
                END_IF;
            ASPECT_DBL_YELLOW:
                Authority := MIN(LineSpeedCap, 145.0);
        ELSE
            Authority := LineSpeedCap;
        END_CASE;
    END_IF;

    (* --- Solve the ceiling --------------------------------------------- *)
    IF NOT TractionHealthy THEN
        Permitted := 0.0;
    ELSE
        Permitted := MIN(Setpoint, LineSpeedCap);
        Permitted := MIN(Permitted, ATPLimit);
        Permitted := MIN(Permitted, BlockLineSpeed);
        Permitted := MIN(Permitted, Authority);
    END_IF;

    BrakeDemand := (NextAspect = ASPECT_RED)
                   AND (AtPlatform OR (DistanceToJoint <= C_BrakingDistanceKm));
    Overspeed   := ActualSpeed > ATPLimit;

    (* --- Ramp the analog reference (no step demands on a traction VFD) -- *)
    DemandPct := (Permitted / C_VfdFullScaleKmh) * 100.0;
    IF NOT TractionHealthy THEN
        VfdReference := 0.0;
    ELSIF DemandPct > VfdReference THEN
        VfdReference := MIN(DemandPct, VfdReference + C_VfdRampUpPct);
    ELSE
        VfdReference := MAX(DemandPct, VfdReference - C_VfdRampDownPct);
    END_IF;

    IF VfdReference < 0.0   THEN VfdReference := 0.0;   END_IF;
    IF VfdReference > 100.0 THEN VfdReference := 100.0; END_IF;
END_FUNCTION_BLOCK
(* #ENDREGION speed *)

(* #REGION timetable *)
(*
  -----------------------------------------------------------------------
   FB_TimetableManager  -  working timetable, PIS boards, %MW registers
  -----------------------------------------------------------------------
   Advances the network clock, grades each tracked service against its
   booked plan, publishes the departure register frames %MW10 - %MW50 that
   the passenger information boards at all nine stations read, and sounds
   the platform chime for the last minute of every station dwell.
*)
FUNCTION_BLOCK FB_TimetableManager
VAR_INPUT
    RunPB        : BOOL;
    SafetyTrip   : BOOL;
    ExpressReq   : BOOL;
    BoardingCall : BOOL;
    ScanTime     : TIME;
END_VAR
VAR_OUTPUT
    State        : E_NetworkState;
    WorstDelay   : INT;
    Chime        : BOOL;
END_VAR
VAR
    RunEdge      : R_TRIG;
    i            : INT;
    DelayMin     : INT;
END_VAR

    (* --- Alternate-action service run selector -------------------------- *)
    RunEdge(CLK := RunPB);
    IF RunEdge.Q AND NOT SafetyTrip THEN
        M_NetworkRun := NOT M_NetworkRun;
    END_IF;
    IF SafetyTrip THEN
        M_NetworkRun := FALSE;
    END_IF;

    (* --- Network clock, compressed 120:1 for the demonstrator ---------- *)
    M_ClockSeconds := M_ClockSeconds + ScanSecondsScaled(ScanTime);

    (* --- Operating state machine (%MW0) -------------------------------- *)
    IF SafetyTrip THEN
        State := SIGNAL_FAULT;
    ELSIF NOT M_NetworkRun THEN
        State := STOPPED;
    ELSIF ExpressReq THEN
        State := EXPRESS_SERVICE;
    ELSE
        State := SCHEDULED_RUN;
    END_IF;

    (* --- Delay attribution and register publication -------------------- *)
    WorstDelay := 0;
    FOR i := 0 TO 7 DO
        M_TimetableTable[i].StationIndex := NextDeparture_Station(i);
        M_TimetableTable[i].ScheduledMin := NextDeparture_Booked(i);
        M_TimetableTable[i].ExpectedMin  := NextDeparture_Expected(i);
        M_TimetableTable[i].Platform     := NextDeparture_Platform(i);

        DelayMin := M_TimetableTable[i].ExpectedMin - M_TimetableTable[i].ScheduledMin;
        IF DelayMin > WorstDelay THEN
            WorstDelay := DelayMin;
        END_IF;

        IF NextDeparture_Departed(i) THEN
            M_TimetableTable[i].StatusCode := 2;    (* DEPARTED *)
        ELSIF NextDeparture_Boarding(i) THEN
            M_TimetableTable[i].StatusCode := 1;    (* BOARDING *)
        ELSIF DelayMin >= C_DelayThresholdMin THEN
            M_TimetableTable[i].StatusCode := 3;    (* DELAYED  *)
        ELSE
            M_TimetableTable[i].StatusCode := 0;    (* ON TIME  *)
        END_IF;
    END_FOR;

    Chime := BoardingCall AND M_NetworkRun AND NOT SafetyTrip;
END_FUNCTION_BLOCK
(* #ENDREGION timetable *)

(* #REGION points *)
(*
  -----------------------------------------------------------------------
   Birmingham North Junction point machine and route locking
  -----------------------------------------------------------------------
   A reverse (branch) request is only accepted while the junction block is
   clear of axle counts, so a set route can never be pulled from under a
   train. The contactors drop out as soon as detection re-proves in the
   commanded lie; failure to re-prove within the watchdog raises a
   signalling fault through FB_SafetyInterlock.
*)
FUNCTION_BLOCK FB_PointMachine
VAR_INPUT
    ReverseRequest : BOOL;
    JunctionClear  : BOOL;
    Detection      : BOOL;   (* %I0.7 *)
    SafetyTrip     : BOOL;
END_VAR
VAR_OUTPUT
    DriveNormal    : BOOL;   (* %Q0.4 *)
    DriveReverse   : BOOL;   (* %Q0.5 *)
END_VAR

    IF NOT SafetyTrip AND JunctionClear THEN
        M_PointReverseCmd := ReverseRequest;
    END_IF;

    DriveNormal  := (NOT M_PointReverseCmd) AND (NOT Detection) AND (NOT SafetyTrip);
    DriveReverse := M_PointReverseCmd       AND (NOT Detection) AND (NOT SafetyTrip);
END_FUNCTION_BLOCK
(* #ENDREGION points *)

(* #REGION program *)
(*
  -----------------------------------------------------------------------
   PROGRAM Main  -  MAST task body, 50 ms
  -----------------------------------------------------------------------
*)
PROGRAM Main
VAR
    Safety      : FB_SafetyInterlock;
    Interlock   : FB_TrackBlockInterlock;
    Speed1      : FB_SpeedSupervision;
    Speed2      : FB_SpeedSupervision;
    Timetable   : FB_TimetableManager;
    Points      : FB_PointMachine;
    LineSpeedCap : REAL;
END_VAR

    (* --- 1. Safety first ------------------------------------------------ *)
    Safety(EStopChain  := I_EStop_NC,
           PointDetect := I_PointSwitch_Normal,
           ResetPB     := I_ResetFault_PB,
           ScanTime    := C_ScanMs);

    M_SafetyTrip       := Safety.Trip;
    M_AlarmActive      := Safety.AlarmActive;
    M_PointDetectFault := Safety.DetectFault;
    Q_MasterSafetyRelay := Safety.TractionRelay;

    (* --- 2. Block interlocking ------------------------------------------ *)
    Interlock(AxleLondon     := I_AxleCounter_London,
              AxleBrum       := I_AxleCounter_Brum,
              AxleManchester := I_AxleCounter_Manchester,
              AxleEdinburgh  := I_AxleCounter_Edinburgh,
              SafetyTrip     := M_SafetyTrip,
              NetworkRun     := M_NetworkRun);

    Q_Signal_London_Green     := Interlock.SigLondon;
    Q_Signal_Brum_Green       := Interlock.SigBrum;
    Q_Signal_Manchester_Green := Interlock.SigManchester;
    Q_Signal_Scotland_Green   := Interlock.SigScotland;
    M_ActiveBlockCount        := Interlock.BlockCount;

    (* --- 3. Traction speed supervision ---------------------------------- *)
    IF M_NetworkState = EXPRESS_SERVICE THEN
        LineSpeedCap := C_LineSpeedExpress;
    ELSE
        LineSpeedCap := C_LineSpeedScheduled;
    END_IF;

    Speed1(ActualSpeed     := AI_TractionSpeed_Intercity1,
           Setpoint        := M_TargetSpeed_Train1,
           ATPLimit        := AI_TrackCurvature_Limit,
           BlockLineSpeed  := BlockLineSpeedOf(TRAIN_1),
           NextAspect      := G_BlockAspect[NextBlockOf(TRAIN_1)],
           DistanceToJoint := DistanceToJointOf(TRAIN_1),
           AtPlatform      := AtPlatformOf(TRAIN_1),
           LineSpeedCap    := LineSpeedCap,
           TractionHealthy := Q_MasterSafetyRelay,
           VfdReference    := AQ_VFD_TractionSpeed1);

    Speed2(ActualSpeed     := AI_TractionSpeed_Intercity2,
           Setpoint        := M_TargetSpeed_Train2,
           ATPLimit        := BlockLineSpeedOf(TRAIN_2),
           BlockLineSpeed  := BlockLineSpeedOf(TRAIN_2),
           NextAspect      := G_BlockAspect[NextBlockOf(TRAIN_2)],
           DistanceToJoint := DistanceToJointOf(TRAIN_2),
           AtPlatform      := AtPlatformOf(TRAIN_2),
           LineSpeedCap    := LineSpeedCap,
           TractionHealthy := Q_MasterSafetyRelay,
           VfdReference    := AQ_VFD_TractionSpeed2);

    M_PermittedSpeed1    := Speed1.Permitted;
    M_PermittedSpeed2    := Speed2.Permitted;
    M_BrakeDemand_Train1 := Speed1.BrakeDemand;
    M_BrakeDemand_Train2 := Speed2.BrakeDemand;

    (* --- 4. Timetable, PIS boards and %MW registers ---------------------- *)
    Timetable(RunPB        := I_MasterRun_PB,
              SafetyTrip   := M_SafetyTrip,
              ExpressReq   := HMI_ExpressService,
              BoardingCall := AnyServiceBoarding(),
              ScanTime     := C_ScanMs);

    M_NetworkState   := Timetable.State;
    M_WorstDelayMin  := Timetable.WorstDelay;
    Q_PlatformBuzzer := Timetable.Chime;

    (* --- 5. Junction points ---------------------------------------------- *)
    Points(ReverseRequest := HMI_PointReverseRequest,
           JunctionClear  := NOT G_BlockOccupied[BLK_BHM],
           Detection      := I_PointSwitch_Normal,
           SafetyTrip     := M_SafetyTrip);

    Q_PointMotor_AlignMain   := Points.DriveNormal;
    Q_PointMotor_AlignBranch := Points.DriveReverse;
END_PROGRAM
(* #ENDREGION program *)
