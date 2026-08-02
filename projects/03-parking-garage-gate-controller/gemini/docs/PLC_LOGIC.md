# Parking Garage Gate Controller - PLC Logic Documentation

## I/O Tag Allocation

### Physical Inputs (Digital)
| Tag Name | Type | Description |
|---|---|---|
| `I_EntryLoop` | BOOL | Entry approach vehicle detection loop |
| `I_TicketButton` | BOOL | Driver pressed ticket request button |
| `I_TicketTaken` | BOOL | Ticket pulled from dispenser optical switch |
| `I_GateOpenLS` | BOOL | Gate arm fully open limit switch |
| `I_GateCloseLS` | BOOL | Gate arm fully closed limit switch |
| `I_SafetyPhotocell` | BOOL | Beam under gate arm interrupted |
| `I_ExitLoop` | BOOL | Exit vehicle detection loop |

### Physical Outputs (Digital)
| Tag Name | Type | Description |
|---|---|---|
| `Q_GateMotorOpen` | BOOL | Signal to raise gate barrier arm |
| `Q_GateMotorClose` | BOOL | Signal to lower gate barrier arm |
| `Q_DispenseTicket` | BOOL | Solenoid/Motor to feed ticket |
| `Q_GreenLight` | BOOL | Pass green signal lamp |
| `Q_RedLight` | BOOL | Stop red signal lamp |
| `Q_Alarm` | BOOL | Audible/Visual warning alarm |
