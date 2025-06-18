import { users, tours, type User, type InsertUser, type Tour, type InsertTour } from "@shared/schema";
import { db } from "./db";
import { eq, and, sql } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(insertUser: InsertUser): Promise<User>;
  
  // Tour methods
  getAllTours(): Promise<Tour[]>;
  getTour(id: number): Promise<Tour | undefined>;
  createTour(insertTour: InsertTour & { creatorId: number }): Promise<Tour>;
  getNearbyTours(lat: number, lon: number, radiusKm: number): Promise<Tour[]>;
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

  async getAllTours(): Promise<Tour[]> {
    return await db.select().from(tours);
  }

  async getTour(id: number): Promise<Tour | undefined> {
    const [tour] = await db.select().from(tours).where(eq(tours.id, id));
    return tour || undefined;
  }

  async createTour(tourData: InsertTour & { creatorId: number }): Promise<Tour> {
    const [tour] = await db
      .insert(tours)
      .values(tourData)
      .returning();
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
}

export const storage = new DatabaseStorage();