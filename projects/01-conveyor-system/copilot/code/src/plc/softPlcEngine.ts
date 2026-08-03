import type { PlcStoreState, Part } from '../store/usePlcStore';

export interface PlcScanResult {
  timestamp: number;
  cycleTimeMs: number;
}

export type PlcScanCallback = (result: PlcScanResult) => void;

const SENSOR_POSITION = 75; // Position where sensor detects parts (%)
const DIVERTER_POSITION = 85; // Position where diverter acts (%)
const SENSOR_DETECTION_RANGE = 3; // Detection range (±%)

export class SoftPlcEngine {
  private intervalId: number | null = null;
  private activePartInSensorZone: Part | null = null;
  private lastDivertedPartId: number | null = null;

  public constructor(private readonly cycleTimeMs = 50) {}

  public start(onScan: PlcScanCallback, getState: () => PlcStoreState, setState: (updater: (state: PlcStoreState) => Partial<PlcStoreState>) => void): void {
    if (this.intervalId !== null) {
      return;
    }

    this.intervalId = window.setInterval(() => {
      const timestamp = Date.now();
      
      // Execute PLC scan cycle
      this.executePlcScan(getState, setState);
      
      onScan({
        timestamp,
        cycleTimeMs: this.cycleTimeMs,
      });
    }, this.cycleTimeMs);
  }

