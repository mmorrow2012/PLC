import { GATE_TRAVEL_MS_NOMINAL } from './types'

export const GATE_ANGLE_CLOSED = 0
export const GATE_ANGLE_OPEN = 90

const ANGLE_RATE_DEG_PER_MS = GATE_ANGLE_OPEN / GATE_TRAVEL_MS_NOMINAL

/**
 * Physical gate-arm model backing the simulated limit switches. This is
 * plant simulation, not control logic - Sensor_GateOpenLimit /
 * Sensor_GateClosedLimit are derived from `angle`, which advances toward
 * GATE_ANGLE_OPEN/GATE_ANGLE_CLOSED under Motor_GateUp/Motor_GateDown,
 * exactly as a real geared limit-switch arm would. `jammed` models a
 * mechanical/motor failure that holds the arm still despite an energized
 * motor output, purely so the watchdog timeout can be demonstrated from
 * the HMI without waiting out a real 8s window with a healthy gate.
 */
export function advanceGateAngle(
  angle: number,
  motorUp: boolean,
  motorDown: boolean,
  jammed: boolean,
  dtMs: number,
): number {
  if (jammed) {
    return angle
  }
  if (motorUp) {
    return Math.min(GATE_ANGLE_OPEN, angle + ANGLE_RATE_DEG_PER_MS * dtMs)
  }
  if (motorDown) {
    return Math.max(GATE_ANGLE_CLOSED, angle - ANGLE_RATE_DEG_PER_MS * dtMs)
  }
  return angle
}
