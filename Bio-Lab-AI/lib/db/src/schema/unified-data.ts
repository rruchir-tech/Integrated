/**
 * UnifiedExperimentData — canonical JSON schema for all instrument parsers.
 *
 * Every parser (Synergy H1, SpectraMax, qPCR, NanoDrop, flow cytometry, etc.)
 * MUST output one of these types. The result is stored as `raw_data_json` (TEXT)
 * in the `experiments` table, then read by the AI analysis layer and all UI components.
 *
 * Discriminant: `_type` field on each variant.
 *
 * Adding a new instrument:
 *   1. Define a new interface extending BaseInstrumentData with a unique `_type` string
 *   2. Add it to the UnifiedExperimentData union at the bottom
 *   3. Export any sub-types the UI or AI layer needs
 */

// ─────────────────────────────────────────────────────────────
//  Shared / base
// ─────────────────────────────────────────────────────────────

export type InstrumentCategory =
  | "plate_reader"
  | "qpcr"
  | "spectrophotometer"
  | "cell_counter"
  | "flow_cytometry"
  | "western_blot"
  | "sequencing"
  | "microscopy"
  | "generic";

export interface BaseInstrumentData {
  /** Discriminant — uniquely identifies the parser/shape. */
  _type: string;
  /** Human-readable instrument name, e.g. "Synergy H1", "QuantStudio 7". */
  instrument: string;
  instrument_category: InstrumentCategory;
  /** ISO 8601 timestamp when the file was parsed. */
  parsed_at: string;
  /** Original uploaded file name. */
  file_name: string;
  /** Date the experiment was run (ISO date string or free text from the file). */
  experiment_date?: string;
  /** Protocol name as recorded by the instrument software. */
  protocol_name?: string;
  /** Operator name as recorded in the file. */
  operator?: string;
  /** Any free-form notes extracted from the file. */
  notes?: string;
}

// ─────────────────────────────────────────────────────────────
//  Plate reader (96-well / 384-well)
//  Instruments: Synergy H1 (Gen5), SpectraMax M-series (SoftMax Pro),
//               CLARIOstar, EnVision, Infinite 200 PRO
// ─────────────────────────────────────────────────────────────

export type WellStatus = "ok" | "blank" | "high" | "low" | "invalid";
export type MeasurementType = "absorbance" | "fluorescence_intensity" | "luminescence" | "time_resolved_fluorescence" | "fluorescence_polarization";

export interface WellData {
  row: number;       // 0-indexed (0 = A)
  col: number;       // 0-indexed (0 = 1)
  well_label: string; // e.g. "A1"
  value: number | null;
  status: WellStatus;
  /** Optional replicate group or sample identifier. */
  sample_id?: string;
}

export interface PlateStats {
  mean: number;
  sd: number;
  cv_pct: number;
  min: number;
  max: number;
  n: number; // number of non-blank wells included
}

export interface StandardCurvePoint {
  concentration: number;
  concentration_unit: string;
  mean_value: number;
  sd?: number;
}

export interface StandardCurve {
  points: StandardCurvePoint[];
  /** R² of the fitted curve. */
  r_squared?: number;
  /** "linear" | "4pl" | "5pl" */
  fit_type?: string;
  /** Fitted parameters for 4PL: [bottom, top, ec50, hill_slope] */
  fit_params?: number[];
}

export interface IC50Result {
  ic50_value: number;
  ic50_unit: string;
  /** 95% CI lower bound. */
  ci_lower?: number;
  /** 95% CI upper bound. */
  ci_upper?: number;
  r_squared?: number;
  curve_fit_params?: number[]; // [bottom, top, ec50, hill_slope]
}

export interface ZFactorResult {
  /** Z-factor for QC of the overall plate. */
  z_factor: number;
  /** Z'-factor (signal window without test compounds). */
  z_prime?: number;
  signal_to_background?: number;
  positive_control_mean?: number;
  negative_control_mean?: number;
}

export interface Plate96Data extends BaseInstrumentData {
  _type: "plate96";
  plate_id?: string;
  /** Primary read wavelength (nm). */
  wavelength?: number;
  /** Reference wavelength for dual-wavelength reads (nm). */
  reference_wavelength?: number;
  measurement_type: MeasurementType;
  /** Row-major 8×12 grid of wells (rows 0-7 = A-H, cols 0-11 = 1-12). */
  wells: WellData[][];
  stats: PlateStats;
  standard_curve?: StandardCurve;
  ic50?: IC50Result;
  z_factor?: ZFactorResult;
}

