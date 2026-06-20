import { Router, type IRouter } from "express";
import { eq, desc, and } from "drizzle-orm";
import { db, conversations, messages, experiments, projects } from "@workspace/db";
import {
  CreateGeminiConversationBody,
  SendGeminiMessageBody,
  ListGeminiConversationsQueryParams,
} from "@workspace/api-zod";
import { generateContentWithRetry, generateContentStreamWithRetry } from "../lib/aiRetry";
import { getAuth } from "@clerk/express";

const router: IRouter = Router();

const LAB_SYSTEM_PROMPT = `You are an expert cell biologist and lab copilot.
You have access to this lab's full experiment history.
Always reference specific experiments by name when answering. Be specific, actionable, and scientific.`;

const GENERAL_SYSTEM_PROMPT = `You are an expert biotech and cell biology advisor.
Answer general scientific questions, explain concepts, help with protocol design, and discuss biotech topics. Be concise and scientific.`;

const PROJECT_SYSTEM_PROMPT = `You are an expert cell biologist and research strategist acting as the copilot for an entire research PROJECT.
You are given the project's goal and every experiment logged under it. Reason across the whole project, not one plate:
connect findings between experiments, flag patterns, contradictions, and gaps, and recommend concrete next experiments
that advance the project's goal. Always reference specific experiments by name. Be specific, quantitative, and actionable.`;

type ConversationRow = typeof conversations.$inferSelect;
type ExperimentRow = typeof experiments.$inferSelect;

function formatExperimentContext(experiment: ExperimentRow): string {
  const conditions = experiment.notes ?? "None";
  const results = experiment.ai_summary ?? "None";
  return `${experiment.name}, ${experiment.date}, ${experiment.status}, conditions: ${conditions}, results: ${results}`;
}

function buildLabHistory(experimentRows: ExperimentRow[]): string {
  return experimentRows
    .map((experiment, index) => `Experiment ${index + 1}: ${formatExperimentContext(experiment)}`)
    .join("\n");
}

