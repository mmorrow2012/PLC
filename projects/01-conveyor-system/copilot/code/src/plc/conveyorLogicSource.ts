const conveyorLogicSource = `PROGRAM ConveyorSortingSystem
(*
  Schneider Electric Modicon M580 - EcoStruxure Control Expert
  IEC 61131-3 Structured Text
  Automated Conveyor Belt System with Safety Interlock & Part Sorting
*)

VAR_INPUT
  (* Safety & Control Inputs *)
  E_Stop : BOOL;              (* Emergency Stop - NC logic: FALSE = Emergency *)
  Reset_PB : BOOL;            (* Manual Reset Pushbutton *)
  
  (* Sensor Inputs *)
  Sensor_PartDetect : BOOL;   (* Photoelectric proximity sensor *)
  Sensor_Color : INT;         (* 1=Red/Reject, 2=Green/Accept, 3=Blue/Special *)
  Sensor_Weight : REAL;       (* Load cell weight in kg *)
END_VAR

VAR_OUTPUT
  (* Motor Control Outputs *)
  VFD_Run : BOOL;             (* Variable Frequency Drive run command *)
  VFD_Speed_Ref : REAL;       (* Speed reference % (0.0-100.0) *)
  
  (* Actuator Outputs *)
  Actuator_Diverter : BOOL;   (* Pneumatic diverter solenoid *)
  
  (* Status Outputs *)
  Alarm_Tower : DWORD;        (* Alarm beacon bitmask *)
END_VAR

VAR
  (* Internal State Variables *)
  Safety_Latched : BOOL := FALSE;
  Speed_Setpoint : REAL := 50.0;
  Part_InspectionActive : BOOL := FALSE;
  Part_RejectCondition : BOOL := FALSE;
END_VAR

(* ================================================================ *)
(* RUNG 1: SAFETY E-STOP INTERLOCK                                  *)
(* ================================================================ *)
(* Latch safety fault on E-Stop loss (NC logic) *)
IF NOT E_Stop THEN
  Safety_Latched := TRUE;
  Alarm_Tower := Alarm_Tower OR 16#0001;  (* Set alarm bit 0 *)
END_IF;

(* Reset safety latch with Reset_PB (only if E-Stop is safe) *)
IF Reset_PB AND E_Stop THEN
  Safety_Latched := FALSE;
  Alarm_Tower := Alarm_Tower AND 16#FFFE;  (* Clear alarm bit 0 *)
END_IF;

(* ================================================================ *)
(* RUNG 2: VFD RUN ENABLE                                           *)
(* ================================================================ *)
(* VFD runs only if E-Stop is safe AND safety not latched *)
VFD_Run := E_Stop AND NOT Safety_Latched;

(* ================================================================ *)
(* RUNG 3: PART DETECTION & INSPECTION                              *)
(* ================================================================ *)
Part_InspectionActive := Sensor_PartDetect;

(* ================================================================ *)
(* RUNG 4: REJECT DIVERTER LOGIC                                    *)
(* ================================================================ *)
(* Reject criteria: Color = 1 (Red) OR Weight > 2.0 kg *)
Part_RejectCondition := Sensor_PartDetect AND 
                        (Sensor_Color = 1 OR Sensor_Weight > 2.0);

(* Actuate diverter for rejected parts *)
Actuator_Diverter := Part_RejectCondition;

(* ================================================================ *)
(* RUNG 5: SPEED REFERENCE OUTPUT                                   *)
(* ================================================================ *)
IF VFD_Run THEN
  VFD_Speed_Ref := Speed_Setpoint;
ELSE
  VFD_Speed_Ref := 0.0;
END_IF;

END_PROGRAM`;

export default conveyorLogicSource;
