(* ========================================================================= *)
(* UK INTERCITY RAILWAY NETWORK & SIGNALING CONTROLLER                        *)
(* Standard: IEC 61131-3 Structured Text (ST)                                 *)
(* Hardware: Siemens S7-1500F / Modicon M580 SIL4 Railway Safety CPU         *)
(* ========================================================================= *)

PROGRAM RailwayNetworkInterlocking
VAR_INPUT
    DI_ESTOP_NC        : BOOL; (* Master Railway E-Stop *)
    DI_MASTER_RUN      : BOOL; (* Plant / Timetable Run Command *)
    DI_RESET_FAULT     : BOOL; (* Signal & Interlock Fault Reset *)
    DI_AXLE_LONDON     : BOOL; (* London Block Occupancy Sensor *)
    DI_AXLE_BRUM       : BOOL; (* Birmingham Block Occupancy Sensor *)
    DI_AXLE_MANCHESTER : BOOL; (* Manchester Block Occupancy Sensor *)
    DI_AXLE_EDINBURGH  : BOOL; (* Edinburgh Block Occupancy Sensor *)
    DI_POINT_ALIGN_MAIN: BOOL; (* Point Switch Alignment Limit *)
    AI_TRACTION_SPEED1 : REAL; (* Actual Train 1 Speed (km/h) *)
    AI_TRACTION_SPEED2 : REAL; (* Actual Train 2 Speed (km/h) *)
END_VAR

VAR_OUTPUT
    DO_SIGNAL_LONDON   : BOOL; (* London Aspect Green *)
    DO_SIGNAL_BRUM     : BOOL; (* Birmingham Aspect Green *)
    DO_SIGNAL_MANCH    : BOOL; (* Manchester Aspect Green *)
    DO_SIGNAL_SCOTLAND : BOOL; (* Scotland Border Aspect Green *)
    DO_POINT_MAIN      : BOOL; (* Main Line Point Motor *)
    DO_POINT_BRANCH    : BOOL; (* Branch Line Point Motor *)
    DO_PLATFORM_BUZZER : BOOL; (* Station Platform Chime *)
    DO_SAFETY_RELAY    : BOOL; (* Overhead Catenary Power *)
    AQ_VFD_SPEED1      : REAL; (* Train 1 Speed Reference (%) *)
    AQ_VFD_SPEED2      : REAL; (* Train 2 Speed Reference (%) *)
END_VAR

VAR
    fbSpeedSupervision : FB_SpeedSupervision;
    fbBlockInterlock   : FB_TrackBlockInterlock;
    fbTimetable        : FB_TimetableManager;
    fbSafety           : FB_SafetyInterlock;
END_VAR

(* Safety Interlock Supervision *)
fbSafety(EStop := DI_ESTOP_NC, PointMisaligned := NOT DI_POINT_ALIGN_MAIN);

IF fbSafety.Trip THEN
    DO_SAFETY_RELAY := FALSE;
    AQ_VFD_SPEED1 := 0.0;
    AQ_VFD_SPEED2 := 0.0;
    DO_SIGNAL_LONDON := FALSE;
    DO_SIGNAL_BRUM := FALSE;
    DO_SIGNAL_MANCH := FALSE;
    DO_SIGNAL_SCOTLAND := FALSE;
    RETURN;
END_IF;

DO_SAFETY_RELAY := TRUE;

(* Track Block Interlocking *)
fbBlockInterlock(
    OccLondon := DI_AXLE_LONDON,
    OccBrum := DI_AXLE_BRUM,
    OccManch := DI_AXLE_MANCHESTER,
    OccEdin := DI_AXLE_EDINBURGH
);

DO_SIGNAL_LONDON := NOT fbBlockInterlock.Block1_Occupied;
DO_SIGNAL_BRUM := NOT fbBlockInterlock.Block2_Occupied;
DO_SIGNAL_MANCH := NOT fbBlockInterlock.Block3_Occupied;
DO_SIGNAL_SCOTLAND := NOT fbBlockInterlock.Block4_Occupied;

(* VFD Speed Supervision *)
fbSpeedSupervision(
    Speed1 := AI_TRACTION_SPEED1,
    Speed2 := AI_TRACTION_SPEED2,
    SignalOk := DO_SIGNAL_LONDON
);

AQ_VFD_SPEED1 := fbSpeedSupervision.OutSpeed1;
AQ_VFD_SPEED2 := fbSpeedSupervision.OutSpeed2;

END_PROGRAM