router.get("/gemini/conversations", async (req, res) => {
  try {
    const userId = getAuth(req).userId!;
    const query = ListGeminiConversationsQueryParams.parse(req.query);
    let rows: ConversationRow[] = [];
    if (query.experiment_id) {
      const exp = await db
        .select({ conversation_id: experiments.conversation_id })
        .from(experiments)
        .where(and(eq(experiments.id, query.experiment_id), eq(experiments.user_id, userId)))
        .limit(1);
      if (exp[0]?.conversation_id) {
        rows = await db
          .select()
          .from(conversations)
          .where(eq(conversations.id, exp[0].conversation_id))
          .orderBy(desc(conversations.createdAt));
      }
    } else {
      rows = await db
        .select()
        .from(conversations)
        .where(eq(conversations.user_id, userId))
        .orderBy(desc(conversations.createdAt));
    }

    const expRows = await db
      .select({ id: experiments.id, conversation_id: experiments.conversation_id })
      .from(experiments)
      .where(eq(experiments.user_id, userId));
    const convToExpMap: Record<number, number> = {};
    for (const e of expRows) {
      if (e.conversation_id) convToExpMap[e.conversation_id] = e.id;
    }

    res.json(rows.map((c) => ({ ...c, experimentId: convToExpMap[c.id] ?? null })));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.post("/gemini/conversations", async (req, res) => {
  try {
    const body = CreateGeminiConversationBody.parse(req.body);
    const userId = getAuth(req).userId!;
    const inserted = await db.insert(conversations).values({ title: body.title, user_id: userId }).returning();
    const conv = inserted[0];
    if (!conv) {
      res.status(500).json({ error: "Failed to create conversation" });
      return;
    }

    if (body.experimentId) {
      await db
        .update(experiments)
        .set({ conversation_id: conv.id, updated_at: new Date() })
        .where(eq(experiments.id, body.experimentId));
    }

    const expRows = await db
      .select({ id: experiments.id })
      .from(experiments)
      .where(eq(experiments.conversation_id, conv.id))
      .limit(1);

    res.status(201).json({ ...conv, experimentId: expRows[0]?.id ?? body.experimentId ?? null });
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

router.get("/gemini/conversations/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const userId = getAuth(req).userId!;
    const rows = await db.select().from(conversations).where(eq(conversations.id, id)).limit(1);
    if (!rows[0] || rows[0].user_id !== userId) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }

    const msgs = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, id))
      .orderBy(messages.createdAt);

    const expRows = await db
      .select({ id: experiments.id })
      .from(experiments)
      .where(eq(experiments.conversation_id, id))
      .limit(1);

    res.json({ ...rows[0], experimentId: expRows[0]?.id ?? null, messages: msgs });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.delete("/gemini/conversations/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const userId = getAuth(req).userId!;
    const deleted = await db.delete(conversations).where(and(eq(conversations.id, id), eq(conversations.user_id, userId))).returning();
    if (!deleted[0]) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/gemini/conversations/:id/messages", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const userId = getAuth(req).userId!;
    const owner = await db
      .select({ user_id: conversations.user_id })
      .from(conversations)
      .where(eq(conversations.id, id))
      .limit(1);
    if (!owner[0] || owner[0].user_id !== userId) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }
    const msgs = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, id))
      .orderBy(messages.createdAt);
    res.json(msgs);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.post("/gemini/conversations/:id/messages", async (req, res) => {
  try {
    const convId = parseInt(req.params.id);
    const body = SendGeminiMessageBody.parse(req.body);

    const conv = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, convId))
      .limit(1);
    if (!conv[0] || conv[0].user_id !== getAuth(req).userId!) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }

    await db
      .insert(messages)
      .values({ conversationId: convId, role: "user", content: body.content });

    const expRows = await db
      .select()
      .from(experiments)
      .where(eq(experiments.conversation_id, convId))
      .limit(1);
    const exp = expRows[0];

    const chatHistory = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, convId))
      .orderBy(messages.createdAt);

    const userId = getAuth(req).userId!;
    const allExperiments = await db
      .select()
      .from(experiments)
      .where(eq(experiments.user_id, userId))
      .orderBy(desc(experiments.date));

    let systemInstruction = LAB_SYSTEM_PROMPT;
    systemInstruction += `\n\nFULL LAB HISTORY:\n${buildLabHistory(allExperiments)}\n\nCURRENT EXPERIMENT: ${exp ? formatExperimentContext(exp) : "None"}\n\nSCIENTIST QUESTION: ${body.content}`;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    let fullResponse = "";

    const stream = await generateContentStreamWithRetry({
      model: "gemini-2.5-flash",
      contents: chatHistory.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
      config: {
        systemInstruction,
        maxOutputTokens: 8192,
        // gemini-2.5-flash spends "thinking" tokens from the output budget; without
        // this it can burn the whole budget thinking and stream ZERO text, leaving
        // the user with their message and no reply. Disable thinking for chat.
        thinkingConfig: { thinkingBudget: 0 },
      },
    });

    for await (const chunk of stream) {
      const text = chunk.text;
      if (text) {
        fullResponse += text;
        res.write(`data: ${JSON.stringify({ content: text })}\n\n`);
      }
    }

    if (fullResponse.trim()) {
      await db
        .insert(messages)
        .values({ conversationId: convId, role: "assistant", content: fullResponse });
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    } else {
      // Don't persist an empty assistant bubble — surface a retryable error instead.
      res.write(
        `data: ${JSON.stringify({
          error: "The AI returned an empty response (it may be rate-limited). Please try again.",
        })}\n\n`,
      );
    }
    res.end();
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: String(err) })}\n\n`);
    res.end();
  }
});

// ── Project copilot (Phase 2) ─────────────────────────────────────────────────
// A chat scoped to one Project: grounded in the project's goal + ONLY that
// project's experiments. The project's conversation is created lazily on first
// message (projects.conversation_id).

router.get("/projects/:id/messages", async (req, res) => {
  try {
    const userId = getAuth(req).userId!;
    const projectId = parseInt(req.params.id, 10);
    const proj = await db
      .select({ user_id: projects.user_id, conversation_id: projects.conversation_id })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);
    if (!proj[0] || proj[0].user_id !== userId) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    if (!proj[0].conversation_id) {
      res.json([]);
      return;
    }
    const msgs = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, proj[0].conversation_id))
      .orderBy(messages.createdAt);
    res.json(msgs);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.post("/projects/:id/chat", async (req, res) => {
  try {
    const userId = getAuth(req).userId!;
    const projectId = parseInt(req.params.id, 10);
    const { content } = (req.body ?? {}) as { content?: unknown };
    if (typeof content !== "string" || !content.trim()) {
      res.status(400).json({ error: "content is required" });
      return;
    }

    const projRows = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
    const proj = projRows[0];
    if (!proj || proj.user_id !== userId) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    // Ensure the project has a conversation (created lazily on first message).
    let convId = proj.conversation_id;
    if (!convId) {
      const inserted = await db
        .insert(conversations)
        .values({ title: `Project: ${proj.name}`, user_id: userId })
        .returning();
      convId = inserted[0]!.id;
      await db.update(projects).set({ conversation_id: convId, updated_at: new Date() }).where(eq(projects.id, projectId));
    }

    await db.insert(messages).values({ conversationId: convId, role: "user", content });

    // Ground the AI in the project's goal + every experiment in THIS project.
    const projExperiments = await db
      .select()
      .from(experiments)
      .where(and(eq(experiments.project_id, projectId), eq(experiments.user_id, userId)))
      .orderBy(desc(experiments.date));

    const chatHistory = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, convId))
      .orderBy(messages.createdAt);

    const systemInstruction =
      `${PROJECT_SYSTEM_PROMPT}\n\nPROJECT: ${proj.name}\nGOAL: ${proj.goal ?? "(not specified)"}\n\n` +
      `EXPERIMENTS IN THIS PROJECT:\n${projExperiments.length ? buildLabHistory(projExperiments) : "(none logged yet)"}\n\n` +
      `SCIENTIST QUESTION: ${content}`;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    let fullResponse = "";
    const stream = await generateContentStreamWithRetry({
      model: "gemini-2.5-flash",
      contents: chatHistory.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
      config: {
        systemInstruction,
        maxOutputTokens: 8192,
        thinkingConfig: { thinkingBudget: 0 },
      },
    });

    for await (const chunk of stream) {
      const text = chunk.text;
      if (text) {
        fullResponse += text;
        res.write(`data: ${JSON.stringify({ content: text })}\n\n`);
      }
    }

    if (fullResponse.trim()) {
      await db.insert(messages).values({ conversationId: convId, role: "assistant", content: fullResponse });
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    } else {
      res.write(
        `data: ${JSON.stringify({
          error: "The AI returned an empty response (it may be rate-limited). Please try again.",
        })}\n\n`,
      );
    }
    res.end();
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: String(err) })}\n\n`);
    res.end();
  }
});

