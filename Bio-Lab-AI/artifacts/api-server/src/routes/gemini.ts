import { Router, type IRouter } from "express";
import { eq, desc, and } from "drizzle-orm";
import { db, conversations, messages, experiments } from "@workspace/db";
import {
  CreateGeminiConversationBody,
  SendGeminiMessageBody,
  ListGeminiConversationsQueryParams,
} from "@workspace/api-zod";
import { generateContentStreamWithRetry } from "../lib/aiRetry";
import { getAuth } from "@clerk/express";

const router: IRouter = Router();

const LAB_SYSTEM_PROMPT = `You are an expert cell biologist and lab copilot.
You have access to this lab's full experiment history.
Always reference specific experiments by name when answering. Be specific, actionable, and scientific.`;

const GENERAL_SYSTEM_PROMPT = `You are an expert biotech and cell biology advisor.
Answer general scientific questions, explain concepts, help with protocol design, and discuss biotech topics. Be concise and scientific.`;

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
      },
    });

    for await (const chunk of stream) {
      const text = chunk.text;
      if (text) {
        fullResponse += text;
        res.write(`data: ${JSON.stringify({ content: text })}\n\n`);
      }
    }

    await db
      .insert(messages)
      .values({ conversationId: convId, role: "assistant", content: fullResponse });

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
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

    const stream = await generateContentStreamWithRetry({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: message }] }],
      config: {
        systemInstruction,
        maxOutputTokens: 4096,
      },
    });

    for await (const chunk of stream) {
      const text = chunk.text;
      if (text) {
        res.write(`data: ${JSON.stringify({ content: text })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: String(err) })}\n\n`);
    res.end();
  }
});

export default router;
