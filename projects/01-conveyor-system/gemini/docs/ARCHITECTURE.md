# System Architecture: Schneider Electric Modicon M580 Conveyor Soft-PLC

## 1. Soft-PLC Execution Scan Loop Model

The software architecture models the deterministic cyclic scan behavior of a Schneider Electric Modicon M580 Programmable Automation Controller (PAC) operating with EcoStruxure Control Expert runtime.

```
+-----------------------------------------------------------------------+
|                      CYCLIC SCAN ENGINE (50ms)                        |
+-----------------------------------------------------------------------+
                                   |
                                   v
+-----------------------------------------------------------------------+
| 1. READ INPUT IMAGE (Process I/O + Apply Forces Override Table)       |
|    - Reads E_Stop (BOOL NC), Sensor_PartDetect, Sensor_Color, Weight |
+-----------------------------------------------------------------------+
                                   |
                                   v
+-----------------------------------------------------------------------+
| 2. EXECUTE STRUCTURED TEXT LOGIC (conveyorLogic.st Rules Engine)     |
|    - Evaluates E_Stop Interlock                                       |
|    - Evaluates Part Color & Weight Spec Thresholds                   |
|    - Computes Dynamic VFD Speed Reference                             |
+-----------------------------------------------------------------------+
                                   |
                                   v
+-----------------------------------------------------------------------+
| 3. WRITE OUTPUT IMAGE & PHYSICAL SIMULATION TICK                      |
|    - Updates VFD_Run, VFD_Speed_Ref, Actuator_Diverter, Alarm_Tower   |
|    - Advances Conveyor Part Queue Positions                           |
+-----------------------------------------------------------------------+
                                   |
                                   v
+-----------------------------------------------------------------------+
| 4. ZUSTAND MEMORY STORE STATE SYNC                                    |
|    - React Component UI Renders via Selector Subscriptions            |
+-----------------------------------------------------------------------+
```

## 2. Scan Loop Timing & Performance
- **Target Task Cycle:** Periodic Task (MAST) running at **50 ms** (~20 Hz execution rate).
- **Scan Time Measurement:** High-resolution `performance.now()` benchmarking integrated into every cycle loop (typically 0.04 ms – 0.15 ms execution overhead).
- **Safety Latency:** E-STOP loss triggers immediate shutdown within the current scan frame (< 50 ms response time).

## 3. State Machine Diagram

```
                    +-----------------------+
                    |    POWER UP / RESET   |
                    +-----------------------+
                                |
                                v
                     +---------------------+
                     |  FAULT LATCHED      |<------------------+
                     |  (System_Fault=TRUE)|                   |
                     +---------------------+                   |
                                |                              |
                      Reset_PB = TRUE AND                      |
                         E_Stop = TRUE                         |
                                |                              |
                                v                              |
                     +---------------------+                   |
                     |    NORMAL RUNNING   |                   |
                     |  (VFD_Run = TRUE)   |                   |
                     +---------------------+                   |
                                |                              |
                   +------------+------------+                 |
                   |                         |                 |
      Sensor_PartDetect = TRUE      E_Stop = FALSE ------------+
                   |    (NC Loop Lost)
                   v
        +---------------------+ 
        |  PART EVALUATION    |
        |  Out-of-Spec?       |
        +---------------------+ 
          /                 \ 
         /                   \ 
        YES                   NO
       /                       \ 
      v                         v
+--------------------+   +-------------------+
| Actuator_Diverter  |   | Maintain Belt     |
|   := TRUE          |   | Actuator_Diverter |
| (Divert to Reject) |   |   := FALSE        |
+--------------------+   +-------------------+
```
