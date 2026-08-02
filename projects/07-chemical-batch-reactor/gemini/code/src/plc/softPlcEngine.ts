/**
 * Soft PLC Scan Loop Engine
 * Executes cyclic scan sequence: Read Inputs -> Logic Execution -> Physical Simulation Step -> Output Update
 */

import { usePlcStore } from '../store/usePlcStore';

export class SoftPlcEngine {
  private timerId: number | null = null;
  private lastTimestamp: number = performance.now();

  public start(intervalMs: number = 50) {
    if (this.timerId !== null) return;
    this.lastTimestamp = performance.now();
    
    this.timerId = window.setInterval(() => {
      this.scanCycle();
    }, intervalMs);
  }

  public stop() {
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  private scanCycle() {
    const now = performance.now();
    const dtMs = now - this.lastTimestamp;
    this.lastTimestamp = now;

    const store = usePlcStore.getState();
    if (!store.plcRunning) return;

    // 1. Read Inputs (simulated physical environment + UI controls)
    const { inputs, phase } = store;

    // 2. Process Safety Circuit
    if (inputs.estop) {
      store.updateOutput('valveA', false);
      store.updateOutput('valveB', false);
      store.updateOutput('drainValve', false);
      store.updateOutput('agitator', false);
      store.updateOutput('heater', false);
      store.updateOutput('coolingValve', true);
      store.updateOutput('heaterPower', 0);
      store.updateOutput('agitatorSpeed', 0);
      store.tickScan(dtMs);
      return;
    }

    // 3. Sequential Function Chart (SFC) / State Machine Logic
    let nextPhase = phase;
    let timer = store.phaseTimer + dtMs / 1000;

    let level = inputs.level;
    let temp = inputs.temperature;

    switch (phase) {
      case 'IDLE':
        if (inputs.startPb) {
          nextPhase = 'CHARGING_A';
          timer = 0;
          store.updateInput('startPb', false); // Clear pulse
        }
        break;

      case 'CHARGING_A':
        store.updateOutput('valveA', true);
        level += 15 * (dtMs / 1000); // Fill rate A: 15 L/s
        if (level >= store.targetVolumeA) {
          store.updateOutput('valveA', false);
          nextPhase = 'CHARGING_B';
          timer = 0;
        }
        break;

      case 'CHARGING_B':
        store.updateOutput('valveB', true);
        store.updateOutput('agitator', true);
        store.updateOutput('agitatorSpeed', 30);
        level += 12 * (dtMs / 1000); // Fill rate B: 12 L/s
        if (level >= store.targetVolumeA + store.targetVolumeB) {
          store.updateOutput('valveB', false);
          nextPhase = 'HEATING';
          timer = 0;
        }
        break;

      case 'HEATING':
        store.updateOutput('agitator', true);
        store.updateOutput('agitatorSpeed', 60);
        store.updateOutput('heater', true);
        store.updateOutput('heaterPower', 100);
        temp += 2.5 * (dtMs / 1000); // Heat rate 2.5°C/s
        if (temp >= store.setpointTemp) {
          nextPhase = 'REACTION';
          timer = 0;
        }
        break;

      case 'REACTION':
        store.updateOutput('agitator', true);
        store.updateOutput('agitatorSpeed', 100);
        // Temperature control around setpoint
        if (temp < store.setpointTemp) {
          store.updateOutput('heater', true);
          store.updateOutput('heaterPower', 40);
          temp += 0.5 * (dtMs / 1000);
        } else {
          store.updateOutput('heater', false);
          store.updateOutput('heaterPower', 0);
          temp -= 0.2 * (dtMs / 1000);
        }
        // Hold reaction for 15 seconds
        if (timer >= 15) {
          nextPhase = 'COOLING';
          timer = 0;
        }
        break;

      case 'COOLING':
        store.updateOutput('heater', false);
        store.updateOutput('heaterPower', 0);
        store.updateOutput('coolingValve', true);
        store.updateOutput('agitatorSpeed', 30);
        temp -= 3.0 * (dtMs / 1000); // Cooling rate 3°C/s
        if (temp <= 30.0) {
          store.updateOutput('coolingValve', false);
          nextPhase = 'DRAINING';
          timer = 0;
        }
        break;

      case 'DRAINING':
        store.updateOutput('drainValve', true);
        store.updateOutput('agitator', false);
        store.updateOutput('agitatorSpeed', 0);
        level = Math.max(0, level - 20 * (dtMs / 1000)); // Drain rate 20 L/s
        if (level <= 0.5) {
          store.updateOutput('drainValve', false);
          nextPhase = 'IDLE';
          timer = 0;
        }
        break;
    }

    // 4. Update Simulated Process Inputs & Store State
    usePlcStore.setState({
      phase: nextPhase,
      phaseTimer: timer,
      inputs: {
        ...inputs,
        level: Math.round(level * 10) / 10,
        temperature: Math.round(temp * 10) / 10,
      }
    });

    store.tickScan(dtMs);
  }
}

export const softPlcEngine = new SoftPlcEngine();
