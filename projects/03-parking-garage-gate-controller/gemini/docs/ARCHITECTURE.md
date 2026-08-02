# Parking Garage Gate Controller - System Architecture

## Overview
This document outlines the architecture for the Schneider Electric Modicon M580 Parking Garage Gate Controller digital twin system. The implementation consists of an IEC 61131-3 Structured Text logic program, a 50ms soft-PLC cyclic scan engine, a Zustand real-time store, and an interactive React dynamic visualizer.

---

## 1. Soft-PLC Cyclic Scan Engine
The runtime operates on a fixed **50ms execution cycle** (20 Hz), mirroring standard industrial task scheduling on Schneider Modicon M580 Racks.

```
+-------------------------------------------------------------+
|                     50ms Cyclic Task Loop                   |
+-------------------------------------------------------------+
                               |
                               v
+-------------------------------------------------------------+
| 1. Read Effective Inputs                                    |
|    - Read physical & simulated inputs                       |
|    - Apply force overrides if active                        |
+-------------------------------------------------------------+
                               |
                               v
+-------------------------------------------------------------+
| 2. Physical Twin Step                                       |
|    - Update gate arm angle (30 deg/sec rate)                |
|    - Update limit switch feedback (OpenLimit / ClosedLimit) |
|    - Update vehicle position & inductive loop sensor        |
+-------------------------------------------------------------+
                               |
                               v
+-------------------------------------------------------------+
| 3. Execute IEC 61131-3 ST Control Logic                      |
|    - Evaluate Hardware E-Stop Interlock                     |
|    - Evaluate Fault Reset                                   |
|    - State Machine Transitions (IDLE, OPENING, OPEN, etc.)  |
|    - Safety Reversals (Obstruction / Vehicle Presence)      |
|    - Update TON Timers (AutoClose Delay, Stuck Watchdog)    |
+-------------------------------------------------------------+
                               |
                               v
+-------------------------------------------------------------+
| 4. Write Output Image                                       |
|    - Update contactors (Motor_GateUp, Motor_GateDown)       |
|    - Update traffic lights (Light_Green, Light_Red)         |
|    - Update alarms & buzzer (Alarm_StuckGate, Buzzer)       |
+-------------------------------------------------------------+
```

---

## 2. Finite State Machine (FSM) Diagram

```
                 [ E_Stop = FALSE / Watchdog Timeout ]
                                  │
                                  ▼
                         ┌─────────────────┐
                         │   STATE_FAULT   │
                         └────────┬────────┘
                                  │ PB_Reset = TRUE
                                  ▼
┌─────────────────┐     Vehicle / PB_Open     ┌─────────────────┐
│  STATE_CLOSED   │──────────────────────────►│  STATE_OPENING  │
└─────────────────┘                           └────────┬────────┘
        ▲                                              │
        │ Sensor_GateClosedLimit = TRUE                │ Sensor_GateOpenLimit = TRUE
        │                                              ▼
┌─────────────────┐   TON_AutoClose.Q = TRUE  ┌─────────────────┐
│  STATE_CLOSING  │◄──────────────────────────│   STATE_OPEN    │
└────────┬────────┘   or PB_ManualClose       └─────────────────┘
         │
         │ Obstruction / Vehicle Arrival
         └────────────────────────────────────► [ Re-enters OPENING ]
```

---

## 3. Safety Interlocking Strategy

1. **Hardware Emergency Stop (`E_Stop`):**
   * Uses Normally Closed (NC) logic.
   * On loss of signal (`E_Stop = FALSE`), both motor contactors (`Motor_GateUp`, `Motor_GateDown`) are instantly forced `FALSE`.
   * Transitions immediately to `STATE_FAULT`.

2. **Obstruction Safety:**
   * Active during `STATE_CLOSING`.
   * If `Sensor_Obstruction = TRUE` or `Sensor_VehiclePresence = TRUE`, motor down is de-energized immediately and gate re-enters `STATE_OPENING`.

3. **Stuck Gate Watchdog Timer:**
   * Runs a `TON` timer initialized to `T#8s` during active movement states (`OPENING` or `CLOSING`).
   * If target limit switch is not triggered before timeout, `Alarm_StuckGate` latches `TRUE` and system locks into `STATE_FAULT`.
