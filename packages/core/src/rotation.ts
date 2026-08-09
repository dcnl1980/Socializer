import type { SeatCandidate } from "./types.js";

/** Pick the healthiest least-used seat from a pool (multi-seat rotation). */
export function pickSeat(seats: SeatCandidate[]): SeatCandidate | null {
  const ready = seats.filter((s) => !s.killSwitch && s.status === "healthy");
  if (ready.length === 0) return null;
  return [...ready].sort((a, b) => a.actionsUsedToday - b.actionsUsedToday)[0]!;
}
