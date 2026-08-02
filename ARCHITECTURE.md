# System Architecture — Modicon M580 Chemical Batch Reactor & Blending Soft-PLC

## 1. System Overview
This industrial soft-PLC platform controls a multi-stage liquid batching process utilizing a **Schneider Electric Modicon M580 / Siemens S7-1500** execution runtime model.

### Core System Components
1. **Raw Storage Tanks (A & B)**: Store raw liquid inputs with high-level float guards (`LSH-101`, `LSH-102`).
2. **Proportional Ratio Control Valves**: Modulate volumetric liquid flow into the main reactor.
3. **Heated Mixing Reactor Vessel**: Equipped with a thermal heating jacket, high-shear motor agitator, level transmitter, temperature probe, and continuous pH probe.
4. **pH Neutralization Dosing System**: Micro-dosing acid and base pumps for closed-loop pH stabilization.
5. **Bottom Discharge Drain System**: Transfers finished neutral chemical blend to the Product Holding Tank.

---

## 2. State Machine Architecture (`%MW0` `M_BatchState`)

| State Code | Name | Trigger In | Active Outputs | Transition Condition |
| :--- | :--- | :--- | :--- | :--- |
| `0` | **IDLE** | System Ready | None | Operator Pushbutton `I_StartBatch_PB` (%I0.1) |
| `1` | **DOSING_A** | State 0 + Start PB | `Q_PumpA_Run` (%Q0.0), `AQ_V1_RatioA` (%QW100) = 100% | `AI_LT_Reactor` volume added >= `M_RecipeRatioA` (%MW2) |
| `2` | **DOSING_B** | State 1 Complete | `Q_PumpB_Run` (%Q0.1), `AQ_V2_RatioB` (%QW102) = 100% | `AI_LT_Reactor` volume added >= `M_RecipeRatioB` (%MW4) |
| `3` | **HEATING_MIXING** | State 2 Complete | `Q_Agitator_Run` (%Q0.2), `Q_HeaterJacket_On` (%Q0.3) | `AI_TT_Reactor` (%IW106) >= `M_TargetTemp` (%MW6) |
| `4` | **PH_BALANCING** | State 3 Complete | `Q_Agitator_Run` (%Q0.2), `Q_PumpAcid_Dose` / `Q_PumpBase_Dose` | `AI_pHT_Reactor` (%IW108) inside target window (6.85 - 7.15) |
| `5` | **DRAINING** | State 4 Complete | `Q_Valve_ProductDrain` (%Q0.6) | `AI_LT_Reactor` (%IW104) <= 5.0 L |
| `99` | **FAULT TRIP** | Interlock Trip | `Q_AlarmBeacon` (%Q0.7), All command outputs locked LOW | Operator Pushbutton `I_ResetFault_PB` (%I0.3) & Faults Cleared |

---

## 3. Safety Interlock Matrix (`FB_SafetyInterlock`)
- **E-Stop Closed Contact (`I_EStop_NC` = FALSE)**: Hardware trip. Lockout all outputs.
- **Reactor Overflow Guard (`I_LSH_Reactor` = TRUE)**: Prevents vessel overfill overflow.
- **Mixer Overload Relay (`I_AgitatorHealth` = FALSE)**: Trips system to protect agitator motor winding.
- **Thermal Runaway Guard (`AI_TT_Reactor` > 90.0°C)**: Disengages heating jacket immediately.
