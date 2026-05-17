import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const recommendationActions = pgTable("recommendation_actions", {
  id: serial("id").primaryKey(),
  experiment_id: integer("experiment_id").notNull(),
  recommendation_index: integer("recommendation_index").notNull(),
  recommendation_title: text("recommendation_title").notNull(),
  original_recommendation_json: text("original_recommendation_json").notNull(),
  edited_recommendation_json: text("edited_recommendation_json"),
  action_status: text("action_status").notNull().default("pending"),
  reviewer_name: text("reviewer_name"),
  reviewer_note: text("reviewer_note"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertRecommendationActionSchema = createInsertSchema(recommendationActions).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export type RecommendationAction = typeof recommendationActions.$inferSelect;
export type InsertRecommendationAction = z.infer<typeof insertRecommendationActionSchema>;