export type SoftPlcSnapshot = {
  cycleTimeMs: number;
  timestamp: number;
};

export function runSoftPlcScan(cycleTimeMs: number): SoftPlcSnapshot {
  return {
    cycleTimeMs,
    timestamp: Date.now()
  };
}
