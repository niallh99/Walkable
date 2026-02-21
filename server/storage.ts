import { users, tours, tourStops, completedTours, tourProgress, stripeAccounts, purchases, tips, collaborators, tourActivityLog, followers, reviews, categories, tourTags, tourViews, passwordResetTokens, type User, type InsertUser, type Tour, type InsertTour, type TourStop, type InsertTourStop, type CompletedTour, type TourProgress, type StripeAccount, type Purchase, type Tip, type Collaborator, type TourActivityLog, type Follower, type Review, type Category, type TourTag, type TourView, type PasswordResetToken, type UpdateUserProfile } from "@shared/schema";
import { db } from "./db";
import { eq, and, gt, gte, lte, sql, desc, inArray, avg, ilike, count, sum } from "drizzle-orm";

export interface TourFilters {
  pricing?: 'free' | 'paid';
  category?: string;
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  minDuration?: number;
  maxDuration?: number;
}

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(insertUser: InsertUser): Promise<User>;
  updateUserProfile(id: number, updateData: Partial<Omit<User, 'id' | 'createdAt'>>): Promise<User>;
  
  // Tour methods
  getAllTours(filters?: TourFilters): Promise<Tour[]>;
  getTour(id: number): Promise<Tour | undefined>;
  getTourWithStops(id: number): Promise<(Tour & { stops: TourStop[]; collaborators: (Collaborator & { user: { id: number; username: string; profileImage: string | null } })[] }) | undefined>;
  createTour(insertTour: InsertTour & { creatorId: number }): Promise<Tour>;
  createTourWithStops(tourData: InsertTour & { creatorId: number }, stops: InsertTourStop[]): Promise<Tour>;
  updateTour(id: number, tourData: InsertTour & { creatorId: number }): Promise<Tour>;
  updateTourWithStops(id: number, tourData: InsertTour & { creatorId: number }, stops: InsertTourStop[]): Promise<Tour>;
  deleteTour(id: number): Promise<void>;
  updateTourFields(id: number, fields: Partial<Omit<Tour, 'id' | 'createdAt'>>): Promise<Tour>;
  getNearbyTours(lat: number, lon: number, radiusKm: number): Promise<Tour[]>;
  getToursByCreator(creatorId: number): Promise<Tour[]>;
  
  // Tour progress methods
  markStopCompleted(userId: number, tourId: number, stopId: number): Promise<TourProgress>;
  getTourProgress(userId: number, tourId: number): Promise<TourProgress[]>;

  // Stripe account methods
  getStripeAccount(userId: number): Promise<StripeAccount | undefined>;
  getStripeAccountByStripeId(stripeAccountId: string): Promise<StripeAccount | undefined>;
  createStripeAccount(userId: number, stripeAccountId: string): Promise<StripeAccount>;
  updateStripeAccountOnboarding(userId: number, complete: boolean): Promise<StripeAccount>;

  // Purchase methods
  createPurchase(userId: number, tourId: number, amount: string, currency: string, stripePaymentId: string): Promise<Purchase>;
  getPurchase(userId: number, tourId: number): Promise<Purchase | undefined>;
  getPurchaseByPaymentId(stripePaymentId: string): Promise<Purchase | undefined>;

  // Completed tours methods
  getCompletedToursByUser(userId: number): Promise<(CompletedTour & { tour: Tour })[]>;
  markTourAsCompleted(userId: number, tourId: number): Promise<CompletedTour>;
  isTourCompleted(userId: number, tourId: number): Promise<boolean>;

  // Tip methods
  createTip(fromUserId: number, toUserId: number, tourId: number, amount: string, currency: string, stripePaymentId: string): Promise<Tip>;
  getTipByPaymentId(stripePaymentId: string): Promise<Tip | undefined>;
  getTotalTipsForCreator(creatorId: number): Promise<{ count: number; totalAmount: string }>;

  // Stop CRUD methods
  addStopToTour(tourId: number, stop: InsertTourStop, contributedBy: number): Promise<TourStop>;
  updateStop(stopId: number, data: Partial<Omit<TourStop, 'id' | 'tourId' | 'createdAt'>>): Promise<TourStop>;
  deleteStop(stopId: number): Promise<void>;
  getStop(stopId: number): Promise<TourStop | undefined>;

  // Activity log methods
  createActivityLog(tourId: number, userId: number, action: string, details?: string): Promise<TourActivityLog>;
  getActivityLogByTour(tourId: number): Promise<(TourActivityLog & { user: { id: number; username: string } })[]>;

  // Collaborator methods
  createCollaborator(tourId: number, invitedUserId: number, invitedByUserId: number, role: string): Promise<Collaborator>;
  getCollaborator(tourId: number, userId: number): Promise<Collaborator | undefined>;
  getCollaboratorById(id: number): Promise<Collaborator | undefined>;
  getCollaboratorsByTour(tourId: number): Promise<(Collaborator & { user: { id: number; username: string; profileImage: string | null } })[]>;
  getPendingInvitations(userId: number): Promise<(Collaborator & { tour: Tour; invitedBy: { id: number; username: string } })[]>;
  updateCollaboratorStatus(id: number, status: string): Promise<Collaborator>;

  // Review methods
  createReview(userId: number, tourId: number, rating: number, reviewText?: string): Promise<Review>;
  getReview(userId: number, tourId: number): Promise<Review | undefined>;
  getReviewsByTour(tourId: number, limit: number, offset: number): Promise<(Review & { user: { id: number; username: string; profileImage: string | null } })[]>;
  deleteReview(userId: number, tourId: number): Promise<void>;
  getTourRatingStats(tourId: number): Promise<{ averageRating: number; reviewCount: number }>;
  getBulkTourRatingStats(tourIds: number[]): Promise<Map<number, { averageRating: number; reviewCount: number }>>;

  // Follower methods
  followUser(followerId: number, followedId: number): Promise<Follower>;
  unfollowUser(followerId: number, followedId: number): Promise<void>;
  isFollowing(followerId: number, followedId: number): Promise<boolean>;
  getFollowers(userId: number): Promise<{ id: number; username: string; profileImage: string | null }[]>;
  getFollowing(userId: number): Promise<{ id: number; username: string; profileImage: string | null }[]>;
  getFollowerCount(userId: number): Promise<number>;
  getFollowingCount(userId: number): Promise<number>;
  getFeedTours(userId: number): Promise<Tour[]>;

  // Category/tag methods
  getAllCategories(): Promise<Category[]>;
  getCategoriesWithCounts(): Promise<(Category & { tourCount: number })[]>;
  addTourTag(tourId: number, categoryId: number): Promise<TourTag>;
  removeTourTag(tourId: number, categoryId: number): Promise<void>;
  getTagsForTour(tourId: number): Promise<Category[]>;
  getBulkTourTags(tourIds: number[]): Promise<Map<number, Category[]>>;
  seedCategories(): Promise<void>;

  // Tour view / analytics methods
  recordTourView(tourId: number, viewerUserId?: number): Promise<TourView>;
  getAnalyticsOverview(creatorId: number): Promise<{ totalViews: number; totalCompletions: number; totalEarnings: string; totalTours: number }>;
  getAnalyticsByTour(creatorId: number): Promise<{ tourId: number; title: string; views: number; completions: number; earnings: string; averageRating: number; reviewCount: number }[]>;

  // Password reset methods
  createPasswordResetToken(userId: number, token: string, expiresAt: Date): Promise<PasswordResetToken>;
  getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined>;
  markTokenUsed(tokenId: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUserProfile(id: number, updateData: Partial<Omit<User, 'id' | 'createdAt'>>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async getAllTours(filters?: TourFilters): Promise<Tour[]> {
    const conditions: any[] = [eq(tours.status, 'published')];

    if (filters?.pricing === 'free') {
      conditions.push(eq(tours.price, '0'));
    } else if (filters?.pricing === 'paid') {
      conditions.push(gt(tours.price, '0'));
    }

    if (filters?.minPrice !== undefined) {
      conditions.push(gte(tours.price, String(filters.minPrice)));
    }
    if (filters?.maxPrice !== undefined) {
      conditions.push(lte(tours.price, String(filters.maxPrice)));
    }

    if (filters?.city) {
      conditions.push(ilike(tours.city, `%${filters.city}%`));
    }

    if (filters?.minDuration !== undefined) {
      conditions.push(gte(tours.duration, filters.minDuration));
    }
    if (filters?.maxDuration !== undefined) {
      conditions.push(lte(tours.duration, filters.maxDuration));
    }

    if (filters?.category) {
      // Filter by category slug via tourTags junction
      const matchingTourIds = db
        .select({ tourId: tourTags.tourId })
        .from(tourTags)
        .innerJoin(categories, eq(tourTags.categoryId, categories.id))
        .where(eq(categories.slug, filters.category));
      conditions.push(inArray(tours.id, matchingTourIds));
    }

    if (filters?.minRating !== undefined) {
      // Filter tours with avg rating >= minRating
      const qualifyingTourIds = db
        .select({ tourId: reviews.tourId })
        .from(reviews)
        .groupBy(reviews.tourId)
        .having(gte(sql`avg(${reviews.rating})`, filters.minRating));
      conditions.push(inArray(tours.id, qualifyingTourIds));
    }

    return await db.select().from(tours).where(and(...conditions));
  }

  async getTour(id: number): Promise<Tour | undefined> {
    const [tour] = await db.select().from(tours).where(eq(tours.id, id));
    return tour || undefined;
  }

  async getTourWithStops(id: number): Promise<(Tour & { stops: TourStop[]; collaborators: (Collaborator & { user: { id: number; username: string; profileImage: string | null } })[] }) | undefined> {
    const [tour] = await db.select().from(tours).where(eq(tours.id, id));
    if (!tour) return undefined;

    const stops = await db
      .select()
      .from(tourStops)
      .where(eq(tourStops.tourId, id))
      .orderBy(tourStops.order);

    const collabs = await this.getCollaboratorsByTour(id);

    return { ...tour, stops, collaborators: collabs };
  }

  async createTour(tourData: InsertTour & { creatorId: number }): Promise<Tour> {
    const [tour] = await db
      .insert(tours)
      .values(tourData)
      .returning();
    return tour;
  }

  async createTourWithStops(tourData: InsertTour & { creatorId: number }, stops: InsertTourStop[]): Promise<Tour> {
    const [tour] = await db
      .insert(tours)
      .values(tourData)
      .returning();

    if (stops.length > 0) {
      const stopsWithTourId = stops.map(stop => ({
        ...stop,
        tourId: tour.id,
      }));

      await db.insert(tourStops).values(stopsWithTourId);
    }

    return tour;
  }

  async getNearbyTours(lat: number, lon: number, radiusKm: number): Promise<Tour[]> {
    // Simple distance calculation using Haversine formula
    // For production, consider using PostGIS for more accurate geospatial queries
    const toursResult = await db.select().from(tours).where(eq(tours.status, 'published'));
    
    return toursResult.filter(tour => {
      const tourLat = parseFloat(tour.latitude);
      const tourLon = parseFloat(tour.longitude);
      
      const R = 6371; // Earth's radius in kilometers
      const dLat = (tourLat - lat) * Math.PI / 180;
      const dLon = (tourLon - lon) * Math.PI / 180;
      const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat * Math.PI / 180) * Math.cos(tourLat * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distance = R * c;
      
      return distance <= radiusKm;
    });
  }

  async getToursByCreator(creatorId: number): Promise<Tour[]> {
    const creatorTours = await db.select().from(tours).where(eq(tours.creatorId, creatorId));
    return creatorTours;
  }

  async updateTourFields(id: number, fields: Partial<Omit<Tour, 'id' | 'createdAt'>>): Promise<Tour> {
    const [updated] = await db
      .update(tours)
      .set({ ...fields, updatedAt: new Date() })
      .where(eq(tours.id, id))
      .returning();
    return updated;
  }

  async getStripeAccount(userId: number): Promise<StripeAccount | undefined> {
    const [account] = await db.select().from(stripeAccounts).where(eq(stripeAccounts.userId, userId));
    return account || undefined;
  }

  async getStripeAccountByStripeId(stripeAccountId: string): Promise<StripeAccount | undefined> {
    const [account] = await db.select().from(stripeAccounts).where(eq(stripeAccounts.stripeAccountId, stripeAccountId));
    return account || undefined;
  }

  async createStripeAccount(userId: number, stripeAccountId: string): Promise<StripeAccount> {
    const [account] = await db
      .insert(stripeAccounts)
      .values({ userId, stripeAccountId })
      .returning();
    return account;
  }

  async updateStripeAccountOnboarding(userId: number, complete: boolean): Promise<StripeAccount> {
    const [account] = await db
      .update(stripeAccounts)
      .set({ onboardingComplete: complete, updatedAt: new Date() })
      .where(eq(stripeAccounts.userId, userId))
      .returning();
    return account;
  }

  async createPurchase(userId: number, tourId: number, amount: string, currency: string, stripePaymentId: string): Promise<Purchase> {
    const [purchase] = await db
      .insert(purchases)
      .values({ userId, tourId, amount, currency, stripePaymentId, status: 'completed' })
      .returning();
    return purchase;
  }

  async getPurchase(userId: number, tourId: number): Promise<Purchase | undefined> {
    const [purchase] = await db
      .select()
      .from(purchases)
      .where(and(eq(purchases.userId, userId), eq(purchases.tourId, tourId), eq(purchases.status, 'completed')));
    return purchase || undefined;
  }

  async getPurchaseByPaymentId(stripePaymentId: string): Promise<Purchase | undefined> {
    const [purchase] = await db
      .select()
      .from(purchases)
      .where(eq(purchases.stripePaymentId, stripePaymentId));
    return purchase || undefined;
  }

  async getCompletedToursByUser(userId: number): Promise<(CompletedTour & { tour: Tour })[]> {
    const result = await db
      .select({
        id: completedTours.id,
        userId: completedTours.userId,
        tourId: completedTours.tourId,
        completedAt: completedTours.completedAt,
        tour: tours,
      })
      .from(completedTours)
      .innerJoin(tours, eq(completedTours.tourId, tours.id))
      .where(eq(completedTours.userId, userId));
    
    return result;
  }

  async markStopCompleted(userId: number, tourId: number, stopId: number): Promise<TourProgress> {
    // Check if already marked
    const [existing] = await db
      .select()
      .from(tourProgress)
      .where(
        and(
          eq(tourProgress.userId, userId),
          eq(tourProgress.tourId, tourId),
          eq(tourProgress.stopId, stopId)
        )
      );
    if (existing) return existing;

    const [progress] = await db
      .insert(tourProgress)
      .values({ userId, tourId, stopId })
      .returning();

    // Check if all stops are now completed — auto-complete tour
    const allStops = await db
      .select()
      .from(tourStops)
      .where(eq(tourStops.tourId, tourId));

    const completedStops = await db
      .select()
      .from(tourProgress)
      .where(
        and(
          eq(tourProgress.userId, userId),
          eq(tourProgress.tourId, tourId)
        )
      );

    if (allStops.length > 0 && completedStops.length >= allStops.length) {
      const alreadyCompleted = await this.isTourCompleted(userId, tourId);
      if (!alreadyCompleted) {
        await this.markTourAsCompleted(userId, tourId);
      }
    }

    return progress;
  }

  async getTourProgress(userId: number, tourId: number): Promise<TourProgress[]> {
    return await db
      .select()
      .from(tourProgress)
      .where(
        and(
          eq(tourProgress.userId, userId),
          eq(tourProgress.tourId, tourId)
        )
      );
  }

  async isTourCompleted(userId: number, tourId: number): Promise<boolean> {
    const [existing] = await db
      .select()
      .from(completedTours)
      .where(
        and(
          eq(completedTours.userId, userId),
          eq(completedTours.tourId, tourId)
        )
      );
    return !!existing;
  }

  async markTourAsCompleted(userId: number, tourId: number): Promise<CompletedTour> {
    const [completedTour] = await db
      .insert(completedTours)
      .values({
        userId,
        tourId,
      })
      .returning();
    return completedTour;
  }

  async updateTour(id: number, tourData: InsertTour & { creatorId: number }): Promise<Tour> {
    const [updatedTour] = await db
      .update(tours)
      .set({
        ...tourData,
        updatedAt: new Date(),
      })
      .where(eq(tours.id, id))
      .returning();
    return updatedTour;
  }

  async updateTourWithStops(id: number, tourData: InsertTour & { creatorId: number }, stops: InsertTourStop[]): Promise<Tour> {
    // Update the tour
    const [updatedTour] = await db
      .update(tours)
      .set({
        ...tourData,
        updatedAt: new Date(),
      })
      .where(eq(tours.id, id))
      .returning();

    // Delete existing stops and insert new ones
    await db.delete(tourStops).where(eq(tourStops.tourId, id));
    
    if (stops.length > 0) {
      const stopsWithTourId = stops.map(stop => ({
        ...stop,
        tourId: id,
      }));
      await db.insert(tourStops).values(stopsWithTourId);
    }

    return updatedTour;
  }

  async deleteTour(id: number): Promise<void> {
    // Delete tour stops first (foreign key constraint)
    await db.delete(tourStops).where(eq(tourStops.tourId, id));

    // Delete the tour
    await db.delete(tours).where(eq(tours.id, id));
  }

  async createTip(fromUserId: number, toUserId: number, tourId: number, amount: string, currency: string, stripePaymentId: string): Promise<Tip> {
    const [tip] = await db
      .insert(tips)
      .values({ fromUserId, toUserId, tourId, amount, currency, stripePaymentId })
      .returning();
    return tip;
  }

  async getTipByPaymentId(stripePaymentId: string): Promise<Tip | undefined> {
    const [tip] = await db
      .select()
      .from(tips)
      .where(eq(tips.stripePaymentId, stripePaymentId));
    return tip || undefined;
  }

  async getTotalTipsForCreator(creatorId: number): Promise<{ count: number; totalAmount: string }> {
    const [result] = await db
      .select({
        count: sql<number>`cast(count(*) as integer)`,
        totalAmount: sql<string>`coalesce(sum(${tips.amount}), '0')`,
      })
      .from(tips)
      .where(eq(tips.toUserId, creatorId));
    return result || { count: 0, totalAmount: '0' };
  }

  async addStopToTour(tourId: number, stop: InsertTourStop, contributedBy: number): Promise<TourStop> {
    const [newStop] = await db
      .insert(tourStops)
      .values({ ...stop, tourId, contributedBy })
      .returning();
    return newStop;
  }

  async updateStop(stopId: number, data: Partial<Omit<TourStop, 'id' | 'tourId' | 'createdAt'>>): Promise<TourStop> {
    const [updated] = await db
      .update(tourStops)
      .set(data)
      .where(eq(tourStops.id, stopId))
      .returning();
    return updated;
  }

  async deleteStop(stopId: number): Promise<void> {
    await db.delete(tourStops).where(eq(tourStops.id, stopId));
  }

  async getStop(stopId: number): Promise<TourStop | undefined> {
    const [stop] = await db.select().from(tourStops).where(eq(tourStops.id, stopId));
    return stop || undefined;
  }

  async createActivityLog(tourId: number, userId: number, action: string, details?: string): Promise<TourActivityLog> {
    const [log] = await db
      .insert(tourActivityLog)
      .values({ tourId, userId, action, details: details || null })
      .returning();
    return log;
  }

  async getActivityLogByTour(tourId: number): Promise<(TourActivityLog & { user: { id: number; username: string } })[]> {
    const results = await db
      .select({
        id: tourActivityLog.id,
        tourId: tourActivityLog.tourId,
        userId: tourActivityLog.userId,
        action: tourActivityLog.action,
        details: tourActivityLog.details,
        createdAt: tourActivityLog.createdAt,
        user: {
          id: users.id,
          username: users.username,
        },
      })
      .from(tourActivityLog)
      .innerJoin(users, eq(tourActivityLog.userId, users.id))
      .where(eq(tourActivityLog.tourId, tourId))
      .orderBy(desc(tourActivityLog.createdAt));
    return results;
  }

  async createCollaborator(tourId: number, invitedUserId: number, invitedByUserId: number, role: string): Promise<Collaborator> {
    const [collab] = await db
      .insert(collaborators)
      .values({ tourId, invitedUserId, invitedByUserId, role })
      .returning();
    return collab;
  }

  async getCollaborator(tourId: number, userId: number): Promise<Collaborator | undefined> {
    const [collab] = await db
      .select()
      .from(collaborators)
      .where(and(eq(collaborators.tourId, tourId), eq(collaborators.invitedUserId, userId)));
    return collab || undefined;
  }

  async getCollaboratorById(id: number): Promise<Collaborator | undefined> {
    const [collab] = await db
      .select()
      .from(collaborators)
      .where(eq(collaborators.id, id));
    return collab || undefined;
  }

  async getCollaboratorsByTour(tourId: number): Promise<(Collaborator & { user: { id: number; username: string; profileImage: string | null } })[]> {
    const results = await db
      .select({
        id: collaborators.id,
        tourId: collaborators.tourId,
        invitedUserId: collaborators.invitedUserId,
        invitedByUserId: collaborators.invitedByUserId,
        role: collaborators.role,
        status: collaborators.status,
        invitedAt: collaborators.invitedAt,
        respondedAt: collaborators.respondedAt,
        user: {
          id: users.id,
          username: users.username,
          profileImage: users.profileImage,
        },
      })
      .from(collaborators)
      .innerJoin(users, eq(collaborators.invitedUserId, users.id))
      .where(eq(collaborators.tourId, tourId));
    return results;
  }

  async getPendingInvitations(userId: number): Promise<(Collaborator & { tour: Tour; invitedBy: { id: number; username: string } })[]> {
    const invitedByUser = db.$with('invited_by_user').as(
      db.select({ id: users.id, username: users.username }).from(users)
    );

    const results = await db
      .select({
        id: collaborators.id,
        tourId: collaborators.tourId,
        invitedUserId: collaborators.invitedUserId,
        invitedByUserId: collaborators.invitedByUserId,
        role: collaborators.role,
        status: collaborators.status,
        invitedAt: collaborators.invitedAt,
        respondedAt: collaborators.respondedAt,
        tour: tours,
        invitedBy: {
          id: users.id,
          username: users.username,
        },
      })
      .from(collaborators)
      .innerJoin(tours, eq(collaborators.tourId, tours.id))
      .innerJoin(users, eq(collaborators.invitedByUserId, users.id))
      .where(and(eq(collaborators.invitedUserId, userId), eq(collaborators.status, 'pending')));
    return results;
  }

  async updateCollaboratorStatus(id: number, status: string): Promise<Collaborator> {
    const [collab] = await db
      .update(collaborators)
      .set({ status, respondedAt: new Date() })
      .where(eq(collaborators.id, id))
      .returning();
    return collab;
  }

  async createReview(userId: number, tourId: number, rating: number, reviewText?: string): Promise<Review> {
    const [review] = await db
      .insert(reviews)
      .values({ userId, tourId, rating, reviewText: reviewText || null })
      .returning();
    return review;
  }

  async getReview(userId: number, tourId: number): Promise<Review | undefined> {
    const [review] = await db
      .select()
      .from(reviews)
      .where(and(eq(reviews.userId, userId), eq(reviews.tourId, tourId)));
    return review || undefined;
  }

  async getReviewsByTour(tourId: number, limit: number, offset: number): Promise<(Review & { user: { id: number; username: string; profileImage: string | null } })[]> {
    const results = await db
      .select({
        id: reviews.id,
        userId: reviews.userId,
        tourId: reviews.tourId,
        rating: reviews.rating,
        reviewText: reviews.reviewText,
        createdAt: reviews.createdAt,
        user: {
          id: users.id,
          username: users.username,
          profileImage: users.profileImage,
        },
      })
      .from(reviews)
      .innerJoin(users, eq(reviews.userId, users.id))
      .where(eq(reviews.tourId, tourId))
      .orderBy(desc(reviews.createdAt))
      .limit(limit)
      .offset(offset);
    return results;
  }

  async deleteReview(userId: number, tourId: number): Promise<void> {
    await db
      .delete(reviews)
      .where(and(eq(reviews.userId, userId), eq(reviews.tourId, tourId)));
  }

  async getTourRatingStats(tourId: number): Promise<{ averageRating: number; reviewCount: number }> {
    const [result] = await db
      .select({
        averageRating: sql<string>`coalesce(avg(${reviews.rating}), '0')`,
        reviewCount: sql<number>`cast(count(*) as integer)`,
      })
      .from(reviews)
      .where(eq(reviews.tourId, tourId));
    return {
      averageRating: parseFloat(result?.averageRating || '0'),
      reviewCount: result?.reviewCount || 0,
    };
  }

  async getBulkTourRatingStats(tourIds: number[]): Promise<Map<number, { averageRating: number; reviewCount: number }>> {
    const map = new Map<number, { averageRating: number; reviewCount: number }>();
    if (tourIds.length === 0) return map;

    const results = await db
      .select({
        tourId: reviews.tourId,
        averageRating: sql<string>`coalesce(avg(${reviews.rating}), '0')`,
        reviewCount: sql<number>`cast(count(*) as integer)`,
      })
      .from(reviews)
      .where(inArray(reviews.tourId, tourIds))
      .groupBy(reviews.tourId);

    for (const row of results) {
      map.set(row.tourId, {
        averageRating: parseFloat(row.averageRating || '0'),
        reviewCount: row.reviewCount || 0,
      });
    }
    return map;
  }

  async followUser(followerId: number, followedId: number): Promise<Follower> {
    const [follow] = await db
      .insert(followers)
      .values({ followerId, followedId })
      .returning();
    return follow;
  }

  async unfollowUser(followerId: number, followedId: number): Promise<void> {
    await db
      .delete(followers)
      .where(and(eq(followers.followerId, followerId), eq(followers.followedId, followedId)));
  }

  async isFollowing(followerId: number, followedId: number): Promise<boolean> {
    const [existing] = await db
      .select()
      .from(followers)
      .where(and(eq(followers.followerId, followerId), eq(followers.followedId, followedId)));
    return !!existing;
  }

  async getFollowers(userId: number): Promise<{ id: number; username: string; profileImage: string | null }[]> {
    const results = await db
      .select({
        id: users.id,
        username: users.username,
        profileImage: users.profileImage,
      })
      .from(followers)
      .innerJoin(users, eq(followers.followerId, users.id))
      .where(eq(followers.followedId, userId));
    return results;
  }

  async getFollowing(userId: number): Promise<{ id: number; username: string; profileImage: string | null }[]> {
    const results = await db
      .select({
        id: users.id,
        username: users.username,
        profileImage: users.profileImage,
      })
      .from(followers)
      .innerJoin(users, eq(followers.followedId, users.id))
      .where(eq(followers.followerId, userId));
    return results;
  }

  async getFollowerCount(userId: number): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(followers)
      .where(eq(followers.followedId, userId));
    return result?.count || 0;
  }

  async getFollowingCount(userId: number): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(followers)
      .where(eq(followers.followerId, userId));
    return result?.count || 0;
  }

  async getFeedTours(userId: number): Promise<Tour[]> {
    // Get IDs of users this user follows
    const followedUsers = await db
      .select({ id: followers.followedId })
      .from(followers)
      .where(eq(followers.followerId, userId));

    if (followedUsers.length === 0) return [];

    const followedIds = followedUsers.map(f => f.id);
    const feedTours = await db
      .select()
      .from(tours)
      .where(and(inArray(tours.creatorId, followedIds), eq(tours.status, 'published')))
      .orderBy(desc(tours.createdAt));
    return feedTours;
  }

  async getAllCategories(): Promise<Category[]> {
    return await db.select().from(categories).orderBy(categories.name);
  }

  async getCategoriesWithCounts(): Promise<(Category & { tourCount: number })[]> {
    const results = await db
      .select({
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
        tourCount: sql<number>`cast(count(${tourTags.tourId}) as integer)`,
      })
      .from(categories)
      .leftJoin(tourTags, eq(categories.id, tourTags.categoryId))
      .groupBy(categories.id, categories.name, categories.slug)
      .orderBy(categories.name);
    return results;
  }

  async addTourTag(tourId: number, categoryId: number): Promise<TourTag> {
    const [tag] = await db
      .insert(tourTags)
      .values({ tourId, categoryId })
      .returning();
    return tag;
  }

  async removeTourTag(tourId: number, categoryId: number): Promise<void> {
    await db
      .delete(tourTags)
      .where(and(eq(tourTags.tourId, tourId), eq(tourTags.categoryId, categoryId)));
  }

  async getTagsForTour(tourId: number): Promise<Category[]> {
    const results = await db
      .select({
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
      })
      .from(tourTags)
      .innerJoin(categories, eq(tourTags.categoryId, categories.id))
      .where(eq(tourTags.tourId, tourId));
    return results;
  }

  async getBulkTourTags(tourIds: number[]): Promise<Map<number, Category[]>> {
    const map = new Map<number, Category[]>();
    if (tourIds.length === 0) return map;

    const results = await db
      .select({
        tourId: tourTags.tourId,
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
      })
      .from(tourTags)
      .innerJoin(categories, eq(tourTags.categoryId, categories.id))
      .where(inArray(tourTags.tourId, tourIds));

    for (const row of results) {
      const existing = map.get(row.tourId) || [];
      existing.push({ id: row.id, name: row.name, slug: row.slug });
      map.set(row.tourId, existing);
    }
    return map;
  }

  // Tour view / analytics methods
  async recordTourView(tourId: number, viewerUserId?: number): Promise<TourView> {
    const [view] = await db.insert(tourViews).values({
      tourId,
      viewerUserId: viewerUserId || null,
    }).returning();
    return view;
  }

  async getAnalyticsOverview(creatorId: number): Promise<{ totalViews: number; totalCompletions: number; totalEarnings: string; totalTours: number }> {
    // Get creator's tour IDs
    const creatorTours = await db.select({ id: tours.id }).from(tours).where(eq(tours.creatorId, creatorId));
    const tourIds = creatorTours.map(t => t.id);

    if (tourIds.length === 0) {
      return { totalViews: 0, totalCompletions: 0, totalEarnings: '0', totalTours: 0 };
    }

    const [viewsResult] = await db
      .select({ total: count() })
      .from(tourViews)
      .where(inArray(tourViews.tourId, tourIds));

    const [completionsResult] = await db
      .select({ total: count() })
      .from(completedTours)
      .where(inArray(completedTours.tourId, tourIds));

    const [purchaseEarnings] = await db
      .select({ total: sum(purchases.amount) })
      .from(purchases)
      .where(and(inArray(purchases.tourId, tourIds), eq(purchases.status, 'completed')));

    const [tipEarnings] = await db
      .select({ total: sum(tips.amount) })
      .from(tips)
      .where(eq(tips.toUserId, creatorId));

    const purchaseTotal = parseFloat(purchaseEarnings?.total || '0');
    const tipTotal = parseFloat(tipEarnings?.total || '0');

    return {
      totalViews: viewsResult?.total || 0,
      totalCompletions: completionsResult?.total || 0,
      totalEarnings: (purchaseTotal + tipTotal).toFixed(2),
      totalTours: tourIds.length,
    };
  }

  async getAnalyticsByTour(creatorId: number): Promise<{ tourId: number; title: string; views: number; completions: number; earnings: string; averageRating: number; reviewCount: number }[]> {
    const creatorTours = await db.select().from(tours).where(eq(tours.creatorId, creatorId));

    if (creatorTours.length === 0) return [];

    const tourIds = creatorTours.map(t => t.id);

    // Bulk fetch all stats
    const viewCounts = await db
      .select({ tourId: tourViews.tourId, views: count() })
      .from(tourViews)
      .where(inArray(tourViews.tourId, tourIds))
      .groupBy(tourViews.tourId);

    const completionCounts = await db
      .select({ tourId: completedTours.tourId, completions: count() })
      .from(completedTours)
      .where(inArray(completedTours.tourId, tourIds))
      .groupBy(completedTours.tourId);

    const earningsData = await db
      .select({ tourId: purchases.tourId, total: sum(purchases.amount) })
      .from(purchases)
      .where(and(inArray(purchases.tourId, tourIds), eq(purchases.status, 'completed')))
      .groupBy(purchases.tourId);

    const ratingsMap = await this.getBulkTourRatingStats(tourIds);

    const viewsMap = new Map(viewCounts.map(v => [v.tourId, v.views]));
    const completionsMap = new Map(completionCounts.map(c => [c.tourId, c.completions]));
    const earningsMap = new Map(earningsData.map(e => [e.tourId, e.total || '0']));

    return creatorTours.map(tour => ({
      tourId: tour.id,
      title: tour.title,
      views: viewsMap.get(tour.id) || 0,
      completions: completionsMap.get(tour.id) || 0,
      earnings: earningsMap.get(tour.id) || '0',
      averageRating: ratingsMap.get(tour.id)?.averageRating || 0,
      reviewCount: ratingsMap.get(tour.id)?.reviewCount || 0,
    }));
  }

  // Password reset methods
  async createPasswordResetToken(userId: number, token: string, expiresAt: Date): Promise<PasswordResetToken> {
    const [resetToken] = await db.insert(passwordResetTokens).values({
      userId,
      token,
      expiresAt,
    }).returning();
    return resetToken;
  }

  async getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined> {
    const [result] = await db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.token, token));
    return result || undefined;
  }

  async markTokenUsed(tokenId: number): Promise<void> {
    await db.update(passwordResetTokens)
      .set({ used: true })
      .where(eq(passwordResetTokens.id, tokenId));
  }

  async seedCategories(): Promise<void> {
    const seedData = [
      { name: 'History', slug: 'history' },
      { name: 'Food', slug: 'food' },
      { name: 'Architecture', slug: 'architecture' },
      { name: 'Nature', slug: 'nature' },
      { name: 'Hidden Gems', slug: 'hidden-gems' },
      { name: 'Nightlife', slug: 'nightlife' },
      { name: 'Art', slug: 'art' },
      { name: 'Music', slug: 'music' },
      { name: 'Photography', slug: 'photography' },
    ];

    for (const cat of seedData) {
      const [existing] = await db
        .select()
        .from(categories)
        .where(eq(categories.slug, cat.slug));
      if (!existing) {
        await db.insert(categories).values(cat);
      }
    }
  }
}

export const storage = new DatabaseStorage();