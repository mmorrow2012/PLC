# Municipal Wastewater Treatment Plant Architecture & System Specifications

## Hardware Target & Runtime System
- **Target PLC platform**: Schneider Electric Modicon M580 / Siemens S7-1500 Controller
- **Programming Standards**: IEC 61131-3 (Ladder Diagram, Function Block Diagram, Structured Text)
- **Cycle Time Target**: 50ms Soft-PLC scan loop execution
- **Industrial HMI/SCADA**: High-performance dark-theme SCADA dashboard with interactive process mimics and live execution tracing

## Treatment Process Flow & Subsystems
1. **Raw Influent & Equalization Basin**
   - Dual Raw Influent Pumps (Lead-Lag configured with automatic duty rotation)
   - Ultrasonic Level Transmitter (`AI_LT_EqBasin`, 0-10m)
   - High-High Overflow Float Switch (`I_LSH_Equalization` Interlock)
   - Variable Frequency Drive (`AQ_VFD_InfluentSpeed`, 0-100%)

2. **Primary Clarifier & Coagulant Dosing**
   - Chemical Polymer Coagulant Dosing Pump (`Q_Pump_Coagulant`)
   - Settling zone with sludge removal controls

3. **Multi-Stage Aeration Basins (Basin A & Basin B)**
   - Dual Dissolved Oxygen (DO) Probes (`AI_DO_AerationA`, 0-10 mg/L)
   - Submerged Diffuser Blower Motors (`Q_Blower_AerationA`, `Q_Blower_AerationB`)
   - Modulated Air Flow Control Valve (`AQ_AirValve_Aeration`, 0-100% PID-driven)

4. **Secondary Clarifier & RAS Loop**
   - Return Activated Sludge Pump (`Q_Pump_RAS`)
   - Effluent Discharge Turbidity Monitor (`AI_Turbidity_Effluent`, 0-100 NTU)

5. **Effluent Discharge & Motorized Weir Gate**
   - Motorized Sluice Weir Gate Open/Close Contactors (`Q_Motor_WeirOpen`, `Q_Motor_WeirClose`)
   - Weir Gate Open Limit Switch (`I_WeirOpenLS`)

## Safety Architecture & Alarm Interlocks
- **Hardware E-Stop (`I_EStop_NC`)**: Normally Closed 24VDC circuit. De-energizing drops all digital outputs immediately.
- **Overflow Safeguard (`I_LSH_Equalization`)**: Immediate interlock to prevent raw influent basin flooding.
- **Turbidity Protection**: Turbidity > 25.0 NTU triggers emergency closure of Motorized Effluent Weir Sluice Gate to prevent environmental contamination.