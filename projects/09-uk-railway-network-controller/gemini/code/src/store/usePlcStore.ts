import { create } from 'zustand';

export interface TrainState {
  id: string;
  name: string;
  operator: string;
  route: string[];
  routeStepIndex: number;
  progressBetweenStations: number; // 0.0 to 1.0
  speedKmH: number;
  targetSpeedKmH: number;
  platform: string;
  status: 'ON TIME' | 'BOARDING' | 'DEPARTED' | 'HOLDING' | 'DELAYED' | 'FAULT';
  color: string;
}

export interface PlcInputs {
  eStop: boolean;
  masterRun: boolean;
  resetFault: boolean;
  pointSwitchRequest: boolean;
  tsrActive: boolean;
}

export interface PlcOutputs {
  signalLondonGreen: boolean;
  signalBrumGreen: boolean;
  signalManchesterGreen: boolean;
  signalScotlandGreen: boolean;
  pointMotorAlignMain: boolean;
  pointMotorAlignBranch: boolean;
  platformBuzzer: boolean;
  masterSafetyRelay: boolean;
  vfdTractionSpeed1: number;
  vfdTractionSpeed2: number;
}

export interface PlcState {
  plcRunning: boolean;
  scanTimeMs: number;
  cycleCount: number;
  systemFault: boolean;
  audioEnabled: boolean;
  selectedPaStation: string; // 'ALL' or specific station name
  activeAnnouncement: string | null;

  stations: string[];
  trains: TrainState[];
  pointSwitchPosition: 'MAIN' | 'BRANCH';
  signalOverrides: Record<string, boolean>;

  inputs: PlcInputs;
  outputs: PlcOutputs;

  togglePlc: () => void;
  setEstop: (active: boolean) => void;
  setTrainSpeed: (trainId: string, speedKmH: number) => void;
  accelerateTrain: (trainId: string) => void;
  decelerateTrain: (trainId: string) => void;
  togglePointSwitch: () => void;
  toggleSignalOverride: (signalKey: string) => void;
  toggleTsr: () => void;
  reassignPlatform: (trainId: string, newPlatform: string) => void;
  setSelectedPaStation: (station: string) => void;
  toggleAudio: () => void;
  speakAnnouncement: (text: string) => void;
  triggerManualAnnouncement: () => void;
  triggerReset: () => void;
  tickScan: (dtMs: number) => void;
}

export const STATIONS = [
  'London Euston',
  'Coventry',
  'Birmingham New St',
  'Bristol Temple Meads',
  'Liverpool Lime St',
  'Manchester Piccadilly',
  'Leeds',
  'Glasgow Central',
  'Edinburgh Waverley',
];

export const ROUTE_WCML = [
  'London Euston',
  'Coventry',
  'Birmingham New St',
  'Liverpool Lime St',
  'Manchester Piccadilly',
  'Glasgow Central',
  'Edinburgh Waverley',
  'Glasgow Central',
  'Manchester Piccadilly',
  'Liverpool Lime St',
  'Birmingham New St',
  'Coventry',
  'London Euston',
];

export const ROUTE_ECML = [
  'London Euston',
  'Leeds',
  'Edinburgh Waverley',
  'Leeds',
  'London Euston',
];

export const ROUTE_XC = [
  'Bristol Temple Meads',
  'Birmingham New St',
  'Leeds',
  'Birmingham New St',
  'Bristol Temple Meads',
];

export const ROUTE_TPE = [
  'Liverpool Lime St',
  'Manchester Piccadilly',
  'Leeds',
  'Manchester Piccadilly',
  'Liverpool Lime St',
];

export const ROUTE_GWML = [
  'London Euston',
  'Bristol Temple Meads',
  'London Euston',
];

