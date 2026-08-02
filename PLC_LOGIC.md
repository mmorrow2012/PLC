# Function Block Rules & Interlock Specification

## 1. Safety Interlock Function Block (`FB_SafetyInterlock`)
* Executes every scan before standard state machine evaluation.
* Trips immediately if:
  1. `%I0.0` (`I_EStop_NC`) is FALSE (Open circuit E-Stop).
  2. `%I0.7` (`I_AgitatorHealth`) is FALSE (Mixer thermal overload tripped).
  3. `%I0.6` (`I_LSH_Reactor`) is TRUE (High level float activated).
  4. `%IW106` (`AI_TT_Reactor`) > 90.0 °C (Thermal runaway protection).
* Action on trip: Set `%MW0` = 99 (`FAULT`), lock all pumps and valves CLOSED, energize `%Q0.7` (`Q_AlarmBeacon`).

## 2. Recipe Batch Dosing Function Block (`FB_BatchBlend`)
* Controls dosing of Raw Chemical A and Chemical B according to `%MW2` and `%MW4` target volumes.
* Modulates proportional valves `%QW100` (`AQ_V1_RatioA`) and `%QW102` (`AQ_V2_RatioB`) with automatic ramp down near setpoint to ensure precise dosage accuracy.

## 3. Thermal Heating Function Block (`FB_TempControl`)
* Drives `%Q0.3` (`Q_HeaterJacket_On`) and `%Q0.2` (`Q_Agitator_Run`).
* Enforces mixer rotation during jacket heating to prevent thermal scorching.

## 4. Neutralization Function Block (`FB_pHBalancing`)
* Monitors `%IW108` (`AI_pHT_Reactor`).
* Doses Acid pump `%Q0.4` if pH > `%MW8` + 0.15.
* Doses Base pump `%Q0.5` if pH < `%MW8` - 0.15.
