import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

import { projects } from "./projects";

// Free-text context a researcher attaches to a project (lab-notebook entries,
// protocols, observations). The project copilot reads these as grounding.
export const projectDocuments = pgTable("project_documents", {
  id: serial("id").primaryKey(),
  user_id: text("user_id").notNull(),
  project_id: integer("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  content: text("content").notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertProjectDocumentSchema = createInsertSchema(projectDocuments).omit({
  id: true,
  created_at: true,
});

export type ProjectDocument = typeof projectDocuments.$inferSelect;
export type InsertProjectDocument = z.infer<typeof insertProjectDocumentSchema>;
