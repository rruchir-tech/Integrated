import { Router, type IRouter } from "express";
import { eq, desc, sql, like, and } from "drizzle-orm";
import { db, experiments, conversations, messages, experimentTemplates, recommendationActions, experimentComments, tasks } from "@workspace/db";
import {
  CreateExperimentBody,
  UpdateExperimentBody,
  ListExperimentsQueryParams,
  AnalyzeExperimentBody,
} from "@workspace/api-zod";
import { ai } from "@workspace/integrations-gemini-ai";
import * as XLSX from "xlsx";

const router: IRouter = Router();

router.get("/experiments", async (req, res) => {
  try {
    const query = ListExperimentsQueryParams.parse(req.query);
    const conditions = [];
    if (query.assay_type) conditions.push(eq(experiments.assay_type, query.assay_type));
    if (query.status) conditions.push(eq(experiments.status, query.status));
    if (query.search) conditions.push(like(experiments.name, `%${query.search}%`));

    const rows = await db
      .select({
        id: experiments.id,
        name: experiments.name,
        date: experiments.date,
        assay_type: experiments.assay_type,
        instrument: experiments.instrument,
        status: experiments.status,
        created_at: experiments.created_at,
      })
      .from(experiments)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(experiments.created_at));

    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "Failed to list experiments");
    res.status(500).json({ error: "Failed to list experiments" });
  }
});

router.get("/experiments/dashboard", async (_req, res) => {
  try {
    const total = await db.select({ count: sql<number>`count(*)` }).from(experiments);

    const byStatus = await db
      .select({ status: experiments.status, count: sql<number>`count(*)` })
      .from(experiments)
      .groupBy(experiments.status);

    const recent = await db
      .select({
        id: experiments.id,
        name: experiments.name,
        date: experiments.date,
        assay_type: experiments.assay_type,
        instrument: experiments.instrument,
        status: experiments.status,
        created_at: experiments.created_at,
      })
      .from(experiments)
      .orderBy(desc(experiments.created_at))
      .limit(5);

    const byDate = await db
      .select({
        date: sql<string>`date_trunc('day', created_at)::date::text`,
        count: sql<number>`count(*)`,
      })
      .from(experiments)
      .groupBy(sql`date_trunc('day', created_at)`)
      .orderBy(sql`date_trunc('day', created_at)`)
      .limit(30);

    const byAssay = await db
      .select({ assay_type: experiments.assay_type, count: sql<number>`count(*)` })
      .from(experiments)
      .groupBy(experiments.assay_type);

    const statusMap: Record<string, number> = {};
    for (const row of byStatus) statusMap[row.status] = Number(row.count);

    res.json({
      total_experiments: Number(total[0]?.count ?? 0),
      by_status: statusMap,
      recent_experiments: recent,
      experiments_by_date: byDate.map((r) => ({ date: r.date, count: Number(r.count) })),
      assay_type_breakdown: byAssay.map((r) => ({ assay_type: r.assay_type, count: Number(r.count) })),
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to get dashboard" });
  }
});

router.get("/experiments/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const rows = await db.select().from(experiments).where(eq(experiments.id, id)).limit(1);
    if (!rows[0]) {
      return res.status(404).json({ error: "Experiment not found" });
    }
    return res.json(rows[0]);
  } catch (err) {
    return res.status(500).json({ error: "Failed to get experiment" });
  }
});

router.post("/experiments", async (req, res) => {
  try {
    const body = CreateExperimentBody.parse(req.body);

    let rawDataJson: string | null = null;
    if (body.file_content_b64 && body.file_name) {
      rawDataJson = parseFileContent(body.file_content_b64, body.file_name);
    }

    const inserted = await db
      .insert(experiments)
      .values({
        name: body.name,
        date: body.date,
        assay_type: body.assay_type,
        instrument: body.instrument ?? "Generic",
        notes: body.notes ?? null,
        status: body.status ?? "unknown",
        file_name: body.file_name ?? null,
        raw_data_json: rawDataJson,
      })
      .returning();

    return res.status(201).json(inserted[0]);
  } catch (err) {
    req.log.error({ err }, "Failed to create experiment");
    return res.status(400).json({ error: String(err) });
  }
});

