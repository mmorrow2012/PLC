import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  BatchState,
  DigitalInputs,
  AnalogInputs,
  DigitalOutputs,
  AnalogOutputs,
  MemoryWords,
  TelemetryPoint,
  PLCContextType
} from '../types/plc';

const defaultInputs: DigitalInputs = {
  I_EStop_NC: true,       // Hardware NC = true when safe
  I_StartBatch_PB: false,
  I_StopBatch_PB: false,
  I_ResetFault_PB: false,
  I_LSH_TankA: false,
  I_LSH_TankB: false,
  I_LSH_Reactor: false,
  I_AgitatorHealth: true, // Relay NC = true when safe
};

const defaultAnalogInputs: AnalogInputs = {
  AI_LT_TankA: 800.0,    // Tank A initial volume (L)
  AI_LT_TankB: 600.0,    // Tank B initial volume (L)
  AI_LT_Reactor: 0.0,    // Reactor volume (L)
  AI_TT_Reactor: 22.5,   // Ambient temperature (°C)
  AI_pHT_Reactor: 7.0,   // Neutral pH
};

const defaultOutputs: DigitalOutputs = {
  Q_PumpA_Run: false,
  Q_PumpB_Run: false,
  Q_Agitator_Run: false,
  Q_HeaterJacket_On: false,
  Q_PumpAcid_Dose: false,
  Q_PumpBase_Dose: false,
  Q_Valve_ProductDrain: false,
  Q_AlarmBeacon: false,
};

const defaultAnalogOutputs: AnalogOutputs = {
  AQ_V1_RatioA: 0.0,
  AQ_V2_RatioB: 0.0,
};

const defaultMemory: MemoryWords = {
  M_BatchState: BatchState.IDLE,
  M_RecipeRatioA: 600.0,
  M_RecipeRatioB: 400.0,
  M_TargetTemp: 65.0,
  M_TargetpH: 7.0,
};

const PLCContext = createContext<PLCContextType | undefined>(undefined);

