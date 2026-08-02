# Multi-Stage Chemical Batch Reactor Architecture

## System Specification & Controller Hardware
* **PLC Hardware Target**: Schneider Electric Modicon M580 / Siemens S7-1500 Controller Runtime.
* **Execution Standard**: IEC 61131-3 (FBD, LD, ST).
* **Scan Target Cycle Time**: 20ms fixed real-time soft-PLC scan loop.

---

## Linked Memory Allocation & Hardware I/O Map

### Digital Inputs (%IX / %I)
* `%I0.0` - `I_EStop_NC` (BOOL): Normally Closed Hardware Master E-Stop Button.
* `%I0.1` - `I_StartBatch_PB` (BOOL): Operator Start Pushbutton.
* `%I0.2` - `I_StopBatch_PB` (BOOL): Operator Pause/Stop Pushbutton.
* `%I0.3` - `I_ResetFault_PB` (BOOL): Fault Acknowledgment & Alarm Reset.
* `%I0.4` - `I_LSH_TankA` (BOOL): High Level Float Guard (Raw Chemical Tank A).
* `%I0.5` - `I_LSH_TankB` (BOOL): High Level Float Guard (Raw Chemical Tank B).
* `%I0.6` - `I_LSH_Reactor` (BOOL): High Level Float Guard (Reactor Overflow Interlock).
* `%I0.7` - `I_AgitatorHealth` (BOOL): Mixer Motor Thermal Protection Relay (NC).

### Analog Inputs (%IW / Scaled)
* `%IW100` - `AI_LT_TankA` (REAL): Level Transmitter - Tank A (0.0 to 1000.0 Litres).
* `%IW102` - `AI_LT_TankB` (REAL): Level Transmitter - Tank B (0.0 to 1000.0 Litres).
* `%IW104` - `AI_LT_Reactor` (REAL): Level Transmitter - Batch Reactor (0.0 to 2000.0 Litres).
* `%IW106` - `AI_TT_Reactor` (REAL): Temperature Sensor - Jacket Heating (0.0 to 150.0 °C).
* `%IW108` - `AI_pHT_Reactor` (REAL): pH Electrode Sensor Probe (0.0 to 14.0 pH).

### Digital Outputs (%QX / %Q)
* `%Q0.0` - `Q_PumpA_Run` (BOOL): Raw Chemical Feed Pump A Contactor.
* `%Q0.1` - `Q_PumpB_Run` (BOOL): Raw Chemical Feed Pump B Contactor.
* `%Q0.2` - `Q_Agitator_Run` (BOOL): High-Shear Agitator Mixer Motor Contactor.
* `%Q0.3` - `Q_HeaterJacket_On` (BOOL): Thermal Fluid Heating Contactor.
* `%Q0.4` - `Q_PumpAcid_Dose` (BOOL): Acid Micro-Dosing Pump.
* `%Q0.5` - `Q_PumpBase_Dose` (BOOL): Base Micro-Dosing Pump.
* `%Q0.6` - `Q_Valve_ProductDrain` (BOOL): Motorized Bottom Discharge Valve.
* `%Q0.7` - `Q_AlarmBeacon` (BOOL): Master Visual & Audible Siren.

### Analog Outputs (%QW / 4-20mA Scaled)
* `%QW100` - `AQ_V1_RatioA` (REAL): Proportional Control Valve A Position (0.0 to 100.0%).
* `%QW102` - `AQ_V2_RatioB` (REAL): Proportional Control Valve B Position (0.0 to 100.0%).

### Internal Memory (%MW)
* `%MW0` - `M_BatchState` (INT): State Machine Register.
  * `0`: IDLE
  * `1`: DOSING_A
  * `2`: DOSING_B
  * `3`: HEATING_MIXING
  * `4`: PH_BALANCING
  * `5`: DRAINING
  * `99`: FAULT
* `%MW2` - `M_RecipeRatioA` (REAL): Target Ratio Tank A Volume (Default 600.0 L).
* `%MW4` - `M_RecipeRatioB` (REAL): Target Ratio Tank B Volume (Default 400.0 L).
* `%MW6` - `M_TargetTemp` (REAL): Target Temperature (Default 65.0 °C).
* `%MW8` - `M_TargetpH` (REAL): Target Neutral pH (Default 7.0 pH).