router.put("/experiments/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const body = UpdateExperimentBody.parse(req.body);

    const updated = await db
      .update(experiments)
      .set({ ...body, updated_at: new Date() })
      .where(eq(experiments.id, id))
      .returning();

    if (!updated[0]) {
      return res.status(404).json({ error: "Experiment not found" });
    }
    return res.json(updated[0]);
  } catch (err) {
    return res.status(400).json({ error: String(err) });
  }
});

router.delete("/experiments/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const deleted = await db.delete(experiments).where(eq(experiments.id, id)).returning();
    if (!deleted[0]) {
      return res.status(404).json({ error: "Experiment not found" });
    }
    return res.status(204).send();
  } catch (err) {
    return res.status(500).json({ error: "Failed to delete experiment" });
  }
});

router.post("/experiments/:id/data-analysis", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const rows = await db.select().from(experiments).where(eq(experiments.id, id)).limit(1);
    if (!rows[0]) return res.status(404).json({ error: "Experiment not found" });
    const exp = rows[0];

    const related = await db
      .select()
      .from(experiments)
      .where(and(eq(experiments.assay_type, exp.assay_type), sql`${experiments.id} != ${id}`))
      .orderBy(desc(experiments.created_at))
      .limit(3);

    let plateSummary: Record<string, unknown> | null = null;
    if (exp.raw_data_json) {
      try { plateSummary = JSON.parse(exp.raw_data_json); } catch {}
    }

    const plateSummaryText = plateSummary
      ? JSON.stringify(plateSummary, null, 2).substring(0, 3000)
      : "No quantitative plate summary available for this experiment.";

    const relatedContext = related.length > 0
      ? related.map((r) => `- ${r.name} (${r.date}, ${r.assay_type}, ${r.instrument}, status: ${r.status}${r.ai_summary ? `, summary: ${r.ai_summary.substring(0, 200)}` : ""})`).join("\n")
      : "None";

    const systemPrompt = `You are an expert cell biology and lab data analysis copilot. You specialize in interpreting Synergy H1 / Gen5 microplate reader experiments. You receive:
1) a structured quantitative summary of the current experiment (control stats, dose-response stats, outliers),
2) metadata (assay type, instrument, notes),
3) optionally summaries of previous related experiments.

Your job is to:
- summarize what happened in this experiment,
- interpret the control and replicate quality,
- analyze the dose-response (or other pattern) in quantitative terms,
- identify likely causes of any failures or unexpected patterns,
- compare with previous experiments when relevant,
- and recommend 3 concrete next experiments to run.

Always:
- cite numeric data explicitly (e.g., "control mean 0.985, CV 5.1%", "1.0 µM caused ~72% drop vs control"),
- distinguish between strong evidence and speculation,
- and keep recommendations practical for a small biotech lab.

Respond in structured markdown with these exact sections:
## 1. Summary of Experiment
## 2. Data Quality & Controls
## 3. Dose-Response or Pattern Analysis
## 4. Likely Causes for Observed Outcomes
## 5. Comparison to Previous Experiments
## 6. Recommended Next 3 Experiments
## 7. Confidence and Limitations`;

    const userPrompt = `Please analyze this experiment's data and produce a structured report.

**Experiment Metadata:**
- Name: ${exp.name}
- Date: ${exp.date}
- Assay Type: ${exp.assay_type}
- Instrument: ${exp.instrument}
- Status: ${exp.status}
- Notes: ${exp.notes ?? "None"}

**Quantitative Summary (plate_summary_json):**
\`\`\`json
${plateSummaryText}
\`\`\`

**Related Experiments (same assay type):**
${relatedContext}`;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const stream = await ai.models.generateContentStream({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      config: { systemInstruction: systemPrompt, maxOutputTokens: 8192 },
    });

    for await (const chunk of stream) {
      const text = chunk.text;
      if (text) res.write(`data: ${JSON.stringify({ content: text })}\n\n`);
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    return res.end();
  } catch (err) {
    req.log.error({ err }, "Failed to generate data analysis report");
    res.write(`data: ${JSON.stringify({ error: String(err) })}\n\n`);
    return res.end();
  }
});

router.get("/templates", async (_req, res) => {
  const rows = await db.select().from(experimentTemplates).orderBy(desc(experimentTemplates.created_at));
  res.json(rows);
});

router.get("/templates/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const rows = await db.select().from(experimentTemplates).where(eq(experimentTemplates.id, id)).limit(1);
  if (!rows[0]) return res.status(404).json({ error: "Template not found" });
  return res.json(rows[0]);
});

