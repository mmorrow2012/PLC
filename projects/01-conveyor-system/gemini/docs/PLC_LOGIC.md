# PLC Logic & Tag Specification

## Digital Inputs (%I)
- `bStartPB` (BOOL): Start Push Button (Normally Open)
- `bStopPB` (BOOL): Stop Push Button (Normally Closed)
- `bEStop` (BOOL): Emergency Stop Circuit (Normally Closed)
- `bItemSensor` (BOOL): Conveyor Item Proximity Sensor

## Digital Outputs (%Q)
- `bMotorRun` (BOOL): Conveyor Drive Motor Contactor Output
- `bAlarmLight` (BOOL): Red Emergency Light Output
- `bRunningLight` (BOOL): Green Operation Light Output