export interface Plate384Data extends BaseInstrumentData {
  _type: "plate384";
  plate_id?: string;
  wavelength?: number;
  reference_wavelength?: number;
  measurement_type: MeasurementType;
  /** Row-major 16×24 grid of wells. */
  wells: WellData[][];
  stats: PlateStats;
  standard_curve?: StandardCurve;
  ic50?: IC50Result;
  z_factor?: ZFactorResult;
}

// ─────────────────────────────────────────────────────────────
//  qPCR
//  Instruments: Bio-Rad CFX96 / CFX384, Applied Biosystems QuantStudio,
//               Roche LightCycler, Stratagene Mx3005P
// ─────────────────────────────────────────────────────────────

export interface QpcrWell {
  well_label: string;
  sample_name: string;
  target_name: string;
  task: "UNKNOWN" | "STANDARD" | "NTC" | "POSITIVE_CONTROL";
  ct: number | null; // Cq / Ct value
  ct_mean?: number;
  ct_sd?: number;
  efficiency?: number; // amplification efficiency 0-1
  rn?: number[]; // normalized fluorescence per cycle
  quantity?: number; // for standard curve wells
}

export interface QpcrTarget {
  name: string;
  is_reference: boolean;
}

export interface QpcrSample {
  name: string;
  targets: {
    target_name: string;
    ct_mean: number | null;
    ct_sd: number | null;
    /** ΔCt = target Ct − reference Ct */
    delta_ct?: number;
    /** ΔΔCt = sample ΔCt − control ΔCt */
    delta_delta_ct?: number;
    /** 2^(-ΔΔCt) fold change */
    fold_change?: number;
    fold_change_upper?: number; // +SD
    fold_change_lower?: number; // -SD
    regulated: "up" | "down" | "unchanged" | null;
  }[];
}

export interface QpcrData extends BaseInstrumentData {
  _type: "qpcr";
  /** Software used: "CFX Maestro", "QuantStudio Design & Analysis", etc. */
  software?: string;
  reference_gene?: string;
  control_sample?: string;
  targets: QpcrTarget[];
  samples: QpcrSample[];
  wells: QpcrWell[];
  /** Per-cycle amplification curves; key = well label. */
  amplification_curves?: Record<string, number[]>;
}

// ─────────────────────────────────────────────────────────────
//  Spectrophotometer / nucleic acid quantification
//  Instruments: NanoDrop One/Lite, DeNovix DS-11, Implen NanoPhotometer
// ─────────────────────────────────────────────────────────────

export type NucleicAcidType = "DNA" | "RNA" | "ssDNA" | "RNA_microRNA";
export type ProteinAssayType = "BCA" | "Bradford" | "A280";

export interface SpectrophotometerSample {
  sample_id: string;
  sample_name?: string;
  /** ng/μL or mg/mL */
  concentration: number | null;
  concentration_unit: string;
  a260?: number;
  a280?: number;
  a230?: number;
  /** Purity ratio — ideally ~1.8 for DNA, ~2.0 for RNA. */
  a260_a280?: number;
  /** Secondary purity ratio — ideally >2.0 for RNA. */
  a260_a230?: number;
  nucleic_acid_type?: NucleicAcidType;
  protein_assay_type?: ProteinAssayType;
  /** Full absorbance spectrum: wavelength (nm) → absorbance. */
  spectrum?: Record<number, number>;
  quality: "good" | "acceptable" | "poor" | "unknown";
  quality_flags?: string[]; // e.g. ["low A260/A280 ratio"]
}

export interface SpectrophotometerData extends BaseInstrumentData {
  _type: "spectrophotometer";
  measurement_type: "nucleic_acid" | "protein" | "spectrum";
  samples: SpectrophotometerSample[];
}

// ─────────────────────────────────────────────────────────────
//  Cell counter / viability
//  Instruments: Thermo Countess 3, Bio-Rad TC20, Beckman Vi-CELL
// ─────────────────────────────────────────────────────────────

