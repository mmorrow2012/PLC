# System Architecture & Soft-PLC Engine Specification

## 1. Soft-PLC Cyclic Scan Engine
The runtime engine executes a continuous cyclic execution loop at approximately **50ms intervals**, simulating the cyclic task scheduler of a **Schneider Electric Modicon M580 PLC** running EcoStruxure Control Expert.

```
       +-------------------------------------------------------+
       |                  50ms Cyclic Scan                      |
       +-------------------------------------------------------+
                                   |
                                   v
       +-------------------------------------------------------+
       | 1. Read Inputs & Apply Memory Overrides (Forced tags) |
       +-------------------------------------------------------+
                                   |
                                   v
       +-------------------------------------------------------+
       | 2. Run Dynamic Physical Simulation (Flow balances)    |
       +-------------------------------------------------------+
                                   |
                                   v
       +-------------------------------------------------------+
       | 3. Execute IEC 61131-3 ST Control Logic Program        |
       +-------------------------------------------------------+
                                   |
                                   v
       +-------------------------------------------------------+
       | 4. Update Process Memory & Broadcast Zustand Store    |
       +-------------------------------------------------------+
```

## 2. Finite State Machine Breakdown
The liquid process sequence advances through 5 distinct states:

| State | Integer ID | Active Outputs | Transition Criteria |
| :--- | :--- | :--- | :--- |
| `IDLE` | 0 | None (Pumps OFF, Valve 0%) | `Start_PB` pulse -> `FILLING_A` |
| `FILLING_A` | 1 | `Pump_Fill_A := TRUE` | `LT_TankA >= SP_LevelA_High` (80%) -> `TRANSFERRING_AB` |
| `TRANSFERRING_AB` | 2 | `Pump_Transfer_AB := TRUE`, `Valve_Drain_BC_Pos` (Modulated) | `LT_TankA <= 3.0%` OR `LT_TankB >= SP_LevelB_High` -> `DRAINING_BC` |
| `DRAINING_BC` | 3 | `Valve_Drain_BC_Pos := 100.0%` | `LT_TankB <= 2.0%` -> `IDLE` |
| `ALARM_STATE` | 4 | All outputs isolated (0) | `Alarm_Reset_PB` pulse (when cleared) -> `IDLE` |

## 3. Physical Process Simulation Mathematical Model
The mass balance dynamic updates for tank level percentage over time step $\Delta t$:

1. **Tank A Level:**
   $$\Delta L_A = (F_{fill} \cdot \text{Pump\_Fill\_A} - F_{transfer} \cdot \text{Pump\_Transfer\_AB}) \cdot \Delta t$$

2. **Tank B Level:**
   $$\Delta L_B = (F_{transfer} \cdot \text{Pump\_Transfer\_AB} - F_{drain} \cdot \frac{\text{Valve\_Drain\_BC\_Pos}}{100.0}) \cdot \Delta t$$

3. **Tank C Level:**
   $$\Delta L_C = (F_{drain} \cdot \frac{\text{Valve\_Drain\_BC\_Pos}}{100.0} - F_{discharge}) \cdot \Delta t$$
