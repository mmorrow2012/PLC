# PLC Logic Mapping & IEC 61131-3 Memory Specification

## Hardware I/O Allocation Table

### Digital Inputs (%IX)
| Address | Tag Name | Type | Description | Safety State |
|---|---|---|---|---|
| `%I0.0` | `I_EStop_NC` | BOOL | Hardware E-Stop (Normally Closed 24VDC) | Active LOW (False = Trip) |
| `%I0.1` | `I_PlantStart_PB` | BOOL | Plant Master Start Pushbutton | NO Momentary |
| `%I0.2` | `I_PlantStop_PB` | BOOL | Plant Master Stop Pushbutton | NC Momentary |
| `%I0.3` | `I_ResetFault_PB` | BOOL | Alarm Reset / Fault Ack Pushbutton | NO Momentary |
| `%I0.4` | `I_LSH_Equalization` | BOOL | High-High Level Float Guard (Equalization) | Active HIGH (True = Trip) |
| `%I0.5` | `I_LSH_AerationA` | BOOL | High Level Float Guard (Aeration Basin A) | Active HIGH |
| `%I0.6` | `I_LSH_AerationB` | BOOL | High Level Float Guard (Aeration Basin B) | Active HIGH |
| `%I0.7` | `I_WeirOpenLS` | BOOL | Weir Gate Fully Open Limit Switch | Active HIGH |

### Analog Inputs (%IW - Scaled 4-20mA)
| Address | Tag Name | Type | Range | Units | Description |
|---|---|---|---|---|---|
| `%IW100` | `AI_LT_EqBasin` | REAL | 0.0 - 10.0 | m | Equalization Basin Level Transmitter |
| `%IW102` | `AI_LT_AerationA` | REAL | 0.0 - 6.0 | m | Aeration Basin A Level Transmitter |
| `%IW104` | `AI_LT_AerationB` | REAL | 0.0 - 6.0 | m | Aeration Basin B Level Transmitter |
| `%IW106` | `AI_DO_AerationA` | REAL | 0.0 - 10.0 | mg/L | Dissolved Oxygen Sensor (Basin A) |
| `%IW108` | `AI_Turbidity_Effluent` | REAL | 0.0 - 100.0 | NTU | Effluent Discharge Turbidity Sensor |

### Digital Outputs (%QX)
| Address | Tag Name | Type | Description |
|---|---|---|---|
| `%Q0.0` | `Q_Pump_RawInfluent1` | BOOL | Raw Influent Pump 1 Contactor |
| `%Q0.1` | `Q_Pump_RawInfluent2` | BOOL | Raw Influent Pump 2 Contactor |
| `%Q0.2` | `Q_Blower_AerationA` | BOOL | Aeration Blower Motor A |
| `%Q0.3` | `Q_Blower_AerationB` | BOOL | Aeration Blower Motor B |
| `%Q0.4` | `Q_Pump_RAS` | BOOL | Return Activated Sludge Pump |
| `%Q0.5` | `Q_Pump_Coagulant` | BOOL | Coagulant Dosing Pump |
| `%Q0.6` | `Q_Motor_WeirOpen` | BOOL | Weir Gate Motor Open Contactor |
| `%Q0.7` | `Q_Motor_WeirClose` | BOOL | Weir Gate Motor Close Contactor |

### Analog Outputs (%QW)
| Address | Tag Name | Type | Range | Units | Description |
|---|---|---|---|---|---|
| `%QW100` | `AQ_VFD_InfluentSpeed` | REAL | 0.0 - 100.0 | % | Influent Pump VFD Speed Reference |
| `%QW102` | `AQ_AirValve_Aeration` | REAL | 0.0 - 100.0 | % | Aeration Air Control Valve Position |

### Internal Memory Words (%MW)
| Address | Tag Name | Type | Default | Description |
|---|---|---|---|---|
| `%MW0` | `M_PlantState` | INT | 0 | Plant State (0=OFF, 1=EQUALIZING, 2=AERATION, 3=CLARIFYING, 4=DISCHARGE, 99=ALARM) |
| `%MW2` | `M_TargetDO` | REAL | 2.5 | Target Dissolved Oxygen Setpoint (mg/L) |
| `%MW4` | `M_MaxTurbidity` | REAL | 15.0 | Max Discharge Turbidity Setpoint (NTU) |
| `%MW6` | `M_LeadPumpToggle` | INT | 1 | Lead-Lag Rotation State (1=Pump 1 Lead, 2=Pump 2 Lead) |