router.post("/gemini/general-chat", async (req, res) => {
  try {
    const { message } = req.body as { message?: string };
    if (!message?.trim()) {
      res.status(400).json({ error: "Message is required" });
      return;
    }

    // Inject the user's own experiment history so "Ask Anything" can answer
    // questions about their real data (the "second brain" behaviour).
    const userId = getAuth(req).userId!;
    const experimentRows = await db
      .select()
      .from(experiments)
      .where(eq(experiments.user_id, userId))
      .orderBy(desc(experiments.created_at))
      .limit(30);

    const systemInstruction =
      experimentRows.length > 0
        ? `${LAB_SYSTEM_PROMPT}\n\nThis scientist's most recent experiments:\n${buildLabHistory(
            experimentRows,
          )}\n\nWhen the question relates to their work, ground your answer in these experiments and cite them by name. For general scientific questions, answer normally.`
        : GENERAL_SYSTEM_PROMPT;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    let fullResponse = "";
    const stream = await generateContentStreamWithRetry({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: message }] }],
      config: {
        systemInstruction,
        maxOutputTokens: 4096,
        // See chat route: disable thinking so 2.5-flash doesn't stream an empty reply.
        thinkingConfig: { thinkingBudget: 0 },
      },
    });

    for await (const chunk of stream) {
      const text = chunk.text;
      if (text) {
        fullResponse += text;
        res.write(`data: ${JSON.stringify({ content: text })}\n\n`);
      }
    }

    if (fullResponse.trim()) {
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    } else {
      res.write(
        `data: ${JSON.stringify({
          error: "The AI returned an empty response (it may be rate-limited). Please try again.",
        })}\n\n`,
      );
    }
    res.end();
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: String(err) })}\n\n`);
    res.end();
  }
});

// ── AI protocol generation (wave 2) ───────────────────────────────────────────
// Describe a research goal → get a structured, bench-ready protocol. Grounded in
// the scientist's recent experiments for consistency. Returns JSON the frontend
// can preview and use to pre-fill a new experiment.
router.post("/gemini/generate-protocol", async (req, res) => {
  try {
    const userId = getAuth(req).userId!;
    const { goal, assay_type } = req.body as { goal?: string; assay_type?: string };
    if (!goal?.trim()) {
      res.status(400).json({ error: "A research goal / description is required" });
      return;
    }

    const recent = await db
      .select()
      .from(experiments)
      .where(eq(experiments.user_id, userId))
      .orderBy(desc(experiments.created_at))
      .limit(10);
    const historyCtx = recent.length
      ? `\n\nThe scientist's recent experiments (for context and consistency):\n${buildLabHistory(recent)}`
      : "";

    const systemInstruction = `You are an expert experimental designer for a cell and molecular biology lab. Given a research goal, design a rigorous, bench-ready protocol. Be specific and quantitative: state concentrations, volumes, timings, seeding densities, replicate counts, the plate/sample layout, and the exact controls required (positive, negative, vehicle, blank). Choose an appropriate assay and instrument. Keep it realistic, safe, and concise — no preamble.`;

    const userPrompt = `Design a protocol for this goal: ${goal}${assay_type ? `\nPreferred assay type: ${assay_type}` : ""}${historyCtx}

Respond in this exact JSON format:
{
  "title": "short experiment name",
  "assay_type": "...",
  "instrument": "...",
  "objective": "one or two sentences",
  "materials": ["reagent/equipment with key spec", "..."],
  "controls": ["control and its purpose", "..."],
  "plate_layout": "how samples/doses/controls are arranged",
  "steps": ["numbered, actionable step", "..."],
  "expected_readout": "what is measured and how it is interpreted",
  "suggested_analysis": "the statistics/curve fit to apply (e.g. 4PL IC50, Z'-factor)"
}`;

    const response = await generateContentWithRetry({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      config: {
        systemInstruction,
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 0 },
      },
    });

    const text = response.text ?? "{}";
    let protocol: unknown;
    try {
      protocol = JSON.parse(text);
    } catch {
      res.status(502).json({ error: "AI returned a malformed protocol — please try again." });
      return;
    }

    res.json(protocol);
  } catch (err) {
    req.log.error({ err }, "Failed to generate protocol");
    res.status(500).json({ error: String(err) });
  }
});

export default router;
