# PLC

Example PLC projects with architecture diagrams. These span beginner to intermediate complexity:

## 1. **Automated Conveyor Belt System**

**What it does:** Sort products by color/weight, control motor speed, emergency stop logic.

```
┌─────────────────────────────────────────────────┐
│                  PLC (Allen-Bradley/Siemens)    │
├─────────────────────────────────────────────────┤
│ INPUTS:  Color sensor, weight sensor, E-stop    │
│ OUTPUTS: Motor VFD, solenoid diverter, alarm    │
│ LOGIC:   Ladder diagram for sorting/routing     │
└────────────┬────────────────────────────────────┘
             │
    ┌────────┼────────┐
    │        │        │
  MOTOR   SENSOR   DIVERTER
  (VFD)   (RGB)   (Solenoid)
```

**Key skills:** Basic I/O, timer/counter logic, conditional branching.

---


help me create a prompt ... I want to build a website that contains the code we create plus a graphical representation of the controls we have developed using


## 2. **Three-Tank Liquid Level Control**

**What it does:** Auto-fill Tank A → pump to Tank B → gravity drain to Tank C. Cascade control with overflow protection.

```
              ┌──────────────────┐
              │   PLC/HMI        │
              │  Setpoints       │
              └────────┬─────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
    ┌───▼────┐     ┌───▼────┐    ┌───▼────┐
    │ Tank A │     │ Tank B │    │ Tank C │
    │(Fill)  │     │(Transfer)   │(Drain) │
    └───┬────┘     └───┬────┘    └────────┘
        │              │
    ┌───▼────────┐ ┌───▼────────┐
    │ Level      │ │ Level      │
    │ Sensor     │ │ Sensor     │
    └─────┬──────┘ └─────┬──────┘
          │              │
          └──────┬───────┘
                 │ (To PLC Analog In)
```

**Key skills:** Analog I/O, PID loops (if using proportional valve), state machine logic.

---

## 3. **Parking Garage Gate Controller**

**What it does:** Sensor detects car, gate raises/lowers, lights turn on, barrier resets. Stuck car detection.

```
┌────────────────────────────────┐
│      PLC Logic                 │
│  ┌─────────────────────────┐   │
│  │ State Machine:          │   │
│  │ IDLE → OPENING → OPEN   │   │
│  │ → CLOSING → CLOSED      │   │
│  └─────────────────────────┘   │
└────────────────────────────────┘
        │           │           │
    ┌───▼───┐   ┌───▼────┐  ┌───▼────┐
    │ Motor │   │ LED    │  │ Buzzer │
    │ Ctrl  │   │ Bank   │  │        │
    └───────┘   └────────┘  └────────┘
        │
    ┌───▼─────────────────┐
    │ SENSOR INPUT        │
    │ - Motion detect     │
    │ - Limit (open/close)│
    │ - Obstruction       │
    └─────────────────────┘
```

**Key skills:** Timers (watchdog for stuck gates), safety logic (obstruction reset).

---

## 4. **Greenhouse Climate Control**

**What it does:** Monitor temp/humidity; auto-vent louvers, misting, heating. Daily/seasonal scheduling.

```
              ┌──────────────┐
              │ HMI/SCADA    │
              │ (Real-time)  │
              └──────┬───────┘
                     │
          ┌──────────┼──────────┐
          │          │          │
    ┌─────▼──┐  ┌────▼────┐  ┌─▼──────┐
    │ Louver │  │Mist Pump│  │Heater  │
    │ Motor  │  │Solenoid │  │Relay   │
    └────────┘  └─────────┘  └────────┘
          │
    ┌─────▼──────────────────┐
    │ ANALOG SENSORS (4-20mA)│
    │ - DHT22 Temp/Humidity  │
    │ - Soil moisture        │
    │ - Light level          │
    └────────────────────────┘
```

**Key skills:** Analog scaling, PID control, time-based scheduling (RTC), hysteresis logic.

---

## 5. **Traffic Light Controller with Pedestrian Call**

**What it does:** Sync lights, handle pedestrian button, detect sensor faults.

```
    ┌──────────────────────────────────────┐
    │      Intersection PLC                │
    │  ┌──────────────────────────────────┐│
    │  │ Priority Logic:                  ││
    │  │ NS Green 30s → N Turn 5s →       ││
    │  │ EW Green 25s → E Turn 5s →       ││
    │  │ (Adjust if ped button pressed)   ││
    │  └──────────────────────────────────┘│
    └─────────────┬────────────────────────┘
                  │
         ┌────────┼────────┬────────┐
         │        │        │        │
    ┌────▼──┐ ┌──▼───┐ ┌──▼───┐ ┌─▼────┐
    │NS RGB │ │EW RGB│ │Ped   │ │Ped   │
    │Light  │ │Light │ │Signal│ │Button│
    └───────┘ └──────┘ └──────┘ └──────┘
```

**Key skills:** Synchronized timers, button debouncing, state sequencing, fault detection.

---

## 6. **Bottling Line (Advanced)**

**What it does:** Fill bottles, apply caps, label, queue for shipping. Track production count and reject defects.

```
    ┌─────────────────────────────────────┐
    │          Central PLC                │
    │  ┌─────────────────────────────────┐│
    │  │ Recipe Engine (fill speed,      ││
    │  │ cap pressure, label adjust)     ││
    │  │ + Error handling                ││
    │  └─────────────────────────────────┘│
    └─────────────────────────────────────┘
            │         │         │
    ┌───────▼─┐ ┌─────▼──┐ ┌───▼────┐
    │ Filler  │ │ Capper │ │ Labeler│
    │ Motor   │ │ Press  │ │ Motor  │
    └────┬────┘ └───┬────┘ └────────┘
         │          │
    ┌────▼──────────▼────────────────┐
    │ SENSOR FEEDBACK:               │
    │ - Proximity (bottle detect)    │
    │ - Pressure (cap verify)        │
    │ - Vision (label position OK?)  │
    └────────────────────────────────┘
```

**Key skills:** Coordinated multi-axis control, recipe management, quality gates, error recovery.

---

## Quick PLC Code Example (Siemens Step 7 / Allen-Bradley)

Here's a simple **fill tank with overflow protection** in ladder logic pseudocode:

```
FILL_BUTTON ---|/|---+
                     |
LEVEL_LOW ---|/|-----+----( FILL_PUMP ON )
                     |
LEVEL_HIGH ---|/|----+----( FILL_PUMP OFF )

LEVEL_CRITICAL ---|/|-----( ALARM_HORN ON )
LEVEL_CRITICAL ---|/|-----( SOLENOID_DUMP ON )
```

---

## What would help you most?

- **Specific platform?** (Siemens S7-1200, Allen-Bradley CompactLogix, Beckhoff TwinCAT, IEC 61131-3 generic)
- **Language preference?** (Ladder diagram, Structured Text, Function Block Diagram)
- **Deeper code example** for one of these projects?
- **Integration with SCADA/HMI?** (Given your Nautobot/Grafana background, supervisory control might interest you)
- **Real hardware simulation?** (I can sketch a Docker-based PLC simulator stack if you're planning a lab)

Which project appeals to you most, or should I build out a full coded example for one?
