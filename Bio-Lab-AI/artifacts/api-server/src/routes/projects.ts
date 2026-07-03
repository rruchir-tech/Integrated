import { Router, type IRouter } from "express";
import { eq, and, desc, sql } from "drizzle-orm";
import { db, projects, experiments, projectDocuments } from "@workspace/db";
import { getRequestUserId } from "../lib/requestUser";

const router: IRouter = Router();

// ── list the user's projects (with experiment counts) ──
router.get("/projects", async (req, res) => {
  try {
    const userId = getRequestUserId(req);
    const rows = await db
      .select({
        id: projects.id,
        name: projects.name,
        goal: projects.goal,
        status: projects.status,
        created_at: projects.created_at,
        updated_at: projects.updated_at,
        experiment_count: sql<number>`count(${experiments.id})`,
      })
      .from(projects)
      .leftJoin(experiments, eq(experiments.project_id, projects.id))
      .where(eq(projects.user_id, userId))
      .groupBy(projects.id)
      .orderBy(desc(projects.created_at));

    res.json(rows.map((r) => ({ ...r, experiment_count: Number(r.experiment_count) })));
  } catch (err) {
    req.log.error({ err }, "Failed to list projects");
    res.status(500).json({ error: "Failed to list projects" });
  }
});

// ── create a project ──
router.post("/projects", async (req, res) => {
  try {
    const userId = getRequestUserId(req);
    const { name, goal, status } = (req.body ?? {}) as { name?: unknown; goal?: unknown; status?: unknown };
    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "A project name is required" });
    }
    const inserted = await db
      .insert(projects)
      .values({
        user_id: userId,
        name: name.trim(),
        goal: typeof goal === "string" && goal.trim() ? goal.trim() : null,
        status: typeof status === "string" && status.trim() ? status.trim() : "active",
      })
      .returning();
    return res.status(201).json(inserted[0]);
  } catch (err) {
    req.log.error({ err }, "Failed to create project");
    return res.status(400).json({ error: "Failed to create project" });
  }
});

// ── get one project + the experiments in it ──
router.get("/projects/:id", async (req, res) => {
  try {
    const userId = getRequestUserId(req);
    const id = parseInt(req.params.id, 10);
    const rows = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, id), eq(projects.user_id, userId)))
      .limit(1);
    if (!rows[0]) {
      return res.status(404).json({ error: "Project not found" });
    }
    const exps = await db
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
      .where(and(eq(experiments.project_id, id), eq(experiments.user_id, userId)))
      .orderBy(desc(experiments.created_at));

    return res.json({ ...rows[0], experiments: exps });
  } catch (err) {
    req.log.error({ err }, "Failed to get project");
    return res.status(500).json({ error: "Failed to get project" });
  }
});

// ── update a project (name / goal / status) ──
router.put("/projects/:id", async (req, res) => {
  try {
    const userId = getRequestUserId(req);
    const id = parseInt(req.params.id, 10);
    const { name, goal, status } = (req.body ?? {}) as { name?: unknown; goal?: unknown; status?: unknown };

    const patch: Record<string, unknown> = { updated_at: new Date() };
    if (typeof name === "string" && name.trim()) patch.name = name.trim();
    if (typeof goal === "string") patch.goal = goal.trim() ? goal.trim() : null;
    if (typeof status === "string" && status.trim()) patch.status = status.trim();

    const updated = await db
      .update(projects)
      .set(patch)
      .where(and(eq(projects.id, id), eq(projects.user_id, userId)))
      .returning();
    if (!updated[0]) {
      return res.status(404).json({ error: "Project not found" });
    }
    return res.json(updated[0]);
  } catch (err) {
    req.log.error({ err }, "Failed to update project");
    return res.status(400).json({ error: "Failed to update project" });
  }
});

