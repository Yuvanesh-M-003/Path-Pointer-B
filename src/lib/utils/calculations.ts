// Shared numeric helpers used by the scoring engines.

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function round(value: number, decimals = 2): number {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}

export function safeDivide(numerator: number, denominator: number): number {
  if (!denominator) return 0;
  return numerator / denominator;
}

export function percentage(part: number, whole: number): number {
  if (!whole) return 0;
  return round(clamp((part / whole) * 100, 0, 100), 2);
}

// Weighted difficulty points. Harder problems contribute more, but with caps
// applied by callers so a single Hard problem cannot dominate.
export const DIFFICULTY_POINTS = {
  Easy: 1,
  Medium: 2.5,
  Hard: 4,
} as const;

export type Difficulty = keyof typeof DIFFICULTY_POINTS;
