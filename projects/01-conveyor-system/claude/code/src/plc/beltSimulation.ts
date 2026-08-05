import { BELT_END_POSITION, BELT_SENSOR_POSITION, type Part } from './types'

/** Time in ms for a part to travel the full 0-100 belt at 100% VFD speed. */
export const BELT_TRAVEL_MS_AT_FULL_SPEED = 9000

/** Advance every part's position along the belt based on the current ramped speed. */
export function advanceParts(parts: Part[], speedPercent: number, dtMs: number): Part[] {
  if (speedPercent <= 0 || parts.length === 0) {
    return parts
  }
  const distance = (speedPercent / 100) * (100 / BELT_TRAVEL_MS_AT_FULL_SPEED) * dtMs
  return parts.map((part) => ({ ...part, position: part.position + distance }))
}

export interface SensorSnapshot {
  detected: boolean
  color: Part['color']
  weight: number
}

/**
 * Find the next un-evaluated part that has just reached the photoeye/color/
 * weight sensor station. Sensor_PartDetect pulses TRUE for the single scan
 * the part crosses the station, mirroring a real photoelectric proximity
 * sensor's rising edge as seen by the R_TRIG in conveyorLogic.st.
 */
export function findSensorCrossing(parts: Part[]): Part | null {
  return parts.find((part) => !part.evaluated && part.position >= BELT_SENSOR_POSITION) ?? null
}

/** Drop parts that have travelled past the discharge end of the belt. */
export function dischargeCompletedParts(parts: Part[]): { remaining: Part[]; discharged: Part[] } {
  const remaining: Part[] = []
  const discharged: Part[] = []
  for (const part of parts) {
    if (part.position >= BELT_END_POSITION) {
      discharged.push(part)
    } else {
      remaining.push(part)
    }
  }
  return { remaining, discharged }
}
