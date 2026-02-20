import { pgTable, text, serial, integer, boolean, timestamp, index, numeric, uniqueIndex } from "drizzle-orm/pg-core";
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
  previewAudioUrl: text("preview_audio_url"),
  previewVideoUrl: text("preview_video_url"),
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
  contributedBy: integer("contributed_by").references(() => users.id),
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

export const stripeAccounts = pgTable("stripe_accounts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull().unique(),
  stripeAccountId: text("stripe_account_id").notNull().unique(),
  onboardingComplete: boolean("onboarding_complete").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("stripe_accounts_user_id_idx").on(table.userId),
}));

export const purchases = pgTable("purchases", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  tourId: integer("tour_id").references(() => tours.id, { onDelete: 'cascade' }).notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull(),
  stripePaymentId: text("stripe_payment_id").notNull().unique(),
  status: text("status").default('completed').notNull(), // 'pending' | 'completed' | 'refunded'
  purchasedAt: timestamp("purchased_at").defaultNow().notNull(),
}, (table) => ({
  userTourIdx: index("purchases_user_tour_idx").on(table.userId, table.tourId),
  userIdx: index("purchases_user_id_idx").on(table.userId),
}));

export const tips = pgTable("tips", {
  id: serial("id").primaryKey(),
  fromUserId: integer("from_user_id").references(() => users.id).notNull(),
  toUserId: integer("to_user_id").references(() => users.id).notNull(),
  tourId: integer("tour_id").references(() => tours.id, { onDelete: 'cascade' }).notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull(),
  stripePaymentId: text("stripe_payment_id").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  fromUserIdx: index("tips_from_user_id_idx").on(table.fromUserId),
  toUserIdx: index("tips_to_user_id_idx").on(table.toUserId),
  tourIdx: index("tips_tour_id_idx").on(table.tourId),
}));

export const collaborators = pgTable("collaborators", {
  id: serial("id").primaryKey(),
  tourId: integer("tour_id").references(() => tours.id, { onDelete: 'cascade' }).notNull(),
  invitedUserId: integer("invited_user_id").references(() => users.id).notNull(),
  invitedByUserId: integer("invited_by_user_id").references(() => users.id).notNull(),
  role: text("role").notNull(), // 'editor' | 'viewer'
  status: text("status").default('pending').notNull(), // 'pending' | 'accepted' | 'declined'
  invitedAt: timestamp("invited_at").defaultNow().notNull(),
  respondedAt: timestamp("responded_at"),
}, (table) => ({
  tourIdx: index("collaborators_tour_id_idx").on(table.tourId),
  invitedUserIdx: index("collaborators_invited_user_id_idx").on(table.invitedUserId),
  uniqueCollab: index("collaborators_unique_idx").on(table.tourId, table.invitedUserId),
}));

export const tourActivityLog = pgTable("tour_activity_log", {
  id: serial("id").primaryKey(),
  tourId: integer("tour_id").references(() => tours.id, { onDelete: 'cascade' }).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  action: text("action").notNull(), // 'stop_added' | 'stop_updated' | 'stop_deleted' | 'tour_updated' | 'collaborator_invited' | 'collaborator_accepted'
  details: text("details"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  tourIdx: index("tour_activity_log_tour_id_idx").on(table.tourId),
}));

export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  tourId: integer("tour_id").references(() => tours.id, { onDelete: 'cascade' }).notNull(),
  rating: integer("rating").notNull(), // 1-5
  reviewText: text("review_text"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  tourIdx: index("reviews_tour_id_idx").on(table.tourId),
  userIdx: index("reviews_user_id_idx").on(table.userId),
  uniqueReview: uniqueIndex("reviews_unique_idx").on(table.userId, table.tourId),
}));

export const followers = pgTable("followers", {
  id: serial("id").primaryKey(),
  followerId: integer("follower_id").references(() => users.id).notNull(),
  followedId: integer("followed_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  followerIdx: index("followers_follower_id_idx").on(table.followerId),
  followedIdx: index("followers_followed_id_idx").on(table.followedId),
  uniqueFollow: uniqueIndex("followers_unique_idx").on(table.followerId, table.followedId),
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
  contributedBy: true,
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
export type StripeAccount = typeof stripeAccounts.$inferSelect;
export type Purchase = typeof purchases.$inferSelect;
export type Tip = typeof tips.$inferSelect;
export type Collaborator = typeof collaborators.$inferSelect;
export type TourActivityLog = typeof tourActivityLog.$inferSelect;
export type Review = typeof reviews.$inferSelect;
export type Follower = typeof followers.$inferSelect;
export type UpdateUserProfile = z.infer<typeof updateUserProfileSchema>;
