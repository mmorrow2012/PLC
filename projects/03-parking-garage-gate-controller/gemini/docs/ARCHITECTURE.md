# Parking Garage Gate Controller - Architecture Overview

## Overview
This project models an automated parking garage entry/exit gate controller using a SoftPLC IEC 61131-3 Structured Text engine integrated with a React visualizer dashboard.

## System Architecture
- **SoftPLC Engine**: Runs cyclic scan loop executing Structured Text logic or TypeScript compiled equivalent logic.
- **Zustand State Store**: Synchronizes PLC inputs/outputs, timer states, car queue, gate state, and UI state.
- **Visualizer Component**: Interactive canvas/SVG view of entry/exit barrier gates, loop detectors, height sensors, ticket dispenser, and spots counter.
- **Code Viewer**: Monaco editor displaying ST logic with active tag monitoring.
- **Control Panel**: Manual overrides, fault injection, car simulation controls.
