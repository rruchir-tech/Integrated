// Domain knowledge for the most common plate-reader assays. The analyzer injects
// the matching guide so the AI knows WHAT is being measured, the CORRECT
// quantification, the expected controls, pass criteria, and common failure modes —
// i.e. so it reasons like a bench scientist instead of describing numbers generically.

export interface AssayGuide {
  key: string;
  label: string;
  /** keywords matched (case-insensitive) against assay type + notes + read type */
  matches: string[];
  measures: string;
  quantification: string;
  controls: string;
  passCriteria: string;
  failureModes: string;
}

export const ASSAY_GUIDES: AssayGuide[] = [
  {
    key: "viability",
    label: "Cell viability / cytotoxicity (MTT, MTS, XTT, CCK-8, resazurin/AlamarBlue, CellTiter-Glo)",
    matches: ["mtt", "mts", "xtt", "cck-8", "cck8", "resazurin", "alamar", "celltiter", "ctg", "viability", "cytotox", "proliferation"],
    measures: "Metabolic activity (formazan/ATP/resorufin signal) as a proxy for the number of live, metabolically active cells.",
    quantification:
      "Normalize each well to % viability = 100 × (sample − blank) / (untreated/vehicle control − blank). For a dose series, fit a 4-parameter logistic and report IC50/EC50 in the dose unit (state the assumed dose axis); flag if IC50 is outside the tested range. Report the % viability range across doses.",
    controls: "Untreated/vehicle = 100% viability; media-only blank = background; a positive kill control (e.g. staurosporine, Triton X-100, high-dose reference) = assay floor.",
    passCriteria: "Z' ≥ 0.5, replicate CV < 15%, a clear monotonic dose-response, vehicle control near 100%, kill control near 0%.",
    failureModes: "Edge-well evaporation inflating outer rows/columns; vehicle (DMSO) toxicity if >0.5–1%; flat dose-response (compound inactive OR dose range wrong); blank not subtracted; seeding-density variation.",
  },
  {
    key: "elisa",
    label: "ELISA / immunoassay (absorbance or fluorescence)",
    matches: ["elisa", "immunoassay", "sandwich", "antibody", "antigen", "450", "tmb"],
    measures: "Concentration of a specific analyte (protein/cytokine/antibody) via an enzyme- or fluor-linked antibody signal.",
    quantification:
      "Fit the standard curve (4PL/5PL for sigmoidal, linear only in the linear range), report R², then interpolate unknowns and back-calculate concentration × dilution factor. Report values in the standard's unit (e.g. pg/mL).",
    controls: "Standard dilution series; blank/zero standard; non-specific binding (NSB); optional high/low QC samples.",
    passCriteria: "Standard-curve R² > 0.98, QC recovery 80–120%, low NSB, unknowns falling within the standard range (not extrapolated).",
    failureModes: "Signal above the top standard (needs further dilution); high background (insufficient washing); hook effect at very high analyte; edge effects; saturated absorbance (>~3.0 OD).",
  },
  {
    key: "protein",
    label: "Protein quantification (Bradford, BCA, Lowry)",
    matches: ["bradford", "bca", "lowry", "protein assay", "protein quant", "total protein"],
    measures: "Total protein concentration via a colorimetric reaction proportional to protein amount.",
    quantification: "Fit a BSA standard curve (linear or quadratic in range), report R², interpolate samples, multiply by dilution. Report mg/mL or µg/µL.",
    controls: "BSA standard series; buffer blank.",
    passCriteria: "R² > 0.99, samples within the standard range, replicate CV < 10%.",
    failureModes: "Samples above the linear range (dilute and re-read); detergent/reducing-agent interference (Bradford vs BCA choice); uneven incubation time across the plate.",
  },
  {
    key: "reporter",
    label: "Reporter / luciferase / fluorescent-reporter assay",
    matches: ["luciferase", "luc", "reporter", "gfp", "renilla", "dual-luc", "luminescence reporter", "promoter"],
    measures: "Transcriptional/pathway activity via reporter enzyme or fluorophore output.",
    quantification: "Report fold-change vs the relevant control; for dual-luciferase, normalize firefly to Renilla (internal control) before computing fold-change. State the reference condition.",
    controls: "Untreated/vehicle baseline; positive inducer; for dual-luc an internal normalization reporter.",
    passCriteria: "Robust window over baseline (fold-change clearly > 1 with low CV), internal control stable across wells.",
    failureModes: "Transfection-efficiency variation (why dual-luc normalization matters); signal decay over read time; well-to-well crosstalk for luminescence.",
  },
  {
    key: "apoptosis",
    label: "Apoptosis / enzyme-activity (caspase-Glo, etc.)",
    matches: ["apopto", "caspase", "caspase-3", "caspase-glo", "annexin"],
    measures: "Enzyme (e.g. caspase-3/7) activity as a marker of apoptosis.",
    quantification: "Report fold-change in activity vs untreated; pair with a viability readout to distinguish apoptosis from total cell loss.",
    controls: "Untreated baseline; a known apoptosis inducer (e.g. staurosporine) as positive control.",
    passCriteria: "Clear induction over baseline in the positive control; consistent replicates.",
    failureModes: "Confounding by total cell number (normalize to viability); signal plateau if substrate-limited.",
  },
];

const GENERIC_PLATE_GUIDE: AssayGuide = {
  key: "generic",
  label: "Plate-reader assay (general)",
  matches: [],
  measures: "An optical signal (absorbance / fluorescence / luminescence) per well, proportional to the assay's analyte or cellular readout.",
  quantification:
    "Identify the readout from the protocol, then apply the standard method: normalize to controls, fit a standard or dose-response curve where applicable, and report the key quantity (concentration, % effect, IC50/EC50, or fold-change) with units.",
  controls: "Positive control, negative/vehicle control, and a media/buffer blank.",
  passCriteria: "Z' ≥ 0.5 when controls exist, replicate CV < 20%, no strong edge effects, controls behaving as expected.",
  failureModes: "Edge effects (evaporation), high CV (pipetting), saturated or floored signal, missing blank subtraction.",
};

/** Pick the most relevant assay guide from free text (assay type + notes + read type). */
export function matchAssayGuide(text: string): AssayGuide {
  const hay = (text || "").toLowerCase();
  for (const g of ASSAY_GUIDES) {
    if (g.matches.some((m) => hay.includes(m))) return g;
  }
  return GENERIC_PLATE_GUIDE;
}

/** Render the matched guide as a prompt block. */
export function assayGuidanceBlock(text: string): string {
  const g = matchAssayGuide(text);
  return [
    `ASSAY CONTEXT — this looks like: ${g.label}`,
    `• What it measures: ${g.measures}`,
    `• Correct quantification: ${g.quantification}`,
    `• Expected controls: ${g.controls}`,
    `• Pass criteria: ${g.passCriteria}`,
    `• Common failure modes to check: ${g.failureModes}`,
  ].join("\n");
}
