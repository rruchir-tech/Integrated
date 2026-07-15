# Data Quantification Protocol

> **Single source of truth** for how Lab Copilot's AI quantifies plate-reader data.
> The runtime version of this protocol lives in
> [`artifacts/api-server/src/lib/assayKnowledge.ts`](../artifacts/api-server/src/lib/assayKnowledge.ts)
> (`QUANTIFICATION_PROTOCOL` + per-assay guides) and is injected into every AI
> analysis and copilot chat. Keep this doc and that module in sync — this is the
> reference; that is what the model actually reads at request time.

The AI is not a curve-fitting engine — it interprets. It reasons about *which*
method applies, computes the assay-appropriate numbers, judges plate quality, and
explains what the result means. The deterministic fits the app itself performs
(4PL IC50 in `doseResponse.ts`, Z′/S:B in `plateMetrics.ts`) feed into that
reasoning as ground truth.

---

## The decision process (run on every plate)

1. **Identify the readout & intent** — from the protocol/notes, what is measured
   (absorbance / fluorescence / luminescence / OD / Ct) and what is the question
   (concentration? potency? rate? growth? relative expression?).
2. **Pick the quantification method** (table below).
3. **Compute assay QC** — Z′, S:B, S:N, %CV whenever controls exist.
4. **Check plate health** — edge effects, outliers, row/column gradients,
   saturated or floored signal.
5. **Report** — hard numbers with units and well IDs, assumptions stated,
   technical artifact vs. real biology distinguished, confidence given.

Never invent a standard curve, dose axis, or control set that isn't in the data.
If it's missing, say what's needed.

---

## 1. Standard curve / quantification (the #1 use)

Back-calculate unknown sample concentrations from a curve of known standards.
Used by BCA, Bradford, Lowry, ELISA, and any interpolation assay.

- **Fit:** linear within the linear range; otherwise **4PL/5PL** (sigmoidal
  immunoassays) or **quadratic** (protein assays). Report **R²**.
- **Interpolate unknowns only within the fitted range** — never extrapolate past
  the top/bottom standard.
- **Apply the dilution factor:** `concentration = interpolated × dilution`.
- **Report** in the standard's unit (pg/mL, µg/µL, …).

## 2. Dose-response / potency (drug screening)

Sigmoidal EC50/IC50 for comparing compound potency.

- **Fit** a 4PL to normalized response vs `log10(concentration)`:
  `Y = Bottom + (Top − Bottom) / (1 + (X/IC50)^HillSlope)`.
- **% inhibition** `= 100 × (1 − (sample − min)/(max − min))`.
- **Report** IC50 (inhibition) or EC50 (activation) with **units + 95% CI**, Hill
  slope, both plateaus, R². **Flag** if the curve doesn't reach both plateaus —
  the potency is then extrapolated and unreliable.
- Relative potency = ratio of EC50s across compounds.

## 3. Kinetics / enzyme assays

- **Initial velocity (V₀):** slope of the **linear early phase** of each kinetic
  trace, converted to concentration/time via an extinction coefficient or product
  standard. Do not read past the linear phase (substrate depletion).
- **Michaelis-Menten:** `V = Vmax·[S] / (Km + [S])` → **Km, Vmax**;
  `kcat = Vmax/[E]`. Prefer nonlinear regression.
- **Linearizations** (report if requested, but they distort error): Lineweaver-Burk
  (1/V vs 1/[S]), Eadie-Hofstee (V vs V/[S]), Hanes-Woolf ([S]/V vs [S]),
  Scatchard (binding).
- **Binding kinetics:** equilibrium saturation `Y = Bmax·X/(Kd + X)` → **Kd, Bmax**;
  or real-time **kon/koff** with `Kd = koff/kon`; competitive inhibition → Ki via
  Cheng-Prusoff `Ki = IC50 / (1 + [S]/Km)`.

## 4. Growth curves

OD600 vs time (bacteria/yeast) via turbidimetric reads.

- Subtract the media blank; identify the **exponential phase**.
- **Growth rate** `µ = ln(OD₂/OD₁)/(t₂ − t₁)`; **doubling time** `= ln(2)/µ`.
- **MIC** = lowest concentration with OD ≈ blank (no growth).
- OD600 is linear only up to ~1.0 — dilute or path-length correct above that.

## 5. Relative expression (qPCR)

`ΔCt = Ct(target) − Ct(ref)`; `ΔΔCt = ΔCt(sample) − ΔCt(calibrator)`;
**fold change = 2^(−ΔΔCt)**. Efficiency `= 10^(−1/slope) − 1` (use Pfaffl if ≠100%).

---

## Assay QC metrics (report alongside, always)

| Metric | Formula | Good |
|---|---|---|
| **Z′-factor** | `1 − 3(σp+σn)/|μp−μn|` | ≥0.5 excellent · 0–0.5 marginal · <0 fail |
| **Signal-to-background** | `μsignal / μblank` | assay-dependent, higher better |
| **Signal-to-noise** | `(μp−μn)/√(σp²+σn²)` | higher better |
| **%CV** | `100 × SD/mean` per replicate group | <10–15% |

## Visualization — spot problems before trusting numbers

- **Heatmap** of the plate → well-to-well variation, **edge effects**, gradients.
- **Scatter / box / violin** → distribution and outlier checking.
- Recommend a visualization whenever CV is high or a gradient is suspected.

---

## What scientists use today (for positioning, not implementation)

Commercial & bundled: **MARS** (BMG), **SoftMax Pro** (Molecular Devices),
**Gen5** (BioTek), KC4, **GraphPad Prism**. Free/code: **ggplate**, **Welly**,
**gcplyr**, **AMiGA**, **Wellmap** (R/Python). The gap Lab Copilot fills: these
require you to *know which analysis to run and how to read it* — the copilot
picks the method, computes it, and explains the result in one place.
