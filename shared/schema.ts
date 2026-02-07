import { pgTable, text, serial, integer, boolean, timestamp, index, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  bio: text("bio"),
  profileImage: text("profile_image"),
  location: text("location"),
  role: text("role").default("explorer").notNull(), // 'explorer' | 'creator'
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
  price: numeric("price", { precision: 10, scale: 2 }).default('0').notNull(),
  currency: text("currency").default('EUR').notNull(),
  creatorId: integer("creator_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  creatorIdIdx: index("tours_creator_id_idx").on(table.creatorId),
  locationIdx: index("tours_location_idx").on(table.latitude, table.longitude),
}));

export const tourStops = pgTable("tour_stops", {
  id: serial("id").primaryKey(),
  tourId: integer("tour_id").references(() => tours.id, { onDelete: 'cascade' }).notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  latitude: text("latitude").notNull(),
  longitude: text("longitude").notNull(),
  audioFileUrl: text("audio_file_url"),
  videoFileUrl: text("video_file_url"),
  mediaType: text("media_type").default('audio'), // 'audio' | 'video'
  order: integer("order").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const tourProgress = pgTable("tour_progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  tourId: integer("tour_id").references(() => tours.id, { onDelete: 'cascade' }).notNull(),
  stopId: integer("stop_id").references(() => tourStops.id, { onDelete: 'cascade' }).notNull(),
  completedAt: timestamp("completed_at").defaultNow().notNull(),
}, (table) => ({
  userTourIdx: index("tour_progress_user_tour_idx").on(table.userId, table.tourId),
  uniqueProgress: index("tour_progress_unique_idx").on(table.userId, table.tourId, table.stopId),
}));

export const completedTours = pgTable("completed_tours", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  tourId: integer("tour_id").references(() => tours.id, { onDelete: 'cascade' }).notNull(),
  completedAt: timestamp("completed_at").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("completed_tours_user_id_idx").on(table.userId),
}));

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
  bio: true,
  profileImage: true,
  location: true,
});

export const insertTourStopSchema = createInsertSchema(tourStops).omit({
  id: true,
  createdAt: true,
  tourId: true,
});

export const userRoles = ['explorer', 'creator'] as const;
export type UserRole = typeof userRoles[number];

export const updateUserRoleSchema = z.object({
  role: z.enum(userRoles),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type LoginUser = z.infer<typeof loginUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertTour = z.infer<typeof insertTourSchema>;
export type Tour = typeof tours.$inferSelect;
export type TourStop = typeof tourStops.$inferSelect;
export type InsertTourStop = z.infer<typeof insertTourStopSchema>;
export type CompletedTour = typeof completedTours.$inferSelect;
export type TourProgress = typeof tourProgress.$inferSelect;
export type UpdateUserProfile = z.infer<typeof updateUserProfileSchema>;
