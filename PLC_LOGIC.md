# IEC 61131-3 PLC Memory Allocation & Logic Specifications

## 1. Hardware Digital Inputs (%IX / %I)
- `%I0.0` - `I_EStop_NC` (BOOL): Hardware Emergency Stop switch (NC, 24VDC).
- `%I0.1` - `I_StartBatch_PB` (BOOL): Operator Start Batch Pushbutton.
- `%I0.2` - `I_StopBatch_PB` (BOOL): Operator Stop / Pause Batch Pushbutton.
- `%I0.3` - `I_ResetFault_PB` (BOOL): Fault Acknowledgment & Reset Pushbutton.
- `%I0.4` - `I_LSH_TankA` (BOOL): High Level Float Guard Tank A.
- `%I0.5` - `I_LSH_TankB` (BOOL): High Level Float Guard Tank B.
- `%I0.6` - `I_LSH_Reactor` (BOOL): High Level Float Guard Reactor.
- `%I0.7` - `I_AgitatorHealth` (BOOL): Agitator Overload Protection Relay (NC).

## 2. Hardware Analog Inputs (%IW / %I)
- `%IW100` - `AI_LT_TankA` (REAL): Level Transmitter Tank A (0.0 - 1000.0 L).
- `%IW102` - `AI_LT_TankB` (REAL): Level Transmitter Tank B (0.0 - 1000.0 L).
- `%IW104` - `AI_LT_Reactor` (REAL): Level Transmitter Reactor (0.0 - 2000.0 L).
- `%IW106` - `AI_TT_Reactor` (REAL): Temperature Sensor Reactor (0.0 - 150.0 °C).
- `%IW108` - `AI_pHT_Reactor` (REAL): pH Probe Reactor (0.0 - 14.0 pH).

## 3. Hardware Digital Outputs (%QX / %Q)
- `%Q0.0` - `Q_PumpA_Run` (BOOL): Feed Pump A Contactor.
- `%Q0.1` - `Q_PumpB_Run` (BOOL): Feed Pump B Contactor.
- `%Q0.2` - `Q_Agitator_Run` (BOOL): Mixer Motor Contactor.
- `%Q0.3` - `Q_HeaterJacket_On` (BOOL): Heating Fluid Contactor.
- `%Q0.4` - `Q_PumpAcid_Dose` (BOOL): Acid Dosing Pump.
- `%Q0.5` - `Q_PumpBase_Dose` (BOOL): Alkali Base Dosing Pump.
- `%Q0.6` - `Q_Valve_ProductDrain` (BOOL): Discharge Drain Valve.
- `%Q0.7` - `Q_AlarmBeacon` (BOOL): Audible & Visual Alarm Beacon.

## 4. Hardware Analog Outputs (%QW / %Q)
- `%QW100` - `AQ_V1_RatioA` (REAL): Proportional Control Valve A (0.0 - 100.0%).
- `%QW102` - `AQ_V2_RatioB` (REAL): Proportional Control Valve B (0.0 - 100.0%).

## 5. Memory Words Table (%MW)
- `%MW0` - `M_BatchState` (INT): State Machine (0=IDLE, 1=DOSING_A, 2=DOSING_B, 3=HEATING, 4=pH_BALANCING, 5=DRAINING, 99=FAULT).
- `%MW2` - `M_RecipeRatioA` (REAL): Chemical A Target Volume (Default 600.0 L).
- `%MW4` - `M_RecipeRatioB` (REAL): Chemical B Target Volume (Default 400.0 L).
- `%MW6` - `M_TargetTemp` (REAL): Heating Cutoff Target (Default 65.0 °C).
- `%MW8` - `M_TargetpH` (REAL): Closed-Loop Neutral pH Target (Default 7.0 pH).