router.post("/templates", async (req, res) => {
  try {
    const row = await db.insert(experimentTemplates).values(req.body).returning();
    return res.status(201).json(row[0]);
  } catch (err) {
    return res.status(400).json({ error: String(err) });
  }
});

router.put("/templates/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const row = await db.update(experimentTemplates).set({ ...req.body, updated_at: new Date() }).where(eq(experimentTemplates.id, id)).returning();
  if (!row[0]) return res.status(404).json({ error: "Template not found" });
  return res.json(row[0]);
});

router.delete("/templates/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const row = await db.delete(experimentTemplates).where(eq(experimentTemplates.id, id)).returning();
  if (!row[0]) return res.status(404).json({ error: "Template not found" });
  return res.status(204).send();
});

router.get("/experiments/:id/recommendations/actions", async (req, res) => {
  const experimentId = parseInt(req.params.id);
  const rows = await db.select().from(recommendationActions).where(eq(recommendationActions.experiment_id, experimentId)).orderBy(desc(recommendationActions.updated_at));
  res.json(rows);
});

router.post("/experiments/:id/recommendations/:index/approve", async (req, res) => {
  const experimentId = parseInt(req.params.id);
  const recommendationIndex = parseInt(req.params.index);
  const [exp] = await db.select().from(experiments).where(eq(experiments.id, experimentId)).limit(1);
  if (!exp) return res.status(404).json({ error: "Experiment not found" });
  const suggestions = exp.ai_next_experiments_json ? JSON.parse(exp.ai_next_experiments_json) : [];
  const original = suggestions[recommendationIndex];
  if (!original) return res.status(404).json({ error: "Recommendation not found" });
  const [row] = await db.insert(recommendationActions).values({
    experiment_id: experimentId,
    recommendation_index: recommendationIndex,
    recommendation_title: original.title ?? "Recommendation",
    original_recommendation_json: JSON.stringify(original),
    action_status: "approved",
    reviewer_name: req.body?.reviewer_name ?? null,
    reviewer_note: req.body?.reviewer_note ?? null,
  }).returning();
  return res.json(row);
});

router.post("/experiments/:id/recommendations/:index/reject", async (req, res) => {
  const experimentId = parseInt(req.params.id);
  const recommendationIndex = parseInt(req.params.index);
  const [row] = await db.insert(recommendationActions).values({
    experiment_id: experimentId,
    recommendation_index: recommendationIndex,
    recommendation_title: req.body?.title ?? "Recommendation",
    original_recommendation_json: JSON.stringify(req.body?.original ?? {}),
    action_status: "rejected",
    reviewer_name: req.body?.reviewer_name ?? null,
    reviewer_note: req.body?.reviewer_note ?? null,
  }).returning();
  return res.json(row);
});

router.post("/experiments/:id/recommendations/:index/edit", async (req, res) => {
  const experimentId = parseInt(req.params.id);
  const recommendationIndex = parseInt(req.params.index);
  const row = await db.insert(recommendationActions).values({
    experiment_id: experimentId,
    recommendation_index: recommendationIndex,
    recommendation_title: req.body?.title,
    original_recommendation_json: JSON.stringify(req.body?.original ?? {}),
    edited_recommendation_json: JSON.stringify({
      title: req.body?.title,
      variable_to_change: req.body?.variable_to_change,
      rationale: req.body?.rationale,
      expected_outcome: req.body?.expected_outcome,
      confidence: req.body?.confidence,
    }),
    action_status: "edited",
    reviewer_name: req.body?.reviewer_name ?? null,
    reviewer_note: req.body?.reviewer_note ?? null,
  }).returning();
  return res.json(row[0]);
});

router.get("/experiments/:id/comments", async (req, res) => {
  const experimentId = parseInt(req.params.id);
  const rows = await db.select().from(experimentComments).where(eq(experimentComments.experiment_id, experimentId)).orderBy(desc(experimentComments.created_at));
  res.json(rows);
});

router.post("/experiments/:id/comments", async (req, res) => {
  const experimentId = parseInt(req.params.id);
  const row = await db.insert(experimentComments).values({ experiment_id: experimentId, ...req.body }).returning();
  res.status(201).json(row[0]);
});

router.delete("/comments/:comment_id", async (req, res) => {
  const id = parseInt(req.params.comment_id);
  const row = await db.delete(experimentComments).where(eq(experimentComments.id, id)).returning();
  if (!row[0]) return res.status(404).json({ error: "Comment not found" });
  return res.status(204).send();
});