export const PLCProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [inputs, setInputs] = useState<DigitalInputs>(defaultInputs);
  const [analogInputs, setAnalogInputs] = useState<AnalogInputs>(defaultAnalogInputs);
  const [outputs, setOutputs] = useState<DigitalOutputs>(defaultOutputs);
  const [analogOutputs, setAnalogOutputs] = useState<AnalogOutputs>(defaultAnalogOutputs);
  const [memory, setMemory] = useState<MemoryWords>(defaultMemory);
  const [productTankLevel, setProductTankLevel] = useState<number>(150.0);
  const [faultReason, setFaultReason] = useState<string | null>(null);
  const [simSpeed, setSimSpeed] = useState<number>(1);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [manualMode, setManualMode] = useState<boolean>(false);
  const [telemetry, setTelemetry] = useState<TelemetryPoint[]>([]);
  
  // Internal dosing tracking variables
  const [batchDosingStartA, setBatchDosingStartA] = useState<number>(0);
  const [batchDosingStartB, setBatchDosingStartB] = useState<number>(0);
  const [mixTimerSec, setMixTimerSec] = useState<number>(0);
  const [phTimerSec, setPhTimerSec] = useState<number>(0);
  const [scanTimeMs, setScanTimeMs] = useState<number>(20);

  const lastTimeRef = useRef<number>(performance.now());

  // Utility to handle user pulse buttons
  const pressStart = () => {
    setInputs((prev) => ({ ...prev, I_StartBatch_PB: true }));
    setTimeout(() => setInputs((prev) => ({ ...prev, I_StartBatch_PB: false })), 200);
  };

  const pressStop = () => {
    setInputs((prev) => ({ ...prev, I_StopBatch_PB: true }));
    setTimeout(() => setInputs((prev) => ({ ...prev, I_StopBatch_PB: false })), 200);
  };

  const pressReset = () => {
    setInputs((prev) => ({ ...prev, I_ResetFault_PB: true }));
    setTimeout(() => setInputs((prev) => ({ ...prev, I_ResetFault_PB: false })), 200);
  };

  const toggleEStop = () => {
    setInputs((prev) => ({ ...prev, I_EStop_NC: !prev.I_EStop_NC }));
  };

  const toggleAgitatorHealth = () => {
    setInputs((prev) => ({ ...prev, I_AgitatorHealth: !prev.I_AgitatorHealth }));
  };

  const updateRecipe = (key: keyof MemoryWords, value: number) => {
    setMemory((prev) => ({ ...prev, [key]: value }));
  };

  const refillRawTanks = () => {
    setAnalogInputs((prev) => ({ ...prev, AI_LT_TankA: 900.0, AI_LT_TankB: 700.0 }));
  };

  const emptyProductTank = () => {
    setProductTankLevel(0.0);
  };

  const togglePause = () => setIsPaused(!isPaused);
  const toggleManualMode = () => setManualMode(!manualMode);

  const setManualOutput = (key: keyof DigitalOutputs, value: boolean) => {
    if (manualMode) {
      setOutputs((prev) => ({ ...prev, [key]: value }));
    }
  };

  const setManualAnalogOutput = (key: keyof AnalogOutputs, value: number) => {
    if (manualMode) {
      setAnalogOutputs((prev) => ({ ...prev, [key]: value }));
    }
  };

  const simulateOverheat = () => {
    setAnalogInputs((prev) => ({ ...prev, AI_TT_Reactor: 95.5 }));
  };

  const simulatepHDisturbance = (direction: 'acid' | 'base') => {
    setAnalogInputs((prev) => ({
      ...prev,
      AI_pHT_Reactor: direction === 'acid' ? 4.8 : 9.2
    }));
  };

  // Soft-PLC Core Scan Loop (Simulated PLC Scan)
  useEffect(() => {
    if (isPaused) return;

    const intervalId = setInterval(() => {
      const now = performance.now();
      const dtMs = now - lastTimeRef.current;
      lastTimeRef.current = now;
      setScanTimeMs(Math.min(50, Math.max(10, Math.round(dtMs))));

      const dt = (dtMs / 1000.0) * simSpeed;

      setAnalogInputs((prevAI) => {
        setAnalogOutputs((prevAO) => {
          setOutputs((prevQ) => {
            setMemory((prevM) => {
              setInputs((prevI) => {
                let currentAI = { ...prevAI };
                let currentAO = { ...prevAO };
                let currentQ = { ...prevQ };
                let currentM = { ...prevM };
                let currentI = { ...prevI };
                let currentFault = faultReason;
                let pTank = productTankLevel;

                // 1. PHYSICAL DYNAMICS SIMULATION
                // Tank A -> Reactor Flow
                if (currentQ.Q_PumpA_Run && currentAO.AQ_V1_RatioA > 0) {
                  const flowRate = (currentAO.AQ_V1_RatioA / 100.0) * 45.0 * dt; // Max 45 L/s
                  const actualFlow = Math.min(flowRate, currentAI.AI_LT_TankA);
                  currentAI.AI_LT_TankA -= actualFlow;
                  currentAI.AI_LT_Reactor += actualFlow;
                }

                // Tank B -> Reactor Flow
                if (currentQ.Q_PumpB_Run && currentAO.AQ_V2_RatioB > 0) {
                  const flowRate = (currentAO.AQ_V2_RatioB / 100.0) * 45.0 * dt;
                  const actualFlow = Math.min(flowRate, currentAI.AI_LT_TankB);
                  currentAI.AI_LT_TankB -= actualFlow;
                  currentAI.AI_LT_Reactor += actualFlow;
                }

                // Temperature Dynamics
                if (currentQ.Q_HeaterJacket_On) {
                  currentAI.AI_TT_Reactor += 3.5 * dt; // Heats up by 3.5 °C/s
                } else {
                  // Natural ambient cooling
                  if (currentAI.AI_TT_Reactor > 22.5) {
                    currentAI.AI_TT_Reactor -= 0.3 * dt;
                  }
                }

                // pH Dosing Dynamics
                if (currentQ.Q_PumpAcid_Dose) {
                  currentAI.AI_pHT_Reactor = Math.max(0.0, currentAI.AI_pHT_Reactor - 0.45 * dt);
                }
                if (currentQ.Q_PumpBase_Dose) {
                  currentAI.AI_pHT_Reactor = Math.min(14.0, currentAI.AI_pHT_Reactor + 0.45 * dt);
                }

                // Draining Flow
                if (currentQ.Q_Valve_ProductDrain) {
                  const flowRate = 50.0 * dt;
                  const actualDrain = Math.min(flowRate, currentAI.AI_LT_Reactor);
                  currentAI.AI_LT_Reactor -= actualDrain;
                  pTank += actualDrain;
                }

                // High Level Float Guard Inputs Evaluated
                currentI.I_LSH_TankA = currentAI.AI_LT_TankA >= 980.0;
                currentI.I_LSH_TankB = currentAI.AI_LT_TankB >= 980.0;
                currentI.I_LSH_Reactor = currentAI.AI_LT_Reactor >= 1950.0;

                // 2. SAFETY INTERLOCK (FB_SafetyInterlock)
                let tripTriggered = false;
                if (!currentI.I_EStop_NC) {
                  tripTriggered = true;
                  currentFault = 'EMERGENCY STOP TRIPPED (%I0.0)';
                } else if (!currentI.I_AgitatorHealth) {
                  tripTriggered = true;
                  currentFault = 'MIXER MOTOR OVERLOAD RELAY FAULT (%I0.7)';
                } else if (currentI.I_LSH_Reactor) {
                  tripTriggered = true;
                  currentFault = 'HIGH LEVEL OVERFLOW DETECTED: REACTOR (%I0.6)';
                } else if (currentAI.AI_TT_Reactor > 90.0) {
                  tripTriggered = true;
                  currentFault = 'THERMAL RUNAWAY HIGH TEMP INTERLOCK (>90.0°C)';
                }

                if (tripTriggered) {
                  currentM.M_BatchState = BatchState.FAULT;
                  currentQ = {
                    ...currentQ,
                    Q_PumpA_Run: false,
                    Q_PumpB_Run: false,
                    Q_Agitator_Run: false,
                    Q_HeaterJacket_On: false,
                    Q_PumpAcid_Dose: false,
                    Q_PumpBase_Dose: false,
                    Q_Valve_ProductDrain: false,
                    Q_AlarmBeacon: true,
                  };
                  currentAO.AQ_V1_RatioA = 0.0;
                  currentAO.AQ_V2_RatioB = 0.0;
                }

                // Fault Reset logic
                if (currentM.M_BatchState === BatchState.FAULT) {
                  if (currentI.I_ResetFault_PB && currentI.I_EStop_NC && currentI.I_AgitatorHealth && currentAI.AI_TT_Reactor <= 85.0) {
                    currentM.M_BatchState = BatchState.IDLE;
                    currentQ.Q_AlarmBeacon = false;
                    currentFault = null;
                  }
                }

                // 3. BATCH STATE MACHINE LOOP (IF NOT MANUAL MODE)
                if (!manualMode && currentM.M_BatchState !== BatchState.FAULT) {
                  switch (currentM.M_BatchState) {
                    case BatchState.IDLE:
                      currentQ.Q_PumpA_Run = false;
                      currentQ.Q_PumpB_Run = false;
                      currentQ.Q_Agitator_Run = false;
                      currentQ.Q_HeaterJacket_On = false;
                      currentQ.Q_PumpAcid_Dose = false;
                      currentQ.Q_PumpBase_Dose = false;
                      currentQ.Q_Valve_ProductDrain = false;
                      currentAO.AQ_V1_RatioA = 0.0;
                      currentAO.AQ_V2_RatioB = 0.0;

                      if (currentI.I_StartBatch_PB) {
                        // Start batch dosing A
                        setBatchDosingStartA(currentAI.AI_LT_Reactor);
                        currentM.M_BatchState = BatchState.DOSING_A;
                      }
                      break;

                    case BatchState.DOSING_A:
                      {
                        const addedA = currentAI.AI_LT_Reactor - batchDosingStartA;
                        if (addedA < currentM.M_RecipeRatioA) {
                          // Raw Tank A check
                          if (currentAI.AI_LT_TankA <= 5.0) {
                            currentM.M_BatchState = BatchState.FAULT;
                            currentFault = 'RAW TANK A DEPLETED';
                            currentQ.Q_AlarmBeacon = true;
                          } else {
                            currentQ.Q_PumpA_Run = true;
                            // Modulate proportional valve for smooth ramp down
                            const remaining = currentM.M_RecipeRatioA - addedA;
                            currentAO.AQ_V1_RatioA = remaining < 50.0 ? Math.max(20.0, (remaining / 50.0) * 100.0) : 100.0;
                          }
                        } else {
                          currentQ.Q_PumpA_Run = false;
                          currentAO.AQ_V1_RatioA = 0.0;
                          setBatchDosingStartB(currentAI.AI_LT_Reactor);
                          currentM.M_BatchState = BatchState.DOSING_B;
                        }
                      }
                      break;

                    case BatchState.DOSING_B:
                      {
                        const addedB = currentAI.AI_LT_Reactor - batchDosingStartB;
                        if (addedB < currentM.M_RecipeRatioB) {
                          if (currentAI.AI_LT_TankB <= 5.0) {
                            currentM.M_BatchState = BatchState.FAULT;
                            currentFault = 'RAW TANK B DEPLETED';
                            currentQ.Q_AlarmBeacon = true;
                          } else {
                            currentQ.Q_PumpB_Run = true;
                            const remaining = currentM.M_RecipeRatioB - addedB;
                            currentAO.AQ_V2_RatioB = remaining < 50.0 ? Math.max(20.0, (remaining / 50.0) * 100.0) : 100.0;
                          }
                        } else {
                          currentQ.Q_PumpB_Run = false;
                          currentAO.AQ_V2_RatioB = 0.0;
                          setMixTimerSec(0);
                          currentM.M_BatchState = BatchState.HEATING_MIXING;
                        }
                      }
                      break;

                    case BatchState.HEATING_MIXING:
                      {
                        // Agitator runs to ensure uniform heating without scorching
                        currentQ.Q_Agitator_Run = true;
                        
                        if (currentAI.AI_TT_Reactor < currentM.M_TargetTemp) {
                          currentQ.Q_HeaterJacket_On = true;
                        } else {
                          currentQ.Q_HeaterJacket_On = false;
                          // Hold mix for 3 seconds once target temperature reached
                          setMixTimerSec((t) => {
                            const nextT = t + dt;
                            if (nextT >= 3.0) {
                              setPhTimerSec(0);
                              currentM.M_BatchState = BatchState.PH_BALANCING;
                            }
                            return nextT;
                          });
                        }
                      }
                      break;

                    case BatchState.PH_BALANCING:
                      {
                        currentQ.Q_Agitator_Run = true;
                        currentQ.Q_HeaterJacket_On = false;

                        const pH = currentAI.AI_pHT_Reactor;
                        const target = currentM.M_TargetpH;

                        if (pH > target + 0.15) {
                          currentQ.Q_PumpAcid_Dose = true;
                          currentQ.Q_PumpBase_Dose = false;
                        } else if (pH < target - 0.15) {
                          currentQ.Q_PumpBase_Dose = true;
                          currentQ.Q_PumpAcid_Dose = false;
                        } else {
                          currentQ.Q_PumpAcid_Dose = false;
                          currentQ.Q_PumpBase_Dose = false;
                          setPhTimerSec((t) => {
                            const nextT = t + dt;
                            if (nextT >= 3.0) {
                              currentM.M_BatchState = BatchState.DRAINING;
                            }
                            return nextT;
                          });
                        }
                      }
                      break;

                    case BatchState.DRAINING:
                      {
                        currentQ.Q_Agitator_Run = false;
                        currentQ.Q_PumpAcid_Dose = false;
                        currentQ.Q_PumpBase_Dose = false;
                        currentQ.Q_Valve_ProductDrain = true;

                        if (currentAI.AI_LT_Reactor <= 2.0) {
                          currentQ.Q_Valve_ProductDrain = false;
                          currentM.M_BatchState = BatchState.IDLE;
                        }
                      }
                      break;
                  }
                }

                // Pause / Stop PB intervention
                if (currentI.I_StopBatch_PB && currentM.M_BatchState !== BatchState.IDLE && currentM.M_BatchState !== BatchState.FAULT) {
                  currentM.M_BatchState = BatchState.IDLE;
                  currentQ = {
                    ...currentQ,
                    Q_PumpA_Run: false,
                    Q_PumpB_Run: false,
                    Q_Agitator_Run: false,
                    Q_HeaterJacket_On: false,
                    Q_PumpAcid_Dose: false,
                    Q_PumpBase_Dose: false,
                    Q_Valve_ProductDrain: false,
                  };
                }

                setFaultReason(currentFault);
                setProductTankLevel(pTank);

                // Save telemetry point every ~500ms
                const timeStr = new Date().toLocaleTimeString();
                setTelemetry((prevTel) => {
                  const last = prevTel[prevTel.length - 1];
                  if (!last || prevTel.length < 30) {
                    return [
                      ...prevTel,
                      {
                        timestamp: timeStr,
                        reactorLevel: Math.round(currentAI.AI_LT_Reactor),
                        reactorTemp: Number(currentAI.AI_TT_Reactor.toFixed(1)),
                        reactorpH: Number(currentAI.AI_pHT_Reactor.toFixed(2)),
                        tankALevel: Math.round(currentAI.AI_LT_TankA),
                        tankBLevel: Math.round(currentAI.AI_LT_TankB),
                        productLevel: Math.round(pTank),
                        state: currentM.M_BatchState,
                      }
                    ].slice(-40);
                  }
                  return prevTel;
                });

                return currentI;
              });
              return currentM;
            });
            return currentQ;
          });
          return currentAO;
        });
        return currentAI;
      });
    }, 50);

    return () => clearInterval(intervalId);
  }, [isPaused, simSpeed, manualMode, faultReason, productTankLevel, batchDosingStartA, batchDosingStartB]);

  // Calculate overall batch progress 0 - 100%
  let batchProgress = 0;
  const totalRecipeVol = memory.M_RecipeRatioA + memory.M_RecipeRatioB;
  if (memory.M_BatchState === BatchState.DOSING_A) {
    const currentAdded = Math.max(0, analogInputs.AI_LT_Reactor - batchDosingStartA);
    batchProgress = Math.min(30, (currentAdded / totalRecipeVol) * 100);
  } else if (memory.M_BatchState === BatchState.DOSING_B) {
    const currentAdded = Math.max(0, analogInputs.AI_LT_Reactor - batchDosingStartB);
    batchProgress = Math.min(60, 30 + (currentAdded / totalRecipeVol) * 100);
  } else if (memory.M_BatchState === BatchState.HEATING_MIXING) {
    const tempRatio = Math.min(1, analogInputs.AI_TT_Reactor / memory.M_TargetTemp);
    batchProgress = Math.min(80, 60 + tempRatio * 20);
  } else if (memory.M_BatchState === BatchState.PH_BALANCING) {
    const phDiff = Math.abs(analogInputs.AI_pHT_Reactor - memory.M_TargetpH);
    const phDone = Math.max(0, 1 - phDiff / 3.0);
    batchProgress = Math.min(95, 80 + phDone * 15);
  } else if (memory.M_BatchState === BatchState.DRAINING) {
    const drainRatio = 1 - (analogInputs.AI_LT_Reactor / Math.max(1, totalRecipeVol));
    batchProgress = Math.min(100, 95 + drainRatio * 5);
  } else if (memory.M_BatchState === BatchState.IDLE) {
    batchProgress = 0;
  }

  return (
    <PLCContext.Provider
      value={{
        inputs,
        analogInputs,
        outputs,
        analogOutputs,
        memory,
        productTankLevel,
        faultReason,
        scanTimeMs,
        simSpeed,
        isPaused,
        manualMode,
        telemetry,
        batchProgress,
        batchDosingStartA,
        batchDosingStartB,
        mixTimerSec,
        phTimerSec,
        setSimSpeed,
        togglePause,
        toggleManualMode,
        pressStart,
        pressStop,
        pressReset,
        toggleEStop,
        toggleAgitatorHealth,
        updateRecipe,
        refillRawTanks,
        emptyProductTank,
        setManualOutput,
        setManualAnalogOutput,
        simulateOverheat,
        simulatepHDisturbance
      }}
    >
      {children}
    </PLCContext.Provider>
  );
};

export const usePLC = () => {
  const context = useContext(PLCContext);
  if (!context) throw new Error('usePLC must be used within a PLCProvider');
  return context;
};
