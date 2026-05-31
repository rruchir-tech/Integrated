import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  user_id: text("user_id").notNull(),
  experiment_id: integer("experiment_id").notNull(),
  source_recommendation_index: integer("source_recommendation_index"),
  title: text("title").notNull(),
  description: text("description"),
  owner_name: text("owner_name"),
  due_date: text("due_date"),
  status: text("status").notNull().default("todo"),
  priority: text("priority").notNull().default("medium"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;