router.get("/tasks", async (_req, res) => {
  const rows = await db.select().from(tasks).orderBy(desc(tasks.created_at));
  return res.json(rows);
});

router.get("/experiments/:id/tasks", async (req, res) => {
  const experimentId = parseInt(req.params.id);
  const rows = await db.select().from(tasks).where(eq(tasks.experiment_id, experimentId)).orderBy(desc(tasks.created_at));
  return res.json(rows);
});

router.post("/tasks", async (req, res) => {
  const row = await db.insert(tasks).values(req.body).returning();
  return res.status(201).json(row[0]);
});

router.put("/tasks/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const row = await db.update(tasks).set({ ...req.body, updated_at: new Date() }).where(eq(tasks.id, id)).returning();
  if (!row[0]) return res.status(404).json({ error: "Task not found" });
  return res.json(row[0]);
});

router.delete("/tasks/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const row = await db.delete(tasks).where(eq(tasks.id, id)).returning();
  if (!row[0]) return res.status(404).json({ error: "Task not found" });
  return res.status(204).send();
});

router.post("/experiments/:id/analyze", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const bodyParsed = req.body && Object.keys(req.body).length > 0
      ? AnalyzeExperimentBody.parse(req.body)
      : {};

    const rows = await db.select().from(experiments).where(eq(experiments.id, id)).limit(1);
    if (!rows[0]) return res.status(404).json({ error: "Experiment not found" });
    const exp = rows[0];

    // Fetch related experiments for context
    const related = await db
      .select()
      .from(experiments)
      .where(and(eq(experiments.assay_type, exp.assay_type), sql`${experiments.id} != ${id}`))
      .orderBy(desc(experiments.created_at))
      .limit(3);

    const dataContext = exp.raw_data_json
      ? `\nParsed data summary: ${exp.raw_data_json.substring(0, 2000)}`
      : "\nNo file data uploaded.";

    const relatedContext = related.length > 0
      ? `\nRelated experiments:\n${related.map((r) => `- ${r.name} (${r.date}, status: ${r.status})`).join("\n")}`
      : "\nNo related experiments found.";

    const focusNote = bodyParsed.focus_question
      ? `\nFocus question: ${bodyParsed.focus_question}`
      : "";

    const isPlateReaderExp = (exp.instrument?.toLowerCase().includes("synergy") ||
      exp.assay_type?.toLowerCase().includes("plate reader") ||
      exp.assay_type?.toLowerCase().includes("elisa") ||
      exp.assay_type?.toLowerCase().includes("absorbance") ||
      (exp.raw_data_json?.includes('"_type":"plate96"') ?? false));

    const systemPrompt = isPlateReaderExp
      ? `You are an expert lab scientist AI copilot specializing in plate reader assays (ELISA, absorbance, fluorescence, luminescence). When plate data is present, analyze: 1) Well-to-well variability (CV%), 2) Outlier wells (high/low flags), 3) Signal-to-background ratio, 4) Edge effects (peripheral vs. inner wells), 5) Blank/zero wells and their impact. Be specific — cite actual well IDs, absorbance values, and statistical metrics. Recommend concrete corrective actions if CV% > 20% or outliers are detected.`
      : `You are an expert lab scientist AI copilot. You help scientists understand their experiments, diagnose issues, and plan next experiments. Always be specific and actionable, citing the data you see. If data is present, analyze it numerically.`;

    const userPrompt = `Analyze this experiment and provide: 1) A concise summary of what happened, 2) Key observations, 3) Exactly 3 suggested next experiments in JSON format.

Experiment: ${exp.name}
Date: ${exp.date}
Assay type: ${exp.assay_type}
Instrument: ${exp.instrument}
Status: ${exp.status}
Notes: ${exp.notes ?? "None"}${dataContext}${relatedContext}${focusNote}

Respond in this exact JSON format:
{
  "summary": "...",
  "suggestions": [
    {
      "title": "...",
      "variable_to_change": "...",
      "rationale": "...",
      "expected_outcome": "...",
      "confidence": "low|medium|high"
    }
  ]
}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      config: {
        systemInstruction: systemPrompt,
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
      },
    });

    const text = response.text ?? "{}";
    let parsed: { summary: string; suggestions: unknown[] };
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { summary: text, suggestions: [] };
    }

    // Create a conversation for this experiment if it doesn't have one
    let convId = exp.conversation_id;
    if (!convId) {
      const conv = await db
        .insert(conversations)
        .values({ title: `Copilot: ${exp.name}` })
        .returning();
      convId = conv[0].id;
      await db
        .update(experiments)
        .set({ conversation_id: convId, updated_at: new Date() })
        .where(eq(experiments.id, id));
    }

    // Save AI summary and suggestions
    await db
      .update(experiments)
      .set({
        ai_summary: parsed.summary,
        ai_next_experiments_json: JSON.stringify(parsed.suggestions),
        updated_at: new Date(),
      })
      .where(eq(experiments.id, id));

    // Save as assistant message in conversation
    await db.insert(messages).values({
      conversationId: convId,
      role: "assistant",
      content: `**Analysis Summary**\n\n${parsed.summary}`,
    });

    return res.json({
      ai_summary: parsed.summary,
      suggestions: parsed.suggestions,
      conversation_id: convId,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to analyze experiment");
    return res.status(500).json({ error: String(err) });
  }
});

router.post("/experiments/compare", async (req, res) => {
  try {
    const { experiment_a_id, experiment_b_id, question } = req.body as {
      experiment_a_id: number;
      experiment_b_id: number;
      question?: string;
    };

    if (!experiment_a_id || !experiment_b_id) {
      return res.status(400).json({ error: "Both experiment_a_id and experiment_b_id are required" });
    }

    const [rowsA, rowsB] = await Promise.all([
      db.select().from(experiments).where(eq(experiments.id, experiment_a_id)).limit(1),
      db.select().from(experiments).where(eq(experiments.id, experiment_b_id)).limit(1),
    ]);

    if (!rowsA[0]) return res.status(404).json({ error: "Experiment A not found" });
    if (!rowsB[0]) return res.status(404).json({ error: "Experiment B not found" });

    const a = rowsA[0];
    const b = rowsB[0];

    const formatExp = (e: typeof a, label: string) =>
      `=== ${label}: ${e.name} ===
Date: ${e.date} | Assay: ${e.assay_type} | Instrument: ${e.instrument} | Status: ${e.status}
Notes: ${e.notes ?? "None"}${e.ai_summary ? `\nPrevious AI analysis: ${e.ai_summary}` : ""}${e.raw_data_json ? `\nData: ${e.raw_data_json.substring(0, 800)}` : ""}`;

    const userPrompt = question
      ? `The scientist asks: "${question}"\n\nPlease answer using the two experiments below as context.\n\n${formatExp(a, "Experiment A")}\n\n${formatExp(b, "Experiment B")}`
      : `Compare these two experiments in detail. Cover:\n1. What was different between them (conditions, protocol, timing)\n2. Why one succeeded / failed vs the other\n3. Key lessons learned from the comparison\n4. Concrete recommendations for the next experiment based on both runs\n\n${formatExp(a, "Experiment A")}\n\n${formatExp(b, "Experiment B")}`;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const stream = await ai.models.generateContentStream({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      config: {
        systemInstruction: `You are an expert lab scientist AI copilot specializing in comparative experiment analysis. You identify root causes of success or failure by carefully examining differences between experimental runs. Be specific, cite numbers, and give actionable conclusions.`,
        maxOutputTokens: 8192,
      },
    });

    for await (const chunk of stream) {
      const text = chunk.text;
      if (text) {
        res.write(`data: ${JSON.stringify({ content: text })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    return res.end();
  } catch (err) {
    req.log.error({ err }, "Failed to compare experiments");
    res.write(`data: ${JSON.stringify({ error: String(err) })}\n\n`);
    return res.end();
  }
});

