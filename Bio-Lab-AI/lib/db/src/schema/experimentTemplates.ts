import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const experimentTemplates = pgTable("experiment_templates", {
  id: serial("id").primaryKey(),
  user_id: text("user_id"),
  name: text("name").notNull(),
  assay_type: text("assay_type").notNull(),
  instrument: text("instrument").notNull().default("Synergy H1"),
  description: text("description"),
  default_notes: text("default_notes"),
  expected_columns_json: text("expected_columns_json"),
  expected_control_rule: text("expected_control_rule"),
  expected_status_default: text("expected_status_default").notNull().default("designing"),
  ai_prompt_hint: text("ai_prompt_hint"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertExperimentTemplateSchema = createInsertSchema(experimentTemplates).omit({
  id: true,
  user_id: true,
  created_at: true,
  updated_at: true,
});

export type ExperimentTemplate = typeof experimentTemplates.$inferSelect;
export type InsertExperimentTemplate = z.infer<typeof insertExperimentTemplateSchema>;