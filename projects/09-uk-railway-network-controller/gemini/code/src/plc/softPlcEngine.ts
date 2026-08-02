import { usePlcStore } from '../store/usePlcStore';

let scanIntervalId: any = null;

export function startSoftPlcEngine() {
  if (scanIntervalId) return;

  scanIntervalId = setInterval(() => {
    const store = usePlcStore.getState();
    if (!store.plcRunning) return;

    store.tickScan(50);
  }, 50);
}

export function stopSoftPlcEngine() {
  if (scanIntervalId) {
    clearInterval(scanIntervalId);
    scanIntervalId = null;
  }
}