router.post("/experiments/parse-synergy", async (req, res) => {
  try {
    const { file_content_b64, file_name } = req.body as {
      file_content_b64: string;
      file_name: string;
    };

    if (!file_content_b64 || !file_name) {
      return res.status(400).json({ error: "file_content_b64 and file_name are required" });
    }

    const buffer = Buffer.from(file_content_b64, "base64");
    const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });

    const sheetName = workbook.SheetNames[0];
    if (!sheetName) return res.status(400).json({ error: "No sheets found in workbook" });

    const sheet = workbook.Sheets[sheetName];
    const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      raw: true,
      defval: null,
    });

    const result = parseSynergyH1Rows(rows, file_name);
    return res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to parse Synergy H1 file");
    return res.status(500).json({ error: String(err) });
  }
});

interface WellData {
  well: string;
  row: string;
  col: number;
  value: number | null;
  status: "ok" | "blank" | "high" | "low";
  cv_pct: number | null;
}

interface PlateParseResult {
  metadata: {
    plate_name: string | null;
    date: string | null;
    protocol: string | null;
    wavelength: string | null;
    instrument: string | null;
    read_type: string | null;
  };
  wells: WellData[];
  stats: {
    mean: number | null;
    sd: number | null;
    cv_pct: number | null;
    min: number | null;
    max: number | null;
    blank_count: number;
    well_count: number;
  };
  read_matrix: (number | null)[][];
}

