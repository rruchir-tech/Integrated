// Feature flags for the narrow plate-reader launch.
//
// The first launch is intentionally scoped to a single path: upload plate-reader
// data → quantify → troubleshoot. Everything below is built and working but out
// of scope for launch, so it is hidden from the UI (nav + routes) rather than
// deleted. Flip a flag to `true` to bring a feature back.
//
// An env override (VITE_ENABLE_ALL_FEATURES=true) turns everything back on,
// which is handy for internal demos without touching code.

const enableAll = import.meta.env.VITE_ENABLE_ALL_FEATURES === "true";

export const features = {
  // Compare and Tasks are also surfaced elsewhere (Compare inside Data Analysis,
  // Tasks on the Dashboard). These flags gate their old standalone routes/nav.
  // Projects remains a full top-level section.
  compare: enableAll,
  templates: enableAll,
  tasks: enableAll,
  // Design-first workflow: create an experiment from a goal → generate a protocol →
  // attach data later → quantify. On by design now (was off during the narrow launch).
  protocolDesigner: true,
  // Core plate-reader path — always on.
  dataAnalysis: true,
} as const;

export type FeatureName = keyof typeof features;

export function isEnabled(name: FeatureName): boolean {
  return features[name];
}
