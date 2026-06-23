// Deterministic plate-quality metrics computed from user-designated control wells.
// Pure functions — no React, easy to reason about and test.

export type WellRole = "pos" | "neg" | "sample" | "blank";

export interface MetricWell {
  well: string;            // e.g. "A1"
  value: number | null;
  status?: string;         // "ok" | "blank" | ...
}

export const ROLE_LABEL: Record<WellRole, string> = {
  pos: "Positive control",
  neg: "Negative control",
  sample: "Sample",
  blank: "Blank",
};

export const ROLE_SHORT: Record<WellRole, string> = { pos: "+", neg: "−", sample: "S", blank: "B" };

// Distinct, professional role colors (used for the layout overlay).
export const ROLE_COLOR: Record<WellRole, string> = {
  pos: "#2563eb",    // blue  — positive control
  neg: "#64748b",    // slate — negative control
  sample: "#0d9488", // teal  — sample
  blank: "#a1a1aa",  // zinc  — blank
};

function mean(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

// Sample standard deviation (n-1).
function sd(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  const variance = xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1);
  return Math.sqrt(variance);
}

function valuesForRole(
  wells: MetricWell[],
  roles: Record<string, WellRole>,
  role: WellRole,
): number[] {
  return wells
    .filter((w) => roles[w.well] === role && w.value !== null && Number.isFinite(w.value))
    .map((w) => w.value as number);
}

export interface ControlMetrics {
  nPos: number;
  nNeg: number;
  meanPos: number | null;
  meanNeg: number | null;
  sdPos: number | null;
  sdNeg: number | null;
  /** Z'-factor: 1 - 3(σp+σn)/|μp-μn|. Needs >=2 pos and >=2 neg wells. */
  zPrime: number | null;
  /** Signal-to-background: |μp| / |μn| (>1). */
  signalToBackground: number | null;
}

export function computeControlMetrics(
  wells: MetricWell[],
  roles: Record<string, WellRole>,
): ControlMetrics {
  const pos = valuesForRole(wells, roles, "pos");
  const neg = valuesForRole(wells, roles, "neg");

  const meanPos = pos.length ? mean(pos) : null;
  const meanNeg = neg.length ? mean(neg) : null;
  const sdPos = pos.length >= 2 ? sd(pos) : null;
  const sdNeg = neg.length >= 2 ? sd(neg) : null;

  let zPrime: number | null = null;
  if (
    pos.length >= 2 && neg.length >= 2 &&
    meanPos !== null && meanNeg !== null &&
    sdPos !== null && sdNeg !== null
  ) {
    const sep = Math.abs(meanPos - meanNeg);
    zPrime = sep > 0 ? 1 - (3 * (sdPos + sdNeg)) / sep : null;
  }

  let signalToBackground: number | null = null;
  if (meanPos !== null && meanNeg !== null && meanNeg !== 0) {
    const r = Math.abs(meanPos) / Math.abs(meanNeg);
    signalToBackground = r >= 1 ? r : (r !== 0 ? 1 / r : null);
  }

  return {
    nPos: pos.length,
    nNeg: neg.length,
    meanPos,
    meanNeg,
    sdPos,
    sdNeg,
    zPrime,
    signalToBackground,
  };
}

// Normalize a raw value to "% of control": negative control = 0%, positive = 100%
// (sign-agnostic — works whether the assay signal goes up or down).
export function percentOfControl(
  value: number,
  meanPos: number | null,
  meanNeg: number | null,
): number | null {
  if (meanPos === null || meanNeg === null || meanPos === meanNeg) return null;
  return ((value - meanNeg) / (meanPos - meanNeg)) * 100;
}
