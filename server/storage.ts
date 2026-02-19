import { users, tours, tourStops, completedTours, tourProgress, stripeAccounts, purchases, tips, collaborators, tourActivityLog, type User, type InsertUser, type Tour, type InsertTour, type TourStop, type InsertTourStop, type CompletedTour, type TourProgress, type StripeAccount, type Purchase, type Tip, type Collaborator, type TourActivityLog, type UpdateUserProfile } from "@shared/schema";
import { db } from "./db";
import { eq, and, gt, sql, desc } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(insertUser: InsertUser): Promise<User>;
  updateUserProfile(id: number, updateData: Partial<Omit<User, 'id' | 'createdAt'>>): Promise<User>;
  
  // Tour methods
  getAllTours(pricing?: 'free' | 'paid'): Promise<Tour[]>;
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

  async getAllTours(pricing?: 'free' | 'paid'): Promise<Tour[]> {
    if (pricing === 'free') {
      return await db.select().from(tours).where(eq(tours.price, '0'));
    }
    if (pricing === 'paid') {
      return await db.select().from(tours).where(gt(tours.price, '0'));
    }
    return await db.select().from(tours);
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
    const toursResult = await db.select().from(tours);
    
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
}

export const storage = new DatabaseStorage();