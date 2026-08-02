import { usePlcStore, ProcessState, PlcInputs, PlcOutputs } from '../store/usePlcStore';

class SoftPlcEngine {
  private timerId: number | null = null;
  private intervalMs: number = 50; // Soft PLC Cyclic Task Interval (~50ms)
  private prevStartPB: boolean = false;
  private prevResetPB: boolean = false;
  private latchedEStop: boolean = false;

  public start() {
    if (this.timerId !== null) return;
    this.timerId = window.setInterval(() => this.cycle(), this.intervalMs);
  }

  public stop() {
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  private cycle() {
    const startTime = performance.now();
    const store = usePlcStore.getState();
    const speed = store.simulationSpeed;

    // Retrieve active inputs (applying forced input memory overlays)
    const rawInputs = store.inputs;
    const forced = store.forcedInputs;

    const inputs: PlcInputs = {
      E_Stop: forced.E_Stop !== undefined ? (forced.E_Stop as boolean) : rawInputs.E_Stop,
      Start_PB: forced.Start_PB !== undefined ? (forced.Start_PB as boolean) : rawInputs.Start_PB,
      Stop_PB: forced.Stop_PB !== undefined ? (forced.Stop_PB as boolean) : rawInputs.Stop_PB,
      Alarm_Reset_PB: forced.Alarm_Reset_PB !== undefined ? (forced.Alarm_Reset_PB as boolean) : rawInputs.Alarm_Reset_PB,
      LT_TankA: forced.LT_TankA !== undefined ? (forced.LT_TankA as number) : rawInputs.LT_TankA,
      LT_TankB: forced.LT_TankB !== undefined ? (forced.LT_TankB as number) : rawInputs.LT_TankB,
      LT_TankC: forced.LT_TankC !== undefined ? (forced.LT_TankC as number) : rawInputs.LT_TankC,
      LSH_TankA: forced.LSH_TankA !== undefined ? (forced.LSH_TankA as boolean) : rawInputs.LSH_TankA,
      LSH_TankB: forced.LSH_TankB !== undefined ? (forced.LSH_TankB as boolean) : rawInputs.LSH_TankB,
    };

    let outputs: PlcOutputs = { ...store.outputs };
    const setpoints = store.setpoints;

    // ------------------------------------------------------------------------
    // SECTION 1: DYNAMIC PHYSICAL PROCESS SIMULATION
    // ------------------------------------------------------------------------
    let nextA = inputs.LT_TankA;
    let nextB = inputs.LT_TankB;
    let nextC = inputs.LT_TankC;

    if (speed > 0) {
      const dt = (this.intervalMs / 1000) * speed;

      // Flow Rates (% per second)
      const fillRateA = 12.0;       // Inlet pump fill speed
      const transferRateAB = 15.0;  // Transfer pump speed
      const drainRateBC = 18.0;     // Gravity drain max rate
      const dischargeRateC = 8.0;   // Outlet drain rate from Tank C

      // Tank A Physics
      if (outputs.Pump_Fill_A) {
        nextA += fillRateA * dt;
      }
      if (outputs.Pump_Transfer_AB && nextA > 0) {
        const transferred = Math.min(nextA, transferRateAB * dt);
        nextA -= transferred;
        nextB += transferred;
      }

      // Tank B Physics (Gravity Drain to Tank C based on Valve Position)
      if (outputs.Valve_Drain_BC_Pos > 0 && nextB > 0) {
        const drained = Math.min(nextB, (outputs.Valve_Drain_BC_Pos / 100.0) * drainRateBC * dt);
        nextB -= drained;
        nextC += drained;
      }

      // Tank C Physics (Natural Outflow Drain)
      if (nextC > 0) {
        nextC -= dischargeRateC * dt;
      }

      // Clamp boundary conditions [0, 100]
      nextA = Math.max(0, Math.min(100, nextA));
      nextB = Math.max(0, Math.min(100, nextB));
      nextC = Math.max(0, Math.min(100, nextC));
    }

    // Dynamic Hardwired Float Switch Trips (> 95% triggers LSH unless overridden)
    const activeLSHA = forced.LSH_TankA !== undefined ? (forced.LSH_TankA as boolean) : (inputs.LSH_TankA || nextA >= 95.0);
    const activeLSHB = forced.LSH_TankB !== undefined ? (forced.LSH_TankB as boolean) : (inputs.LSH_TankB || nextB >= 95.0);

    const updatedInputs: PlcInputs = {
      ...inputs,
      LT_TankA: nextA,
      LT_TankB: nextB,
      LT_TankC: nextC,
      LSH_TankA: activeLSHA,
      LSH_TankB: activeLSHB,
    };

    // ------------------------------------------------------------------------
    // SECTION 2: SOFT PLC LOGIC EXECUTION (IEC 61131-3 EQUIVALENT)
    // ------------------------------------------------------------------------
    
    // Edge Detection
    const startTrig = updatedInputs.Start_PB && !this.prevStartPB;
    this.prevStartPB = updatedInputs.Start_PB;

    const resetTrig = updatedInputs.Alarm_Reset_PB && !this.prevResetPB;
    this.prevResetPB = updatedInputs.Alarm_Reset_PB;

    // Safety Interlock Check: E-Stop is Normally Closed (FALSE = Emergency)
    if (!updatedInputs.E_Stop) {
      this.latchedEStop = true;
    }

    // Overflow Detection Logic
    const overflowDetected =
      updatedInputs.LT_TankA >= 100.0 ||
      updatedInputs.LT_TankB >= 100.0 ||
      updatedInputs.LSH_TankA ||
      updatedInputs.LSH_TankB;

    if (overflowDetected) {
      outputs.Alarm_Overflow = true;
    }

    // Manual Alarm Reset Execution
    if (resetTrig) {
      if (updatedInputs.E_Stop && !overflowDetected) {
        outputs.Alarm_Overflow = false;
        this.latchedEStop = false;
        if (outputs.State_Display === ProcessState.ALARM_STATE) {
          outputs.State_Display = ProcessState.IDLE;
        }
      }
    }

    // Main Safety Trip Lockout
    if (this.latchedEStop || outputs.Alarm_Overflow) {
      outputs.State_Display = ProcessState.ALARM_STATE;
      outputs.Pump_Fill_A = false;
      outputs.Pump_Transfer_AB = false;
      outputs.Valve_Drain_BC_Pos = 0.0;
    } else {
      // Finite State Machine
      switch (outputs.State_Display) {
        case ProcessState.IDLE:
          outputs.Pump_Fill_A = false;
          outputs.Pump_Transfer_AB = false;
          outputs.Valve_Drain_BC_Pos = 0.0;

          if (startTrig) {
            outputs.State_Display = ProcessState.FILLING_A;
          }
          break;

        case ProcessState.FILLING_A:
          outputs.Pump_Fill_A = true;
          outputs.Pump_Transfer_AB = false;
          outputs.Valve_Drain_BC_Pos = 0.0;

          if (updatedInputs.Stop_PB) {
            outputs.State_Display = ProcessState.IDLE;
          } else if (updatedInputs.LT_TankA >= setpoints.SP_LevelA_High) {
            outputs.State_Display = ProcessState.TRANSFERRING_AB;
          }
          break;

        case ProcessState.TRANSFERRING_AB:
          outputs.Pump_Fill_A = false;
          outputs.Pump_Transfer_AB = true;

          // Cascade Proportional Control for Tank B Drain Modulation
          if (updatedInputs.LT_TankB > setpoints.SP_LevelB_Target) {
            const propPos = (updatedInputs.LT_TankB - setpoints.SP_LevelB_Target) * setpoints.Kp_Drain;
            outputs.Valve_Drain_BC_Pos = Math.min(100.0, Math.max(0.0, propPos));
          } else {
            outputs.Valve_Drain_BC_Pos = 0.0;
          }

          if (updatedInputs.Stop_PB) {
            outputs.State_Display = ProcessState.IDLE;
          } else if (updatedInputs.LT_TankA <= 3.0 || updatedInputs.LT_TankB >= setpoints.SP_LevelB_High) {
            outputs.State_Display = ProcessState.DRAINING_BC;
          }
          break;

        case ProcessState.DRAINING_BC:
          outputs.Pump_Fill_A = false;
          outputs.Pump_Transfer_AB = false;
          outputs.Valve_Drain_BC_Pos = 100.0;

          if (updatedInputs.Stop_PB) {
            outputs.State_Display = ProcessState.IDLE;
          } else if (updatedInputs.LT_TankB <= 2.0) {
            outputs.State_Display = ProcessState.IDLE;
          }
          break;

        case ProcessState.ALARM_STATE:
          outputs.Pump_Fill_A = false;
          outputs.Pump_Transfer_AB = false;
          outputs.Valve_Drain_BC_Pos = 0.0;
          break;

        default:
          outputs.State_Display = ProcessState.IDLE;
          break;
      }
    }

    // ------------------------------------------------------------------------
    // SECTION 3: ALARM TOWER BITMASK STATUS GENERATION
    // Bit 0 (0x01) = Green  (Auto Run)
    // Bit 1 (0x02) = Yellow (Standby / Idle)
    // Bit 2 (0x04) = Red    (Alarm / Fault)
    // ------------------------------------------------------------------------
    if (outputs.State_Display === ProcessState.ALARM_STATE) {
      outputs.Alarm_Tower = 0x04; // Red
    } else if (outputs.State_Display === ProcessState.IDLE) {
      outputs.Alarm_Tower = 0x02; // Yellow
    } else {
      outputs.Alarm_Tower = 0x01; // Green
    }

    const endTime = performance.now();
    const actualScanTime = parseFloat((endTime - startTime + 0.8).toFixed(2));

    // Update Zustand Store
    store.updatePlcState(outputs, updatedInputs, this.latchedEStop, actualScanTime);
  }
}

export const softPlcEngine = new SoftPlcEngine();
