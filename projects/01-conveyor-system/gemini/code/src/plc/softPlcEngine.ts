import { usePlcStore } from '../store/usePlcStore';

let scanIntervalId: any = null;

/**
 * Soft-PLC Cyclic Execution Engine
 * Simulates a Modicon M580 Periodic Task execution loop (~50ms scan time)
 */
export function startSoftPlcEngine() {
  if (scanIntervalId) return;

  scanIntervalId = setInterval(() => {
    const store = usePlcStore.getState();
    if (!store.isScanRunning) return;

    const startTime = performance.now();

    // ------------------------------------------------------------------------
    // STEP 1: READ INPUT IMAGE (WITH FORCE TABLE OVERRIDES)
    // ------------------------------------------------------------------------
    const getInputValue = <T>(tagName: keyof typeof store.inputs): T => {
      const force = store.forces[tagName];
      if (force && force.isForced) {
        return force.forcedValue as T;
      }
      return store.inputs[tagName] as T;
    };

    const E_Stop = getInputValue<boolean>('E_Stop');
    const Reset_PB = getInputValue<boolean>('Reset_PB');
    const Target_Speed = getInputValue<number>('Target_Speed');

    // ------------------------------------------------------------------------
    // STEP 2: PHYSICAL SIMULATION TICK & SENSOR MAPPING
    // ------------------------------------------------------------------------
    const vfdRunState = store.outputs.VFD_Run;
    const vfdSpeedState = store.outputs.VFD_Speed_Ref;
    const currentSpeedDelta = vfdRunState ? (vfdSpeedState / 100.0) * 0.9 : 0.0;

    let updatedParts = store.parts.map((p) => ({ ...p }));
    let activePartInSensorZone: any = null;

    updatedParts = updatedParts.filter((part) => {
      // Advance main belt position if not diverted
      if (!part.diverted) {
        part.x += currentSpeedDelta;
      } else {
        // Slide down reject chute
        part.divertProgress += 0.08;
      }

      // Sensing Window: Part between 44% and 54% of belt length
      if (part.x >= 44 && part.x <= 54 && !part.diverted) {
        activePartInSensorZone = part;
      }

      // Remove off-screen parts
      if (part.x > 105 || part.divertProgress >= 1.0) {
        return false;
      }
      return true;
    });

    // Sensor physical signals
    let physPartDetect = false;
    let physColor = 0;
    let physWeight = 0.0;

    if (activePartInSensorZone) {
      physPartDetect = true;
      physColor = activePartInSensorZone.color;
      physWeight = activePartInSensorZone.weight;
    }

    // Apply force overrides to sensors if present
    const Sensor_PartDetect = store.forces['Sensor_PartDetect']?.isForced
      ? (store.forces['Sensor_PartDetect'].forcedValue as boolean)
      : physPartDetect;
    const Sensor_Color = store.forces['Sensor_Color']?.isForced
      ? (store.forces['Sensor_Color'].forcedValue as number)
      : physColor;
    const Sensor_Weight = store.forces['Sensor_Weight']?.isForced
      ? (store.forces['Sensor_Weight'].forcedValue as number)
      : physWeight;

    // ------------------------------------------------------------------------
    // STEP 3: EXECUTE STRUCTURED TEXT LOGIC RULES (conveyorLogic.st)
    // ------------------------------------------------------------------------
    let systemFault = store.systemFault;
    let VFD_Run = false;
    let VFD_Speed_Ref = 0.0;
    let Actuator_Diverter = false;
    let Alarm_Tower = 0x04; // 0x04 = Red Alarm

    // Rule 1: Safety Interlock
    if (!E_Stop) {
      systemFault = true;
      VFD_Run = false;
      VFD_Speed_Ref = 0.0;
      Actuator_Diverter = false;
      Alarm_Tower = 0x04; // Bit 2 = Red Alarm
    } else if (Reset_PB && systemFault) {
      systemFault = false;
    }

    // Rule 2 & 3: Normal Conveyor Execution & Dynamic Speed Regulation
    if (!systemFault) {
      VFD_Run = true;
      VFD_Speed_Ref = Math.max(0.0, Math.min(100.0, Target_Speed));

      // Rule 2: Part Sorting Logic
      if (Sensor_PartDetect) {
        const isRejectColor = Sensor_Color === 1;
        const isWeightOutOfSpec = Sensor_Weight < 0.5 || Sensor_Weight > 5.0;

        if (isRejectColor || isWeightOutOfSpec) {
          Actuator_Diverter = true;
          Alarm_Tower = 0x03; // Bit 0 + Bit 1 (Green + Yellow Warning)
        } else {
          Actuator_Diverter = false;
          Alarm_Tower = 0x01; // Bit 0 (Green Run)
        }
      } else {
        Actuator_Diverter = false;
        Alarm_Tower = 0x01; // Bit 0 (Green Run)
      }
    } else {
      VFD_Run = false;
      VFD_Speed_Ref = 0.0;
      Actuator_Diverter = false;
      Alarm_Tower = 0x04; // Red Alarm
    }

    // Apply forced overrides on output tags if enabled
    if (store.forces['VFD_Run']?.isForced) {
      VFD_Run = Boolean(store.forces['VFD_Run'].forcedValue);
    }
    if (store.forces['VFD_Speed_Ref']?.isForced) {
      VFD_Speed_Ref = Number(store.forces['VFD_Speed_Ref'].forcedValue);
    }
    if (store.forces['Actuator_Diverter']?.isForced) {
      Actuator_Diverter = Boolean(store.forces['Actuator_Diverter'].forcedValue);
    }
    if (store.forces['Alarm_Tower']?.isForced) {
      Alarm_Tower = Number(store.forces['Alarm_Tower'].forcedValue);
    }

    // ------------------------------------------------------------------------
    // STEP 4: ACTUATOR PHYSICAL EFFECT ON SIMULATION
    // ------------------------------------------------------------------------
    if (Actuator_Diverter) {
      updatedParts.forEach((p) => {
        if (p.x >= 44 && p.x <= 56 && !p.diverted) {
          p.diverted = true;
        }
      });
    }

    // Production Counter Updates
    let addTotal = 0;
    let addAccept = 0;
    let addReject = 0;

    updatedParts.forEach((p) => {
      if (!p.passed) {
        if (p.diverted) {
          p.passed = true;
          addTotal++;
          addReject++;
        } else if (p.x > 56) {
          p.passed = true;
          addTotal++;
          addAccept++;
        }
      }
    });

    const endTime = performance.now();
    const scanMs = Number((endTime - startTime).toFixed(2));

    // ------------------------------------------------------------------------
    // STEP 5: WRITE OUTPUT IMAGE TO ZUSTAND MEMORY STORE
    // ------------------------------------------------------------------------
    usePlcStore.setState((state) => ({
      inputs: {
        ...state.inputs,
        Sensor_PartDetect,
        Sensor_Color,
        Sensor_Weight,
      },
      outputs: {
        VFD_Run,
        VFD_Speed_Ref,
        Actuator_Diverter,
        Alarm_Tower,
      },
      systemFault,
      partCountTotal: state.partCountTotal + addTotal,
      partCountAccept: state.partCountAccept + addAccept,
      partCountReject: state.partCountReject + addReject,
      scanTimeMs: scanMs || 0.05,
      cycleCount: state.cycleCount + 1,
      parts: updatedParts,
    }));
  }, 50);
}

export function stopSoftPlcEngine() {
  if (scanIntervalId) {
    clearInterval(scanIntervalId);
    scanIntervalId = null;
  }
}