// ── assign / move / unassign an experiment to a project ──
// body: { project_id: number | null }  (null = ungroup). Hand-validated so we
// don't need to regen UpdateExperimentBody just to carry one field.
router.put("/experiments/:id/project", async (req, res) => {
  try {
    const userId = getRequestUserId(req);
    const expId = parseInt(req.params.id, 10);
    const { project_id } = (req.body ?? {}) as { project_id?: unknown };

    let targetProjectId: number | null = null;
    if (project_id !== null && project_id !== undefined) {
      if (typeof project_id !== "number" || !Number.isFinite(project_id)) {
        return res.status(400).json({ error: "project_id must be a number or null" });
      }
      // The target project must exist and belong to this user.
      const proj = await db
        .select({ id: projects.id })
        .from(projects)
        .where(and(eq(projects.id, project_id), eq(projects.user_id, userId)))
        .limit(1);
      if (!proj[0]) {
        return res.status(404).json({ error: "Project not found" });
      }
      targetProjectId = project_id;
    }

    const updated = await db
      .update(experiments)
      .set({ project_id: targetProjectId, updated_at: new Date() })
      .where(and(eq(experiments.id, expId), eq(experiments.user_id, userId)))
      .returning();
    if (!updated[0]) {
      return res.status(404).json({ error: "Experiment not found" });
    }
    return res.json(updated[0]);
  } catch (err) {
    req.log.error({ err }, "Failed to assign experiment to project");
    return res.status(400).json({ error: "Failed to assign experiment to project" });
  }
});

// ── project context documents (lab notebook, protocols, notes) ──
const MAX_DOC_CHARS = 200_000;

async function userOwnsProject(projectId: number, userId: string): Promise<boolean> {
  const proj = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.user_id, userId)))
    .limit(1);
  return !!proj[0];
}

router.get("/projects/:id/documents", async (req, res) => {
  try {
    const userId = getRequestUserId(req);
    const projectId = parseInt(req.params.id, 10);
    if (!(await userOwnsProject(projectId, userId))) {
      return res.status(404).json({ error: "Project not found" });
    }
    const docs = await db
      .select({
        id: projectDocuments.id,
        name: projectDocuments.name,
        chars: sql<number>`length(${projectDocuments.content})`,
        created_at: projectDocuments.created_at,
      })
      .from(projectDocuments)
      .where(and(eq(projectDocuments.project_id, projectId), eq(projectDocuments.user_id, userId)))
      .orderBy(desc(projectDocuments.created_at));
    return res.json(docs.map((d) => ({ ...d, chars: Number(d.chars) })));
  } catch (err) {
    req.log.error({ err }, "Failed to list project documents");
    return res.status(500).json({ error: "Failed to list documents" });
  }
});

router.post("/projects/:id/documents", async (req, res) => {
  try {
    const userId = getRequestUserId(req);
    const projectId = parseInt(req.params.id, 10);
    const { name, content } = (req.body ?? {}) as { name?: unknown; content?: unknown };
    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "A document name is required" });
    }
    if (typeof content !== "string" || !content.trim()) {
      return res.status(400).json({ error: "Document content is empty" });
    }
    if (content.length > MAX_DOC_CHARS) {
      return res.status(413).json({ error: `Document too large (max ${MAX_DOC_CHARS} characters)` });
    }
    if (!(await userOwnsProject(projectId, userId))) {
      return res.status(404).json({ error: "Project not found" });
    }
    const inserted = await db
      .insert(projectDocuments)
      .values({ user_id: userId, project_id: projectId, name: name.trim(), content })
      .returning({ id: projectDocuments.id, name: projectDocuments.name, created_at: projectDocuments.created_at });
    return res.status(201).json(inserted[0]);
  } catch (err) {
    req.log.error({ err }, "Failed to add project document");
    return res.status(400).json({ error: "Failed to add project document" });
  }
});

router.delete("/project-documents/:docId", async (req, res) => {
  try {
    const userId = getRequestUserId(req);
    const docId = parseInt(req.params.docId, 10);
    const deleted = await db
      .delete(projectDocuments)
      .where(and(eq(projectDocuments.id, docId), eq(projectDocuments.user_id, userId)))
      .returning();
    if (!deleted[0]) {
      return res.status(404).json({ error: "Document not found" });
    }
    return res.status(204).send();
  } catch (err) {
    return res.status(500).json({ error: "Failed to delete document" });
  }
});

// ── delete a project (its experiments survive; project_id is set NULL by FK) ──
router.delete("/projects/:id", async (req, res) => {
  try {
    const userId = getRequestUserId(req);
    const id = parseInt(req.params.id, 10);
    const deleted = await db
      .delete(projects)
      .where(and(eq(projects.id, id), eq(projects.user_id, userId)))
      .returning();
    if (!deleted[0]) {
      return res.status(404).json({ error: "Project not found" });
    }
    return res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete project");
    return res.status(500).json({ error: "Failed to delete project" });
  }
});

export default router;
