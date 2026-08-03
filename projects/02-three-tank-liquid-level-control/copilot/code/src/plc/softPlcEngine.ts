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

    usePlcStore.getState().setRunning(true);
    timer = setInterval(() => {
      plcEngine.tick();
    }, usePlcStore.getState().scanTimeMs);
  },
  stop() {
    if (!timer) {
      return;
    }

    clearInterval(timer);
    timer = null;
    usePlcStore.getState().setRunning(false);
  },
  tick() {
    const { levels, setLevels } = usePlcStore.getState();
    setLevels({
      tank1: levels.tank1,
      tank2: levels.tank2,
      tank3: levels.tank3,
    });
  },
};