export const usePlcStore = create<PlcState>((set, get) => ({
  plcRunning: true,
  scanTimeMs: 4.2,
  cycleCount: 0,
  systemFault: false,
  audioEnabled: false,
  selectedPaStation: 'ALL',
  activeAnnouncement: null,

  stations: STATIONS,
  pointSwitchPosition: 'MAIN',
  signalOverrides: {
    London: true,
    Brum: true,
    Manch: true,
    Scotland: true,
  },

  trains: [
    {
      id: 'train-1',
      name: 'Avanti West Coast #101',
      operator: 'Avanti West Coast',
      route: ROUTE_WCML,
      routeStepIndex: 0,
      progressBetweenStations: 0.2,
      speedKmH: 140,
      targetSpeedKmH: 140,
      platform: 'Plat 3',
      status: 'ON TIME',
      color: '#ef4444',
    },
    {
      id: 'train-2',
      name: 'LNER Intercity #204',
      operator: 'LNER',
      route: ROUTE_ECML,
      routeStepIndex: 0,
      progressBetweenStations: 0.4,
      speedKmH: 155,
      targetSpeedKmH: 160,
      platform: 'Plat 1',
      status: 'ON TIME',
      color: '#0284c7',
    },
    {
      id: 'train-3',
      name: 'CrossCountry Express #307',
      operator: 'CrossCountry',
      route: ROUTE_XC,
      routeStepIndex: 0,
      progressBetweenStations: 0.6,
      speedKmH: 120,
      targetSpeedKmH: 130,
      platform: 'Plat 5',
      status: 'BOARDING',
      color: '#ec4899',
    },
    {
      id: 'train-4',
      name: 'TransPennine Express #412',
      operator: 'TransPennine',
      route: ROUTE_TPE,
      routeStepIndex: 0,
      progressBetweenStations: 0.15,
      speedKmH: 110,
      targetSpeedKmH: 120,
      platform: 'Plat 2',
      status: 'DELAYED',
      color: '#a855f7',
    },
    {
      id: 'train-5',
      name: 'Great Western Railway #518',
      operator: 'GWR',
      route: ROUTE_GWML,
      routeStepIndex: 0,
      progressBetweenStations: 0.75,
      speedKmH: 135,
      targetSpeedKmH: 140,
      platform: 'Plat 4',
      status: 'ON TIME',
      color: '#22c55e',
    },
  ],

  inputs: {
    eStop: false,
    masterRun: true,
    resetFault: false,
    pointSwitchRequest: false,
    tsrActive: false,
  },

  outputs: {
    signalLondonGreen: true,
    signalBrumGreen: true,
    signalManchesterGreen: true,
    signalScotlandGreen: true,
    pointMotorAlignMain: true,
    pointMotorAlignBranch: false,
    platformBuzzer: false,
    masterSafetyRelay: true,
    vfdTractionSpeed1: 70,
    vfdTractionSpeed2: 60,
  },

  togglePlc: () => set((s) => ({ plcRunning: !s.plcRunning })),

  setSelectedPaStation: (station) => set({ selectedPaStation: station }),

  toggleAudio: () =>
    set((s) => {
      const nextAudio = !s.audioEnabled;
      if (nextAudio) {
        get().speakAnnouncement("Station Public Address System online. Selected PA zone: " + (s.selectedPaStation === 'ALL' ? 'All Intercity Stations' : s.selectedPaStation));
      } else if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      return { audioEnabled: nextAudio };
    }),

  // Queued Non-Interrupting Speech Synthesis Helper
  speakAnnouncement: (text: string) => {
    set({ activeAnnouncement: text });

    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    // PREVENT INTERRUPTING MID-SENTENCE: Check if speech synthesizer is currently speaking!
    if (window.speechSynthesis.speaking) {
      // If speech synthesis is active, do NOT cancel mid-sentence. Wait until current speech finishes.
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  },

  triggerManualAnnouncement: () => {
    const s = get();
    const station = s.selectedPaStation === 'ALL' ? 'London Euston' : s.selectedPaStation;
    const matchingTrain = s.trains.find((t) => t.route.includes(station)) || s.trains[0];
    const text = `Attention passengers at ${station}. The ${matchingTrain.name} is scheduled on ${matchingTrain.platform}. Please stand behind the yellow line.`;
    get().speakAnnouncement(text);
  },

  setEstop: (active) =>
    set((s) => ({
      inputs: { ...s.inputs, eStop: active },
      systemFault: active,
      trains: s.trains.map((t) => ({
        ...t,
        speedKmH: active ? 0 : t.targetSpeedKmH,
        status: active ? 'FAULT' : 'ON TIME',
      })),
    })),

  setTrainSpeed: (trainId, targetSpeedKmH) =>
    set((s) => ({
      trains: s.trains.map((t) =>
        t.id === trainId ? { ...t, targetSpeedKmH: Math.max(0, Math.min(200, targetSpeedKmH)) } : t
      ),
    })),

  accelerateTrain: (trainId) =>
    set((s) => ({
      trains: s.trains.map((t) =>
        t.id === trainId ? { ...t, targetSpeedKmH: Math.min(200, t.targetSpeedKmH + 20) } : t
      ),
    })),

  decelerateTrain: (trainId) =>
    set((s) => ({
      trains: s.trains.map((t) =>
        t.id === trainId ? { ...t, targetSpeedKmH: Math.max(0, t.targetSpeedKmH - 20) } : t
      ),
    })),

  togglePointSwitch: () =>
    set((s) => {
      const nextPos = s.pointSwitchPosition === 'MAIN' ? 'BRANCH' : 'MAIN';
      return {
        pointSwitchPosition: nextPos,
        outputs: {
          ...s.outputs,
          pointMotorAlignMain: nextPos === 'MAIN',
          pointMotorAlignBranch: nextPos === 'BRANCH',
        },
      };
    }),

  toggleSignalOverride: (signalKey) =>
    set((s) => {
      const updated = { ...s.signalOverrides, [signalKey]: !s.signalOverrides[signalKey] };
      return {
        signalOverrides: updated,
        outputs: {
          ...s.outputs,
          signalLondonGreen: updated.London,
          signalBrumGreen: updated.Brum,
          signalManchesterGreen: updated.Manch,
          signalScotlandGreen: updated.Scotland,
        },
      };
    }),

  toggleTsr: () =>
    set((s) => {
      const nextTsr = !s.inputs.tsrActive;
      return {
        inputs: { ...s.inputs, tsrActive: nextTsr },
        trains: s.trains.map((t) => ({
          ...t,
          targetSpeedKmH: nextTsr ? Math.min(50, t.targetSpeedKmH) : t.targetSpeedKmH,
        })),
      };
    }),

  reassignPlatform: (trainId, newPlatform) =>
    set((s) => ({
      trains: s.trains.map((t) => (t.id === trainId ? { ...t, platform: newPlatform } : t)),
    })),

  triggerReset: () =>
    set((s) => ({
      systemFault: false,
      inputs: { ...s.inputs, eStop: false, resetFault: true },
      trains: s.trains.map((t) => ({ ...t, status: 'ON TIME', speedKmH: t.targetSpeedKmH })),
    })),

  tickScan: (dtMs) => {
    const state = get();
    if (!state.plcRunning || state.inputs.eStop) return;

    // Advance 5 trains along route waypoints
    const updatedTrains = state.trains.map((t) => {
      const currentStation = t.route[t.routeStepIndex];
      let isHeldBySignal = false;
      if (currentStation.includes('London') && !state.signalOverrides.London) isHeldBySignal = true;
      if (currentStation.includes('Birmingham') && !state.signalOverrides.Brum) isHeldBySignal = true;
      if (currentStation.includes('Manchester') && !state.signalOverrides.Manch) isHeldBySignal = true;
      if ((currentStation.includes('Glasgow') || currentStation.includes('Edinburgh')) && !state.signalOverrides.Scotland) isHeldBySignal = true;

      const effectiveTargetSpeed = isHeldBySignal
        ? 0
        : state.inputs.tsrActive
        ? Math.min(50, t.targetSpeedKmH)
        : t.targetSpeedKmH;

      let newSpeed = t.speedKmH;
      if (newSpeed < effectiveTargetSpeed) {
        newSpeed = Math.min(effectiveTargetSpeed, newSpeed + 2.0);
      } else if (newSpeed > effectiveTargetSpeed) {
        newSpeed = Math.max(effectiveTargetSpeed, newSpeed - 3.5);
      }

      const step = (newSpeed / 200) * (dtMs / 2500);
      let newProgress = t.progressBetweenStations + step;
      let newRouteIdx = t.routeStepIndex;
      let status = t.status;

      if (newProgress >= 1.0) {
        newProgress = 0.0;
        newRouteIdx = (newRouteIdx + 1) % t.route.length;
        status = 'ON TIME';

        const arrStation = t.route[newRouteIdx];
        const nextStop = t.route[(newRouteIdx + 1) % t.route.length];

        // PA STATION FILTER: Speak ONLY if selected station is 'ALL' OR matches arrStation
        const matchesStation = state.selectedPaStation === 'ALL' || state.selectedPaStation === arrStation;

        if (state.audioEnabled && matchesStation) {
          const text = `Attention passengers at ${arrStation}. The ${t.name} service to ${nextStop} is now arriving on ${t.platform}.`;
          get().speakAnnouncement(text);
        }
      } else if (newProgress < 0.1) {
        status = 'BOARDING';
      } else if (isHeldBySignal) {
        status = 'HOLDING';
      }

      return {
        ...t,
        speedKmH: newSpeed,
        progressBetweenStations: newProgress,
        routeStepIndex: newRouteIdx,
        status,
      };
    });

    set((s) => ({
      cycleCount: s.cycleCount + 1,
      trains: updatedTrains as TrainState[],
    }));
  },
}));