export interface CellCounterSample {
  sample_id: string;
  sample_name?: string;
  /** Total cells/mL. */
  total_cells_per_ml: number | null;
  /** Live cells/mL (Trypan Blue exclusion). */
  live_cells_per_ml?: number | null;
  /** Dead cells/mL. */
  dead_cells_per_ml?: number | null;
  viability_pct: number | null;
  /** Total cells in the counted volume (before dilution factor). */
  total_count?: number;
  dilution_factor?: number;
  mean_diameter_um?: number;
  notes?: string;
}

export interface CellCounterData extends BaseInstrumentData {
  _type: "cell_counter";
  samples: CellCounterSample[];
  dye?: "trypan_blue" | "AO_PI" | "none";
}

// ─────────────────────────────────────────────────────────────
//  Flow cytometry
//  Instruments: BD FACSCanto/LSRFortessa, Beckman CytoFLEX,
//               Sony ID7000, Agilent NovoCyte
// ─────────────────────────────────────────────────────────────

export interface FlowGate {
  name: string;
  parent?: string;
  percent_of_parent?: number;
  count?: number;
  mean_fluorescence?: Record<string, number>; // channel → MFI
}

export interface FlowSample {
  sample_id: string;
  sample_name?: string;
  total_events: number;
  parameters: string[]; // e.g. ["FSC-A","SSC-A","FITC-A","PE-A"]
  gates: FlowGate[];
  /** Median fluorescence intensity per channel for the entire population. */
  mfi?: Record<string, number>;
}

export interface FlowCytometryData extends BaseInstrumentData {
  _type: "flow_cytometry";
  /** FCS file format version: "3.0" | "3.1" */
  fcs_version?: string;
  cytometer_model?: string;
  samples: FlowSample[];
  panel?: { channel: string; marker: string }[];
}

// ─────────────────────────────────────────────────────────────
//  Western blot
//  Instruments: Bio-Rad ChemiDoc, LI-COR Odyssey, GE ImageQuant
// ─────────────────────────────────────────────────────────────

export interface WesternBlotBand {
  lane: number;
  target: string;
  /** Normalized band intensity (arbitrary units). */
  intensity: number;
  /** Relative intensity vs. loading control. */
  normalized_intensity?: number;
  /** Molecular weight estimate (kDa). */
  mw_kda?: number;
  sample_name?: string;
}

export interface WesternBlotData extends BaseInstrumentData {
  _type: "western_blot";
  targets: string[];
  loading_control?: string;
  bands: WesternBlotBand[];
  /** URL or base64 data URI of the blot image. */
  image_url?: string;
  /** Whether band intensities were determined by AI vision analysis. */
  ai_quantified?: boolean;
}

// ─────────────────────────────────────────────────────────────
//  Generic table — catch-all for unknown instruments/CSV files
// ─────────────────────────────────────────────────────────────

export interface GenericTableData extends BaseInstrumentData {
  _type: "generic_table";
  columns: string[];
  rows: Record<string, string | number | null>[];
  /** Detected numeric columns — candidates for quantification. */
  numeric_columns?: string[];
}

// ─────────────────────────────────────────────────────────────
//  Master union — this is what `raw_data_json` holds
// ─────────────────────────────────────────────────────────────

export type UnifiedExperimentData =
  | Plate96Data
  | Plate384Data
  | QpcrData
  | SpectrophotometerData
  | CellCounterData
  | FlowCytometryData
  | WesternBlotData
  | GenericTableData;

/** Type guard: check if parsed raw_data_json is a known instrument type. */
export function isUnifiedExperimentData(val: unknown): val is UnifiedExperimentData {
  if (!val || typeof val !== "object") return false;
  const knownTypes = new Set([
    "plate96", "plate384", "qpcr", "spectrophotometer",
    "cell_counter", "flow_cytometry", "western_blot", "generic_table",
  ]);
  return knownTypes.has((val as { _type?: string })._type ?? "");
}

/** Parse raw_data_json string from DB into UnifiedExperimentData (or null). */
export function parseRawData(json: string | null | undefined): UnifiedExperimentData | null {
  if (!json) return null;
  try {
    const parsed = JSON.parse(json);
    return isUnifiedExperimentData(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
