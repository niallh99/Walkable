import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const tours = pgTable("tours", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  latitude: text("latitude").notNull(),
  longitude: text("longitude").notNull(),
  audioFileUrl: text("audio_file_url"),
  duration: integer("duration"), // in minutes
  distance: text("distance"), // e.g., "2.3 miles"
  coverImageUrl: text("cover_image_url"),
  creatorId: integer("creator_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const tourStops = pgTable("tour_stops", {
  id: serial("id").primaryKey(),
  tourId: integer("tour_id").references(() => tours.id, { onDelete: 'cascade' }).notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  latitude: text("latitude").notNull(),
  longitude: text("longitude").notNull(),
  audioFileUrl: text("audio_file_url"),
  order: integer("order").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const completedTours = pgTable("completed_tours", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  tourId: integer("tour_id").references(() => tours.id).notNull(),
  completedAt: timestamp("completed_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  email: true,
  password: true,
});

export const loginUserSchema = createInsertSchema(users).pick({
  email: true,
  password: true,
});

export const insertTourSchema = createInsertSchema(tours).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  creatorId: true,
});

export const updateUserProfileSchema = createInsertSchema(users).pick({
  username: true,
  email: true,
});

export const insertTourStopSchema = createInsertSchema(tourStops).omit({
  id: true,
  createdAt: true,
  tourId: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type LoginUser = z.infer<typeof loginUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertTour = z.infer<typeof insertTourSchema>;
export type Tour = typeof tours.$inferSelect;
export type TourStop = typeof tourStops.$inferSelect;
export type InsertTourStop = z.infer<typeof insertTourStopSchema>;
export type CompletedTour = typeof completedTours.$inferSelect;
export type UpdateUserProfile = z.infer<typeof updateUserProfileSchema>;
