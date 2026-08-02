# Chemical Batch Reactor - System Architecture

This document outlines the software and control architecture for the web-based Chemical Batch Reactor PLC Demonstrator.

## Overview
- **Soft PLC Engine**: Emulates an IEC 61131-3 PLC scan cycle (Read Inputs -> Execute Logic -> Update Outputs).
- **State Management**: Reactive state store driven by Zustand.
- **Process Simulation**: First-principles physical model for batch reactor dynamics (reaction kinetics, thermal mass balance, jacket heat transfer, pneumatic valves).
- **User Interface**: Industrial HMI panel, interactive process visualizer, and live Structured Text code viewer with Monaco Editor.