function parseSynergyH1Rows(rows: unknown[][], filename: string): PlateParseResult {
  const ROWS_ALPHA = ["A", "B", "C", "D", "E", "F", "G", "H"];
  const COLS_NUM = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  const metadata = {
    plate_name: null as string | null,
    date: null as string | null,
    protocol: null as string | null,
    wavelength: null as string | null,
    instrument: null as string | null,
    read_type: null as string | null,
  };

  const strVal = (v: unknown): string => (v != null ? String(v).trim() : "");

  for (const row of rows) {
    if (!Array.isArray(row)) continue;
    const key = strVal(row[0]).toLowerCase();
    const val = strVal(row[1]);
    if (!val) continue;
    if (key.includes("plate") || key.includes("plate name")) metadata.plate_name = val;
    else if (key.includes("date")) metadata.date = val;
    else if (key.includes("protocol")) metadata.protocol = val;
    else if (key.includes("wavelength") || key.includes("wave length") || key === "read") metadata.wavelength = val;
    else if (key.includes("instrument") || key.includes("reader")) metadata.instrument = val;
    else if (key.includes("read type") || key.includes("assay")) metadata.read_type = val;
  }

  if (!metadata.instrument) metadata.instrument = "Synergy H1";

  let plateStartRow = -1;
  let colOffset = -1;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!Array.isArray(row)) continue;
    let consecutiveNums = 0;
    let firstNumIdx = -1;
    for (let j = 0; j < row.length; j++) {
      const v = row[j];
      const n = typeof v === "number" ? v : parseInt(strVal(v), 10);
      if (!isNaN(n) && n >= 1 && n <= 12) {
        if (firstNumIdx === -1) firstNumIdx = j;
        consecutiveNums++;
      } else if (firstNumIdx !== -1) {
        break;
      }
    }
    if (consecutiveNums >= 8) {
      plateStartRow = i + 1;
      colOffset = firstNumIdx;
      break;
    }
  }

  if (plateStartRow === -1) {
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!Array.isArray(row)) continue;
      const firstCell = strVal(row[0]).toUpperCase();
      if (firstCell === "A") {
        let hasNumbers = false;
        for (let j = 1; j < Math.min(row.length, 14); j++) {
          const v = row[j];
          const n = typeof v === "number" ? v : parseFloat(strVal(v));
          if (!isNaN(n)) { hasNumbers = true; break; }
        }
        if (hasNumbers) {
          plateStartRow = i;
          colOffset = 1;
          break;
        }
      }
    }
  }

  const readMatrix: (number | null)[][] = Array.from({ length: 8 }, () =>
    Array(12).fill(null)
  );

  if (plateStartRow !== -1) {
    for (let r = 0; r < 8; r++) {
      const rowIdx = plateStartRow + r;
      if (rowIdx >= rows.length) break;
      const row = rows[rowIdx];
      if (!Array.isArray(row)) continue;
      const rowLabel = strVal(row[0]).toUpperCase();
      const rowAlphaIdx = ROWS_ALPHA.indexOf(rowLabel);
      const targetRow = rowAlphaIdx >= 0 ? rowAlphaIdx : r;

      for (let c = 0; c < 12; c++) {
        const cellIdx = colOffset + c;
        if (cellIdx >= row.length) continue;
        const raw = row[cellIdx];
        const n = typeof raw === "number" ? raw : parseFloat(strVal(raw));
        if (!isNaN(n)) readMatrix[targetRow][c] = n;
      }
    }
  }

  const allValues = readMatrix.flat().filter((v): v is number => v !== null);
  let mean: number | null = null;
  let sd: number | null = null;
  let cv_pct: number | null = null;
  let min: number | null = null;
  let max: number | null = null;

  if (allValues.length > 0) {
    mean = allValues.reduce((a, b) => a + b, 0) / allValues.length;
    sd = Math.sqrt(allValues.reduce((a, b) => a + (b - mean!) ** 2, 0) / allValues.length);
    cv_pct = mean !== 0 ? (sd / mean) * 100 : null;
    min = Math.min(...allValues);
    max = Math.max(...allValues);
  }

  const blankThreshold = min !== null && max !== null ? min + (max - min) * 0.05 : 0;
  const highThreshold = max !== null && mean !== null ? mean + 2 * (sd ?? 0) : Infinity;
  const lowThreshold = mean !== null ? mean - 2 * (sd ?? 0) : -Infinity;

  const wells: WellData[] = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 12; c++) {
      const val = readMatrix[r][c];
      const wellId = `${ROWS_ALPHA[r]}${COLS_NUM[c]}`;
      let status: WellData["status"] = "ok";
      if (val === null || val <= blankThreshold) status = "blank";
      else if (val > highThreshold) status = "high";
      else if (val < lowThreshold) status = "low";

      wells.push({
        well: wellId,
        row: ROWS_ALPHA[r],
        col: COLS_NUM[c],
        value: val,
        status,
        cv_pct: null,
      });
    }
  }

  return {
    metadata,
    wells,
    stats: {
      mean: mean !== null ? parseFloat(mean.toFixed(4)) : null,
      sd: sd !== null ? parseFloat(sd.toFixed(4)) : null,
      cv_pct: cv_pct !== null ? parseFloat(cv_pct.toFixed(2)) : null,
      min: min !== null ? parseFloat(min.toFixed(4)) : null,
      max: max !== null ? parseFloat(max.toFixed(4)) : null,
      blank_count: wells.filter((w) => w.status === "blank").length,
      well_count: allValues.length,
    },
    read_matrix: readMatrix,
  };
}

