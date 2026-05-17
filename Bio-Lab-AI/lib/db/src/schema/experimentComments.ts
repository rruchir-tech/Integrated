import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const experimentComments = pgTable("experiment_comments", {
  id: serial("id").primaryKey(),
  experiment_id: integer("experiment_id").notNull(),
  comment_type: text("comment_type").notNull(),
  target_reference: text("target_reference"),
  author_name: text("author_name").notNull(),
  content: text("content").notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertExperimentCommentSchema = createInsertSchema(experimentComments).omit({
  id: true,
  created_at: true,
});

export type ExperimentComment = typeof experimentComments.$inferSelect;
export type InsertExperimentComment = z.infer<typeof insertExperimentCommentSchema>;