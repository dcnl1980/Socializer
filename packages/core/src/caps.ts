export function pickDailyCap(
  min: number,
  max: number,
  rng: () => number = Math.random,
): number {
  if (max < min) throw new Error("max must be >= min");
  const span = max - min;
  return min + Math.floor(rng() * (span + 1));
}

export function canSpend(used: number, cap: number, cost = 1): boolean {
  return used + cost <= cap;
}

export type CapBudget = {
  outboundPercent: number;
  contentPercent: number;
};

export function splitBudget(
  total: number,
  budget: CapBudget = { outboundPercent: 60, contentPercent: 40 },
): { outbound: number; content: number } {
  const outbound = Math.floor((total * budget.outboundPercent) / 100);
  return { outbound, content: total - outbound };
}
