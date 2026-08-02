# Conveyor System Architecture Notes

This document describes the architectural layout, component hierarchy, and communication channels for the Conveyor System SoftPLC demonstrator.

## Overview
- **Frontend**: React 18, Vite, Tailwind CSS
- **State Management**: Zustand store (`usePlcStore`)
- **PLC Engine**: JavaScript/TypeScript scan loop simulator executing IEC 61131-3 Structured Text principles
- **UI Layer**: Control Panel (Inputs), Visualizer (Physical Simulation), Code Viewer (ST Editor)
