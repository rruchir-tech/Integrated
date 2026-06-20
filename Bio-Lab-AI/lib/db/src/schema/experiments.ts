import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

import { conversations } from "./conversations";
import { projects } from "./projects";

export const experiments = pgTable("experiments", {
  id: serial("id").primaryKey(),
  user_id: text("user_id").notNull(),
  name: text("name").notNull(),
  date: text("date").notNull(),
  assay_type: text("assay_type").notNull(),
  instrument: text("instrument").notNull().default("Generic"),
  notes: text("notes"),
  status: text("status").notNull().default("unknown"),
  file_name: text("file_name"),
  raw_data_json: text("raw_data_json"),
  ai_summary: text("ai_summary"),
  ai_next_experiments_json: text("ai_next_experiments_json"),
  conversation_id: integer("conversation_id").references(() => conversations.id, { onDelete: "set null" }),
  // Optional grouping into a Project (nullable = ungrouped). ON DELETE SET NULL so
  // deleting a project never deletes its experiments.
  project_id: integer("project_id").references(() => projects.id, { onDelete: "set null" }),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertExperimentSchema = createInsertSchema(experiments).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export type Experiment = typeof experiments.$inferSelect;
export type InsertExperiment = z.infer<typeof insertExperimentSchema>;
