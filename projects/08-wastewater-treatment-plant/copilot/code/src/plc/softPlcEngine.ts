import type { PlcStoreState } from '../store/usePlcStore';

export interface SoftPlcSnapshot {
  isRunning: boolean;
  basinCount: number;
  scanTimeMs: number;
}

export function createSoftPlcSnapshot(state: PlcStoreState): SoftPlcSnapshot {
  return {
    isRunning: state.isRunning,
    basinCount: state.basins.length,
    scanTimeMs: state.scanTimeMs,
  };
}
