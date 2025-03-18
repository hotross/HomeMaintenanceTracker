import { pgTable, text, serial, integer, boolean, timestamp, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
});

export const devices = pgTable("devices", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  model: text("model"),
  location: text("location"),
  userId: integer("user_id").notNull(),
  imageUrl: text("image_url"),
  manualUrl: text("manual_url"),
  consumablesUrl: text("consumables_url"),
  purchaseDate: timestamp("purchase_date"),
  warrantyExpirationDate: timestamp("warranty_expiration_date"),
  receiptUrl: text("receipt_url"),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
});

export const consumables = pgTable("consumables", {
  id: serial("id").primaryKey(),
  deviceId: integer("device_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  storage_location: text("storage_location"),
  url: text("url"),
  cost: numeric("cost"),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
});

export const maintenanceTasks = pgTable("maintenance_tasks", {
  id: serial("id").primaryKey(),
  deviceId: integer("device_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  intervalDays: integer("interval_days").notNull(),
  lastCompleted: timestamp("last_completed"),
  isCompleted: boolean("is_completed").default(false),
  completedBy: integer("completed_by").references(() => users.id),
  completedByUsername: text("completed_by_username"),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertDeviceSchema = createInsertSchema(devices).pick({
  name: true,
  model: true,
  location: true,
  imageUrl: true,
  manualUrl: true,
  consumablesUrl: true,
  purchaseDate: true,
  warrantyExpirationDate: true,
  receiptUrl: true,
}).extend({
  // Make all fields except name optional
  model: z.string().optional(),
  location: z.string().optional(),
  imageUrl: z.string().optional(),
  manualUrl: z.string().optional(),
  consumablesUrl: z.string().optional(),
  purchaseDate: z.string().nullable(),
  warrantyExpirationDate: z.string().nullable(),
  receiptUrl: z.string().optional(),
});

export const insertConsumableSchema = createInsertSchema(consumables).pick({
  name: true,
  description: true,
  storage_location: true,
  url: true,
  cost: true,
}).extend({
  description: z.string().optional(),
  storage_location: z.string().optional(),
  url: z.string().optional(),
  cost: z.number().min(0).optional(),
});

export const insertTaskSchema = createInsertSchema(maintenanceTasks).pick({
  name: true,
  description: true,
  intervalDays: true,
}).extend({
  description: z.string().optional(),
  intervalDays: z.number().min(1, "Interval must be at least 1 day")
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Device = typeof devices.$inferSelect;
export type Consumable = typeof consumables.$inferSelect;
export type MaintenanceTask = typeof maintenanceTasks.$inferSelect;