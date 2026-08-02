# Chemical Batch Reactor - PLC I/O & Tag Specifications

## Memory Map & Tag Table

### Digital Inputs (DI)
| Tag Name | Address | Type | Description |
|---|---|---|---|
| `DI_START_PB` | %IX0.0 | BOOL | Start Sequence Push Button |
| `DI_STOP_PB` | %IX0.1 | BOOL | Stop/Pause Sequence Push Button |
| `DI_ESTOP` | %IX0.2 | BOOL | Emergency Stop Circuit (NC) |
| `DI_DRAIN_MAN` | %IX0.3 | BOOL | Manual Drain Request |

### Digital Outputs (DO)
| Tag Name | Address | Type | Description |
|---|---|---|---|
| `DO_VALVE_A` | %QX0.0 | BOOL | Reactant A Feed Valve |
| `DO_VALVE_B` | %QX0.1 | BOOL | Reactant B Feed Valve |
| `DO_DRAIN_VALVE` | %QX0.2 | BOOL | Reactor Bottom Discharge Valve |
| `DO_AGITATOR` | %QX0.3 | BOOL | Agitator Motor Starter |
| `DO_HEATER` | %QX0.4 | BOOL | Jacket Heating Element |
| `DO_COOLING` | %QX0.5 | BOOL | Jacket Cooling Water Valve |

### Analog Inputs (AI)
| Tag Name | Address | Type | Engineering Unit | Range |
|---|---|---|---|---|
| `AI_TEMP` | %IW0 | REAL | °C | 0.0 - 150.0 |
| `AI_LEVEL` | %IW1 | REAL | Liters | 0.0 - 1000.0 |
| `AI_PRESSURE` | %IW2 | REAL | bar | 0.0 - 10.0 |

### Analog Outputs (AO)
| Tag Name | Address | Type | Description |
|---|---|---|---|
| `AO_HEATER_POWER` | %QW0 | REAL | Heater Output Percentage (0.0 - 100.0%) |
| `AO_AGITATOR_SPEED`| %QW1 | REAL | Agitator Speed Command (0.0 - 100.0%) |
