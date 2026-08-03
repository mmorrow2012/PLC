import { usePlcStore } from '../store/usePlcStore';

export interface SoftPlcEngine {
  start: () => void;
  stop: () => void;
  tick: () => void;
}

let timer: ReturnType<typeof setInterval> | null = null;

export const plcEngine: SoftPlcEngine = {
  start() {
    if (timer) {
      return;
    }

    const { setMode, setRunning, scanTimeMs } = usePlcStore.getState();
    setRunning(true);
    setMode('running');
    timer = setInterval(() => {
      plcEngine.tick();
    }, scanTimeMs);
  },
  stop() {
    if (!timer) {
      return;
    }

    clearInterval(timer);
    timer = null;
    const { setMode, setRunning } = usePlcStore.getState();
    setRunning(false);
    setMode('stopped');
  },
  tick() {
    const { line, setLine } = usePlcStore.getState();
    setLine({ ...line });
  },
};
