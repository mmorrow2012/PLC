import { usePlcStore, GateState } from '../store/usePlcStore';

const WATCHDOG_MAX_MS = 8000;  // T#8S
const AUTOCLOSE_MAX_MS = 5000; // T#5S
const GATE_SPEED_DEG_PER_SEC = 30; // Takes 3 seconds to open 90 degrees

let intervalId: number | null = null;

export function startSoftPlc() {
  if (intervalId !== null) return;

  let lastTime = performance.now();

  intervalId = window.setInterval(() => {
    const store = usePlcStore.getState();
    if (!store.plcRunning) return;

    const now = performance.now();
    const dt = Math.min((now - lastTime) / 1000, 0.1); // in seconds
    const dtMs = dt * 1000;
    lastTime = now;

    const startTime = performance.now();

    // ------------------------------------------------------------------------
    // 1. RESOLVE EFFECTIVE INPUTS (Merge forced inputs)
    // ------------------------------------------------------------------------
    const effInputs = { ...store.inputs, ...store.forcedInputs };

    let { gateAngle, vehiclePos, isVehicleInLane, autoDriveVehicle, gateState, watchdogTimeMs, autoCloseTimeMs } = store;
    let { Motor_GateUp, Motor_GateDown, Alarm_StuckGate } = store.outputs;

    // ------------------------------------------------------------------------
    // 2. PHYSICAL SIMULATION STEP (Gate movement, limits, vehicle motion)
    // ------------------------------------------------------------------------
    
    // Gate Physical Movement based on Motor Contactor outputs
    if (Motor_GateUp && !Motor_GateDown) {
      gateAngle += GATE_SPEED_DEG_PER_SEC * dt;
      if (gateAngle > 90) gateAngle = 90;
    } else if (Motor_GateDown && !Motor_GateUp) {
      gateAngle -= GATE_SPEED_DEG_PER_SEC * dt;
      if (gateAngle < 0) gateAngle = 0;
    }

    // Limit Switches derived from physical position
    const Sensor_GateOpenLimit = gateAngle >= 89.5;
    const Sensor_GateClosedLimit = gateAngle <= 0.5;

    // Vehicle Movement Simulation
    if (isVehicleInLane) {
      if (autoDriveVehicle || vehiclePos < 0 || (gateAngle > 70 && vehiclePos < 100)) {
        if (vehiclePos < 0) {
          vehiclePos += 40 * dt;
          if (vehiclePos > 0) vehiclePos = 0;
        }
        if ((store.outputs.Light_Green || gateAngle >= 85) && vehiclePos >= 0 && vehiclePos < 100) {
          vehiclePos += 50 * dt;
        }
        if (vehiclePos >= 100) {
          vehiclePos = 100;
        }
      }
    }

    // Vehicle presence sensor (inductive loop at pos -25 to 25)
    const Sensor_VehiclePresence = effInputs.Sensor_VehiclePresence || (isVehicleInLane && vehiclePos >= -25 && vehiclePos <= 25);

    // Update derived inputs into state
    effInputs.Sensor_GateOpenLimit = Sensor_GateOpenLimit;
    effInputs.Sensor_GateClosedLimit = Sensor_GateClosedLimit;
    effInputs.Sensor_VehiclePresence = Sensor_VehiclePresence;

    // ------------------------------------------------------------------------
    // 3. PLC DOMAIN LOGIC SCAN
    // ------------------------------------------------------------------------
    
    let nextMotorUp = false;
    let nextMotorDown = false;
    let nextLightGreen = false;
    let nextLightRed = true;
    let nextBuzzer = false;
    let nextAlarmStuck = Alarm_StuckGate;
    let nextState: GateState = gateState;

    // A. EMERGENCY STOP CHECK (NC Switch: false = E-STOP)
    if (!effInputs.E_Stop) {
      nextMotorUp = false;
      nextMotorDown = false;
      nextBuzzer = false;
      nextLightGreen = false;
      nextLightRed = true;
      nextState = 'FAULT';
      watchdogTimeMs = 0;
      autoCloseTimeMs = 0;
    } 
    // B. RESET HANDLING
    else if (effInputs.PB_Reset) {
      nextAlarmStuck = false;
      if (gateState === 'FAULT') {
        if (Sensor_GateClosedLimit) nextState = 'CLOSED';
        else if (Sensor_GateOpenLimit) nextState = 'OPEN';
        else nextState = 'IDLE';
      }
    }
    // C. FAULT INTERLOCK
    else if (nextAlarmStuck) {
      nextMotorUp = false;
      nextMotorDown = false;
      nextBuzzer = false;
      nextLightGreen = false;
      nextLightRed = true;
      nextState = 'FAULT';
    } 
    // D. STATE MACHINE EVALUATION
    else {
      switch (gateState) {
        case 'IDLE':
          nextMotorUp = false;
          nextMotorDown = false;
          nextBuzzer = false;
          nextLightGreen = false;
          nextLightRed = true;

          if (Sensor_GateClosedLimit) {
            nextState = 'CLOSED';
          } else if (Sensor_GateOpenLimit) {
            nextState = 'OPEN';
          } else if (Sensor_VehiclePresence || effInputs.PB_ManualOpen) {
            nextState = 'OPENING';
          } else if (effInputs.PB_ManualClose) {
            nextState = 'CLOSING';
          }
          break;

        case 'CLOSED':
          nextMotorUp = false;
          nextMotorDown = false;
          nextBuzzer = false;
          nextLightGreen = false;
          nextLightRed = true;

          if (Sensor_VehiclePresence || effInputs.PB_ManualOpen) {
            nextState = 'OPENING';
          }
          break;

        case 'OPENING':
          nextMotorUp = true;
          nextMotorDown = false;
          nextBuzzer = true;
          nextLightGreen = false;
          nextLightRed = true;

          if (Sensor_GateOpenLimit) {
            nextMotorUp = false;
            nextBuzzer = false;
            nextState = 'OPEN';
            watchdogTimeMs = 0;
          }
          break;

        case 'OPEN':
          nextMotorUp = false;
          nextMotorDown = false;
          nextBuzzer = false;
          nextLightGreen = true;
          nextLightRed = false;

          if (effInputs.PB_ManualClose) {
            nextState = 'CLOSING';
            autoCloseTimeMs = 0;
          } else if (autoCloseTimeMs >= AUTOCLOSE_MAX_MS) {
            nextState = 'CLOSING';
            autoCloseTimeMs = 0;
          }
          break;

        case 'CLOSING':
          nextMotorUp = false;
          nextMotorDown = true;
          nextBuzzer = true;
          nextLightGreen = false;
          nextLightRed = true;

          // OBSTRUCTION OR VEHICLE ARRIVAL REVERSAL
          if (effInputs.Sensor_Obstruction || Sensor_VehiclePresence) {
            nextMotorDown = false;
            nextState = 'OPENING';
            watchdogTimeMs = 0;
          } else if (effInputs.PB_ManualOpen) {
            nextMotorDown = false;
            nextState = 'OPENING';
            watchdogTimeMs = 0;
          } else if (Sensor_GateClosedLimit) {
            nextMotorDown = false;
            nextBuzzer = false;
            nextState = 'CLOSED';
            watchdogTimeMs = 0;
          }
          break;

        case 'FAULT':
          nextMotorUp = false;
          nextMotorDown = false;
          nextBuzzer = false;
          nextLightGreen = false;
          nextLightRed = true;
          break;
      }

      // ----------------------------------------------------------------------
      // 4. TIMERS (TON Watchdog & TON AutoClose)
      // ----------------------------------------------------------------------
      if (nextState === 'OPEN' && !Sensor_VehiclePresence) {
        autoCloseTimeMs += dtMs;
      } else {
        autoCloseTimeMs = 0;
      }

      if (nextState === 'OPENING' || nextState === 'CLOSING') {
        watchdogTimeMs += dtMs;
        if (watchdogTimeMs >= WATCHDOG_MAX_MS) {
          nextAlarmStuck = true;
          nextMotorUp = false;
          nextMotorDown = false;
          nextBuzzer = false;
          nextState = 'FAULT';
        }
      } else {
        watchdogTimeMs = 0;
      }
    }

    const duration = performance.now() - startTime;

    // ------------------------------------------------------------------------
    // 5. UPDATE STORE
    // ------------------------------------------------------------------------
    store.setOutput({
      Motor_GateUp: nextMotorUp,
      Motor_GateDown: nextMotorDown,
      Light_Green: nextLightGreen,
      Light_Red: nextLightRed,
      Alarm_StuckGate: nextAlarmStuck,
      Buzzer: nextBuzzer,
    });

    store.setInput('Sensor_GateOpenLimit', Sensor_GateOpenLimit);
    store.setInput('Sensor_GateClosedLimit', Sensor_GateClosedLimit);
    store.setInput('Sensor_VehiclePresence', Sensor_VehiclePresence);

    store.setGateState(nextState);
    store.setGateAngle(gateAngle);
    store.setVehiclePos(vehiclePos);
    store.setTimerValues(watchdogTimeMs, autoCloseTimeMs);
    store.recordScan(duration);
  }, 50);
}

export function stopSoftPlc() {
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }
}
