import { users, tours, tourStops, completedTours, type User, type InsertUser, type Tour, type InsertTour, type TourStop, type InsertTourStop, type CompletedTour, type UpdateUserProfile } from "@shared/schema";
import { db } from "./db";
import { eq, and, sql } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(insertUser: InsertUser): Promise<User>;
  updateUserProfile(id: number, updateData: UpdateUserProfile): Promise<User>;
  
  // Tour methods
  getAllTours(): Promise<Tour[]>;
  getTour(id: number): Promise<Tour | undefined>;
  getTourWithStops(id: number): Promise<(Tour & { stops: TourStop[] }) | undefined>;
  createTour(insertTour: InsertTour & { creatorId: number }): Promise<Tour>;
  createTourWithStops(tourData: InsertTour & { creatorId: number }, stops: InsertTourStop[]): Promise<Tour>;
  updateTour(id: number, tourData: InsertTour & { creatorId: number }): Promise<Tour>;
  updateTourWithStops(id: number, tourData: InsertTour & { creatorId: number }, stops: InsertTourStop[]): Promise<Tour>;
  deleteTour(id: number): Promise<void>;
  getNearbyTours(lat: number, lon: number, radiusKm: number): Promise<Tour[]>;
  getToursByCreator(creatorId: number): Promise<Tour[]>;
  
  // Completed tours methods
  getCompletedToursByUser(userId: number): Promise<(CompletedTour & { tour: Tour })[]>;
  markTourAsCompleted(userId: number, tourId: number): Promise<CompletedTour>;
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

  async updateUserProfile(id: number, updateData: UpdateUserProfile): Promise<User> {
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

  async getAllTours(): Promise<Tour[]> {
    return await db.select().from(tours);
  }

  async getTour(id: number): Promise<Tour | undefined> {
    const [tour] = await db.select().from(tours).where(eq(tours.id, id));
    return tour || undefined;
  }

  async getTourWithStops(id: number): Promise<(Tour & { stops: TourStop[] }) | undefined> {
    const [tour] = await db.select().from(tours).where(eq(tours.id, id));
    if (!tour) return undefined;

    const stops = await db
      .select()
      .from(tourStops)
      .where(eq(tourStops.tourId, id))
      .orderBy(tourStops.order);

    return { ...tour, stops };
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
}

export const storage = new DatabaseStorage();