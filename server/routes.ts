import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, loginUserSchema, insertTourSchema, updateUserProfileSchema } from "@shared/schema";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import multer from "multer";
import path from "path";
import fs from "fs";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";
const JWT_EXPIRES_IN = "7d";

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for audio file uploads
const audioStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'audio-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const audioUpload = multer({ 
  storage: audioStorage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/mp4', 'audio/m4a', 'audio/ogg', 'audio/x-m4a', 'audio/aac'];
    console.log('Audio file mimetype:', file.mimetype);
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only audio files are allowed.'));
    }
  }
});

// Configure multer for cover image uploads
const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'cover-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const imageUpload = multer({ 
  storage: imageStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only image files are allowed.'));
    }
  }
});

// Middleware to verify JWT token
const authenticateToken = async (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const user = await storage.getUser(decoded.userId);
    if (!user) {
      return res.status(401).json({ message: 'Invalid token' });
    }
    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Serve uploaded audio files as static content first
  app.use('/uploads', express.static(uploadsDir, {
    setHeaders: (res, path) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET');
      if (path.endsWith('.mp3') || path.endsWith('.wav') || path.endsWith('.m4a') || path.endsWith('.ogg')) {
        res.setHeader('Content-Type', 'audio/mpeg');
      }
    }
  }));
  // User Registration
  app.post("/api/register", async (req, res) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        return res.status(409).json({ 
          error: "Conflict", 
          details: "Email already registered." 
        });
      }

      const existingUsername = await storage.getUserByUsername(validatedData.username);
      if (existingUsername) {
        return res.status(409).json({ 
          error: "Conflict", 
          details: "Username already taken." 
        });
      }

      // Hash password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(validatedData.password, saltRounds);

      // Create user
      const user = await storage.createUser({
        ...validatedData,
        password: hashedPassword,
      });

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      res.status(201).json({
        message: "User registered successfully",
        user: { id: user.id, username: user.username, email: user.email },
        token,
      });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({
          error: "Invalid input",
          details: error.errors.map((e: any) => e.message).join(', ')
        });
      }
      
      console.error('Registration error:', error);
      res.status(500).json({ 
        error: "Internal server error",
        details: "Failed to register user"
      });
    }
  });

  // User Login
  app.post("/api/login", async (req, res) => {
    try {
      const validatedData = loginUserSchema.parse(req.body);
      
      // Find user by email
      const user = await storage.getUserByEmail(validatedData.email);
      if (!user) {
        return res.status(401).json({
          error: "Unauthorized",
          details: "Invalid email or password."
        });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(validatedData.password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({
          error: "Unauthorized",
          details: "Invalid email or password."
        });
      }

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      res.json({
        message: "Login successful",
        user: { id: user.id, username: user.username, email: user.email },
        token,
      });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({
          error: "Invalid input",
          details: error.errors.map((e: any) => e.message).join(', ')
        });
      }
      
      console.error('Login error:', error);
      res.status(500).json({ 
        error: "Internal server error",
        details: "Failed to login"
      });
    }
  });

  // Get current user (protected route)
  app.get("/api/user", authenticateToken, async (req: any, res) => {
    res.json({
      user: {
        id: req.user.id,
        username: req.user.username,
        email: req.user.email,
      }
    });
  });

  // Logout (client-side token removal, server-side placeholder)
  app.post("/api/logout", authenticateToken, async (req, res) => {
    res.json({ message: "Logout successful" });
  });

  // Get tours (public route)
  app.get("/api/tours", async (req, res) => {
    try {
      const tours = await storage.getAllTours();
      res.json(tours);
    } catch (error) {
      console.error('Get tours error:', error);
      res.status(500).json({ 
        error: "Internal server error",
        details: "Failed to fetch tours"
      });
    }
  });

  // Get nearby tours
  app.get("/api/tours/nearby", async (req, res) => {
    try {
      const { lat, lon, radius = 10 } = req.query;
      
      if (!lat || !lon) {
        return res.status(400).json({
          error: "Bad request",
          details: "Latitude and longitude are required"
        });
      }

      const tours = await storage.getNearbyTours(
        parseFloat(lat as string),
        parseFloat(lon as string),
        parseFloat(radius as string)
      );
      
      res.json(tours);
    } catch (error) {
      console.error('Get nearby tours error:', error);
      res.status(500).json({ 
        error: "Internal server error",
        details: "Failed to fetch nearby tours"
      });
    }
  });

  // Google Directions API proxy
  app.get("/api/directions", async (req, res) => {
    try {
      const { origin, destination, waypoints, mode = 'walking' } = req.query;
      
      if (!origin || !destination) {
        return res.status(400).json({
          error: "Bad request",
          details: "Origin and destination are required"
        });
      }

      const googleApiKey = process.env.GOOGLE_API_KEY;
      if (!googleApiKey) {
        return res.status(500).json({
          error: "Internal server error",
          details: "Google API key not configured"
        });
      }

      const params = new URLSearchParams({
        origin: origin as string,
        destination: destination as string,
        mode: mode as string,
        key: googleApiKey
      });

      if (waypoints) {
        params.append('waypoints', waypoints as string);
      }

      const googleUrl = `https://maps.googleapis.com/maps/api/directions/json?${params}`;
      const response = await fetch(googleUrl);
      
      if (!response.ok) {
        throw new Error(`Google API error: ${response.status}`);
      }

      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error('Directions API error:', error);
      res.status(500).json({ 
        error: "Internal server error",
        details: "Failed to fetch directions"
      });
    }
  });

  // Create tour (protected route)
  app.post("/api/tours", authenticateToken, async (req: any, res) => {
    try {
      const { stops, ...tourData } = req.body;
      const validatedTourData = insertTourSchema.parse(tourData);
      
      let tour;
      if (stops && stops.length > 0) {
        // Validate and prepare stops data
        const validatedStops = stops.map((stop: any) => ({
          title: stop.title || '',
          description: stop.description || '',
          latitude: stop.latitude || '',
          longitude: stop.longitude || '',
          audioFileUrl: stop.audioFileUrl || '',
          order: stop.order || 1,
        }));

        tour = await storage.createTourWithStops({
          ...validatedTourData,
          creatorId: req.user.id,
        }, validatedStops);
      } else {
        tour = await storage.createTour({
          ...validatedTourData,
          creatorId: req.user.id,
        });
      }

      res.status(201).json({
        message: "Tour created successfully",
        tour,
      });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({
          error: "Invalid input",
          details: error.errors.map((e: any) => e.message).join(', ')
        });
      }
      
      console.error('Create tour error:', error);
      res.status(500).json({ 
        error: "Internal server error",
        details: "Failed to create tour"
      });
    }
  });

  // Get tour by ID
  app.get("/api/tours/:id", async (req, res) => {
    try {
      const tourId = parseInt(req.params.id);
      if (isNaN(tourId)) {
        return res.status(400).json({
          error: "Bad request",
          details: "Invalid tour ID"
        });
      }

      const tour = await storage.getTour(tourId);
      if (!tour) {
        return res.status(404).json({
          error: "Not found",
          details: "Tour not found"
        });
      }

      res.json(tour);
    } catch (error) {
      console.error('Get tour error:', error);
      res.status(500).json({ 
        error: "Internal server error",
        details: "Failed to fetch tour"
      });
    }
  });

  // Get tour with stops by ID
  app.get("/api/tours/:id/details", async (req, res) => {
    try {
      const tourId = parseInt(req.params.id);
      if (isNaN(tourId)) {
        return res.status(400).json({
          error: "Bad request",
          details: "Invalid tour ID"
        });
      }

      const tourWithStops = await storage.getTourWithStops(tourId);
      if (!tourWithStops) {
        return res.status(404).json({
          error: "Not found",
          details: "Tour not found"
        });
      }

      res.json(tourWithStops);
    } catch (error) {
      console.error('Get tour details error:', error);
      res.status(500).json({ 
        error: "Internal server error",
        details: "Failed to fetch tour details"
      });
    }
  });

  // Update tour (protected route)
  app.put("/api/tours/:id", authenticateToken, async (req: any, res) => {
    try {
      const tourId = parseInt(req.params.id);
      if (isNaN(tourId)) {
        return res.status(400).json({
          error: "Bad request",
          details: "Invalid tour ID"
        });
      }

      const { stops, ...tourData } = req.body;
      const validatedTourData = insertTourSchema.parse(tourData);
      
      // Check if tour exists and user owns it
      const existingTour = await storage.getTour(tourId);
      if (!existingTour) {
        return res.status(404).json({
          error: "Not found",
          details: "Tour not found"
        });
      }

      if (existingTour.creatorId !== req.user.id) {
        return res.status(403).json({
          error: "Forbidden",
          details: "You can only edit your own tours"
        });
      }

      let updatedTour;
      if (stops && stops.length > 0) {
        // Validate and prepare stops data
        const validatedStops = stops.map((stop: any) => ({
          title: stop.title || '',
          description: stop.description || '',
          latitude: stop.latitude || '',
          longitude: stop.longitude || '',
          audioFileUrl: stop.audioFileUrl || '',
          order: stop.order || 1,
        }));

        updatedTour = await storage.updateTourWithStops(tourId, {
          ...validatedTourData,
          creatorId: req.user.id,
        }, validatedStops);
      } else {
        updatedTour = await storage.updateTour(tourId, {
          ...validatedTourData,
          creatorId: req.user.id,
        });
      }

      res.json({
        message: "Tour updated successfully",
        tour: updatedTour,
      });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({
          error: "Invalid input",
          details: error.errors.map((e: any) => e.message).join(', ')
        });
      }
      
      console.error('Update tour error:', error);
      res.status(500).json({ 
        error: "Internal server error",
        details: "Failed to update tour"
      });
    }
  });

  // Cover image upload endpoint (protected route)
  app.post("/api/upload/cover-image", authenticateToken, imageUpload.single('coverImage'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          error: "Bad request",
          details: "No image file provided"
        });
      }

      const fileUrl = `/uploads/${req.file.filename}`;
      
      res.json({
        message: "Cover image uploaded successfully",
        imageUrl: fileUrl,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size
      });
    } catch (error: any) {
      console.error('Cover image upload error:', error);
      
      if (error.message.includes('Invalid file type')) {
        return res.status(400).json({
          error: "Invalid file type",
          details: "Only image files (JPEG, PNG, GIF) are allowed"
        });
      }
      
      if (error.message.includes('File too large')) {
        return res.status(400).json({
          error: "File too large",
          details: "Image file must be less than 10MB"
        });
      }
      
      res.status(500).json({ 
        error: "Internal server error",
        details: "Failed to upload image file"
      });
    }
  });

  // Audio file upload endpoint (protected route)
  app.post("/api/upload/audio", authenticateToken, audioUpload.single('audio'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          error: "Bad request",
          details: "No audio file provided"
        });
      }

      // Return the file URL for storage in tour data
      const fileUrl = `/uploads/${req.file.filename}`;
      
      res.json({
        message: "Audio file uploaded successfully",
        audioUrl: fileUrl,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size
      });
    } catch (error: any) {
      console.error('Audio upload error:', error);
      
      if (error.message.includes('Invalid file type')) {
        return res.status(400).json({
          error: "Invalid file type",
          details: "Only audio files (MP3, WAV, M4A, OGG) are allowed"
        });
      }
      
      if (error.message.includes('File too large')) {
        return res.status(400).json({
          error: "File too large",
          details: "Audio file must be less than 50MB"
        });
      }
      
      res.status(500).json({ 
        error: "Internal server error",
        details: "Failed to upload audio file"
      });
    }
  });



  // Geocoding proxy endpoint
  app.get("/api/geocode", async (req, res) => {
    console.log("Geocoding endpoint hit with address:", req.query.address);
    try {
      const { address } = req.query;
      
      if (!address) {
        return res.status(400).json({ error: "Address parameter is required" });
      }
      
      const apiKey = process.env.GOOGLE_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "Google API key not configured" });
      }
      
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address as string)}&key=${apiKey}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch from Google API');
      }
      
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Error in geocoding:", error);
      res.status(500).json({ error: "Failed to geocode address" });
    }
  });

  // Profile API Endpoints - Task 5.1

  // Get user/creator profile data (GET /api/users/:id/profile)
  app.get("/api/users/:id/profile", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      
      if (isNaN(userId)) {
        return res.status(400).json({
          error: "Bad request",
          details: "Invalid user ID"
        });
      }

      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({
          error: "Not found",
          details: "User not found"
        });
      }

      // Remove password from response
      const { password, ...userProfile } = user;
      res.json(userProfile);
    } catch (error) {
      console.error('Get user profile error:', error);
      res.status(500).json({ 
        error: "Internal server error",
        details: "Failed to fetch user profile"
      });
    }
  });

  // Get tours uploaded by a specific creator (GET /api/users/:id/tours)
  app.get("/api/users/:id/tours", async (req, res) => {
    try {
      const creatorId = parseInt(req.params.id);
      
      if (isNaN(creatorId)) {
        return res.status(400).json({
          error: "Bad request",
          details: "Invalid creator ID"
        });
      }

      const tours = await storage.getToursByCreator(creatorId);
      res.json(tours);
    } catch (error) {
      console.error('Get creator tours error:', error);
      res.status(500).json({ 
        error: "Internal server error",
        details: "Failed to fetch creator tours"
      });
    }
  });

  // Get tours completed/listened to by a user (GET /api/users/:id/completed-tours)
  app.get("/api/users/:id/completed-tours", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      
      if (isNaN(userId)) {
        return res.status(400).json({
          error: "Bad request",
          details: "Invalid user ID"
        });
      }

      const completedTours = await storage.getCompletedToursByUser(userId);
      res.json(completedTours);
    } catch (error) {
      console.error('Get completed tours error:', error);
      res.status(500).json({ 
        error: "Internal server error",
        details: "Failed to fetch completed tours"
      });
    }
  });

  // Update user profile information (PUT /api/users/:id/profile)
  app.put("/api/users/:id/profile", authenticateToken, async (req: any, res) => {
    try {
      const userId = parseInt(req.params.id);
      
      if (isNaN(userId)) {
        return res.status(400).json({
          error: "Bad request",
          details: "Invalid user ID"
        });
      }

      // Check if user is updating their own profile
      if (req.user.userId !== userId) {
        return res.status(403).json({
          error: "Forbidden",
          details: "You can only update your own profile"
        });
      }

      const validatedData = updateUserProfileSchema.parse(req.body);
      
      // Check if email is already taken by another user
      if (validatedData.email) {
        const existingUser = await storage.getUserByEmail(validatedData.email);
        if (existingUser && existingUser.id !== userId) {
          return res.status(409).json({
            error: "Conflict",
            details: "Email already in use"
          });
        }
      }

      // Check if username is already taken by another user
      if (validatedData.username) {
        const existingUser = await storage.getUserByUsername(validatedData.username);
        if (existingUser && existingUser.id !== userId) {
          return res.status(409).json({
            error: "Conflict",
            details: "Username already taken"
          });
        }
      }

      const updatedUser = await storage.updateUserProfile(userId, validatedData);
      
      // Remove password from response
      const { password, ...userProfile } = updatedUser;
      res.json({
        message: "Profile updated successfully",
        user: userProfile
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({ 
        error: "Internal server error",
        details: "Failed to update profile"
      });
    }
  });

  // Mark tour as completed (POST /api/users/:id/completed-tours)
  app.post("/api/users/:id/completed-tours", authenticateToken, async (req: any, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { tourId } = req.body;
      
      if (isNaN(userId) || !tourId) {
        return res.status(400).json({
          error: "Bad request",
          details: "Invalid user ID or tour ID"
        });
      }

      // Check if user is marking their own completion
      if (req.user.userId !== userId) {
        return res.status(403).json({
          error: "Forbidden",
          details: "You can only mark tours as completed for yourself"
        });
      }

      // Check if tour exists
      const tour = await storage.getTour(tourId);
      if (!tour) {
        return res.status(404).json({
          error: "Not found",
          details: "Tour not found"
        });
      }

      const completedTour = await storage.markTourAsCompleted(userId, tourId);
      res.status(201).json({
        message: "Tour marked as completed",
        completedTour
      });
    } catch (error) {
      console.error('Mark tour completed error:', error);
      res.status(500).json({ 
        error: "Internal server error",
        details: "Failed to mark tour as completed"
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