function parseFileContent(b64: string, filename: string): string {
  try {
    const ext = filename.split(".").pop()?.toLowerCase();
    if (ext === "xlsx" || ext === "xls") {
      const buffer = Buffer.from(b64, "base64");
      const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) return JSON.stringify({ error: "No sheets found", filename });
      const sheet = workbook.Sheets[sheetName];
      const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: null });
      const result = parseSynergyH1Rows(rows, filename);
      return JSON.stringify({ ...result, _type: "plate96" });
    }

    const content = Buffer.from(b64, "base64").toString("utf-8");
    const lines = content.split("\n").filter((l) => l.trim());
    if (lines.length < 2) return JSON.stringify({ error: "File too short", rows: 0 });

    const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));
    const rows = lines.slice(1).map((line) => {
      const vals = line.split(",").map((v) => v.trim().replace(/"/g, ""));
      return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? ""]));
    });

    const signalKey = headers.find((h) => /signal|value|od|abs|rlu|rfu|rcu/i.test(h));
    const conditionKey = headers.find((h) => /condition|group|treatment/i.test(h));

    const summary: Record<string, unknown> = {
      filename,
      total_rows: rows.length,
      columns: headers,
    };

    if (signalKey) {
      const signals = rows.map((r) => parseFloat(r[signalKey] ?? "0")).filter((n) => !isNaN(n));
      const mean = signals.reduce((a, b) => a + b, 0) / signals.length;
      const sd = Math.sqrt(signals.reduce((a, b) => a + (b - mean) ** 2, 0) / signals.length);
      summary.signal_stats = { mean: mean.toFixed(4), sd: sd.toFixed(4), n: signals.length };
    }

    if (conditionKey) {
      const groups: Record<string, number[]> = {};
      for (const row of rows) {
        const cond = row[conditionKey] ?? "Unknown";
        if (!groups[cond]) groups[cond] = [];
        if (signalKey && !isNaN(parseFloat(row[signalKey] ?? ""))) {
          groups[cond].push(parseFloat(row[signalKey]));
        }
      }
      summary.condition_groups = Object.entries(groups).map(([cond, vals]) => {
        const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
        return { condition: cond, n: vals.length, mean: mean.toFixed(4) };
      });
    }

    return JSON.stringify(summary);
  } catch {
    return JSON.stringify({ error: "Failed to parse file", filename });
  }
}

export default router;