  private executePlcScan(
    getState: () => PlcStoreState,
    setState: (updater: (state: PlcStoreState) => Partial<PlcStoreState>) => void
  ): void {
    const state = getState();
    
    // Apply force table overrides
    const inputs = { ...state.inputs };
    const outputs = { ...state.outputs };
    
    Object.entries(state.forceTable).forEach(([key, value]) => {
      if (key in inputs) {
        inputs[key as keyof typeof inputs] = value as any;
      }
      if (key in outputs) {
        outputs[key as keyof typeof outputs] = value as any;
      }
    });
    
    // ========== RUNG 1: Safety E-Stop Interlock ==========
    // NC logic: E_Stop FALSE = emergency condition
    const rung1_eStopOK = inputs.E_Stop;
    const rung1_energized = rung1_eStopOK;
    
    // Latch safety fault on E-Stop loss
    let safetyLatched = state.safetyLatched;
    if (!inputs.E_Stop) {
      safetyLatched = true;
      outputs.Alarm_Tower = outputs.Alarm_Tower | 0x01; // Set alarm bit 0
    }
    
    // Reset safety latch with Reset_PB (only if E-Stop is safe)
    if (inputs.Reset_PB && inputs.E_Stop) {
      safetyLatched = false;
      outputs.Alarm_Tower = outputs.Alarm_Tower & ~0x01; // Clear alarm bit 0
    }
    
    // ========== RUNG 2: VFD Run Enable ==========
    const rung2_safetyOK = inputs.E_Stop && !safetyLatched;
    const rung2_energized = rung2_safetyOK && state.plcRunning;
    
    outputs.VFD_Run = rung2_energized;
    
    // ========== Update part positions and sensor detection ==========
    const updatedParts = this.updatePartPositions(state, outputs.VFD_Run);
    const partInSensorZone = this.detectPartInSensorZone(updatedParts);
    
    // Update sensor inputs based on detected part
    if (partInSensorZone) {
      inputs.Sensor_PartDetect = true;
      inputs.Sensor_Color = partInSensorZone.color;
      inputs.Sensor_Weight = partInSensorZone.weight;
      
      // Track which part is being inspected
      if (!this.activePartInSensorZone || this.activePartInSensorZone.id !== partInSensorZone.id) {
        this.activePartInSensorZone = partInSensorZone;
      }
    } else {
      inputs.Sensor_PartDetect = false;
      inputs.Sensor_Color = 0;
      inputs.Sensor_Weight = 0.0;
      this.activePartInSensorZone = null;
    }
    
    // ========== RUNG 3: Part Detection & Inspection ==========
    const rung3_partDetected = inputs.Sensor_PartDetect;
    const rung3_energized = rung3_partDetected;
    
    // ========== RUNG 4: Reject Diverter Logic ==========
    // Reject if color = 1 (Red) OR weight > 2.0 kg
    const rung4_rejectCondition = inputs.Sensor_PartDetect && 
      (inputs.Sensor_Color === 1 || inputs.Sensor_Weight > 2.0);
    const rung4_energized = rung4_rejectCondition;
    
    // Diverter actuation: activate ONLY for the specific inspected part
    let shouldDivert = false;
    if (this.activePartInSensorZone && rung4_rejectCondition) {
      // Check if this part is at diverter position and hasn't been diverted yet
      const partAtDiverter = updatedParts.find(p => 
        p.id === this.activePartInSensorZone!.id &&
        Math.abs(p.position - DIVERTER_POSITION) < SENSOR_DETECTION_RANGE
      );
      
      if (partAtDiverter && !partAtDiverter.diverted && this.lastDivertedPartId !== partAtDiverter.id) {
        shouldDivert = true;
        partAtDiverter.diverted = true;
        this.lastDivertedPartId = partAtDiverter.id;
      }
    }
    
    outputs.Actuator_Diverter = shouldDivert;
    
    // ========== RUNG 5: Speed Reference Output ==========
    const rung5_vfdRunning = outputs.VFD_Run;
    const rung5_energized = rung5_vfdRunning;
    
    if (outputs.VFD_Run) {
      outputs.VFD_Speed_Ref = state.speedSetpoint;
    } else {
      outputs.VFD_Speed_Ref = 0.0;
    }
    
    // Update counters for parts that completed their journey
    let partCountTotal = state.partCountTotal;
    let partCountAccept = state.partCountAccept;
    let partCountReject = state.partCountReject;
    
    const remainingParts = updatedParts.filter(p => {
      if (p.position >= 100 && !p.passed) {
        p.passed = true;
        partCountTotal++;
        if (p.diverted) {
          partCountReject++;
        } else {
          partCountAccept++;
        }
        return false; // Remove from belt
      }
      return true;
    });
    
    // Update state
    setState(() => ({
      inputs,
      outputs,
      safetyLatched,
      parts: remainingParts,
      partCountTotal,
      partCountAccept,
      partCountReject,
      scanCount: state.scanCount + 1,
      ladderRungs: [
        { id: 'rung1', description: 'Safety E-Stop Interlock', energized: rung1_energized },
        { id: 'rung2', description: 'VFD Run Enable', energized: rung2_energized },
        { id: 'rung3', description: 'Part Detection & Inspection', energized: rung3_energized },
        { id: 'rung4', description: 'Reject Diverter Logic', energized: rung4_energized },
        { id: 'rung5', description: 'Speed Reference Output', energized: rung5_energized },
      ],
    }));
  }

  private updatePartPositions(state: PlcStoreState, vfdRunning: boolean): Part[] {
    if (!vfdRunning) {
      return state.parts;
    }
    
    const speedFactor = state.speedSetpoint / 100.0;
    const deltaPosition = speedFactor * 0.5; // Movement per scan cycle
    
    return state.parts.map(p => ({
      ...p,
      position: p.position + deltaPosition,
    }));
  }

  private detectPartInSensorZone(parts: Part[]): Part | null {
    return parts.find(p => 
      Math.abs(p.position - SENSOR_POSITION) < SENSOR_DETECTION_RANGE
    ) || null;
  }

  public stop(): void {
    if (this.intervalId === null) {
      return;
    }

    window.clearInterval(this.intervalId);
    this.intervalId = null;
    this.activePartInSensorZone = null;
    this.lastDivertedPartId = null;
  }

  public isRunning(): boolean {
    return this.intervalId !== null;
  }
}
