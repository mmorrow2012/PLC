# PLC Logic & Schneider Modicon M580 Mapping Specification

## 1. Hardware Target
* **PLC Family:** Schneider Electric Modicon M580
* **Processor Model:** BMEP582040
* **Software:** EcoStruxure Control Expert (formerly Unity Pro)
* **Task Type:** MAST Task (50ms Periodic Execution)

## 2. I/O Tag Register Mapping

### Digital Inputs (%I)
| Symbol | Data Type | Physical Channel | Description |
| :--- | :--- | :--- | :--- |
| `E_Stop` | BOOL | `%I0.1.0` | Hardware Emergency Stop Switch (NC Logic) |
| `Start_PB` | BOOL | `%I0.1.1` | Operator Start Pushbutton (NO Pulse) |
| `Stop_PB` | BOOL | `%I0.1.2` | Operator Stop Pushbutton (NO Pulse) |
| `Alarm_Reset_PB` | BOOL | `%I0.1.3` | Manual Alarm Reset Pushbutton |
| `LSH_TankA` | BOOL | `%I0.1.4` | Tank A High-Level Float Switch |
| `LSH_TankB` | BOOL | `%I0.1.5` | Tank B High-Level Float Switch |

### Analog Inputs (%IW)
| Symbol | Data Type | Range | Description |
| :--- | :--- | :--- | :--- |
| `LT_TankA` | REAL | 0.0 - 100.0 % | Level Transmitter Tank A |
| `LT_TankB` | REAL | 0.0 - 100.0 % | Level Transmitter Tank B |
| `LT_TankC` | REAL | 0.0 - 100.0 % | Level Transmitter Tank C |

### Outputs (%Q / %QW)
| Symbol | Data Type | Channel | Description |
| :--- | :--- | :--- | :--- |
| `Pump_Fill_A` | BOOL | `%Q0.2.0` | Inlet Fill Pump Tank A |
| `Pump_Transfer_AB` | BOOL | `%Q0.2.1` | Transfer Pump Tank A to Tank B |
| `Valve_Drain_BC_Pos` | REAL | `%QW0.3.0` | Proportional Gravity Drain Valve Position (0-100%) |
| `Alarm_Overflow` | BOOL | `%Q0.2.2` | Latched Overflow Alarm Flag |
| `Alarm_Tower` | DWORD | `%MW100` | Stacklight Status Beacon Bitmask |

## 3. Cascade Control Rule
During `TRANSFERRING_AB`, `Valve_Drain_BC_Pos` is computed via proportional modulation:
$$\text{Valve\_Drain\_BC\_Pos} = \text{LIMIT}\left(0.0, (LT\_TankB - SP\_LevelB\_Target) \times Kp\_Drain, 100.0\right)$$
