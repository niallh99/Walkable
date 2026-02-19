import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { pool } from "./db";
import { insertUserSchema, loginUserSchema, insertTourSchema, updateUserProfileSchema, updateUserRoleSchema } from "@shared/schema";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import multer from "multer";
import path from "path";
import fs from "fs";
import rateLimit from "express-rate-limit";
import xss from "xss";
import { config } from "./config";
import { getStripe, isStripeConfigured } from "./stripe";

const JWT_SECRET = config.JWT_SECRET;
const JWT_EXPIRES_IN = "7d";
const CORS_ORIGIN = config.CORS_ORIGIN;
const DISABLE_UPLOADS = config.DISABLE_UPLOADS === 'true';

// Upload kill-switch middleware
const checkUploadsEnabled = (req: any, res: any, next: any) => {
  if (DISABLE_UPLOADS) {
    return res.status(503).json({
      error: "Service temporarily unavailable",
      details: "File uploads are currently disabled"
    });
  }
  next();
};

// Sanitize user input to prevent XSS (applied on write, not read)
const sanitizeText = (text: string | undefined | null): string => {
  if (!text) return '';
  return xss(text);
};

// Rate limiters
const globalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests", details: "Please try again later" }
});

const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 requests per minute for auth routes
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts", details: "Please try again later" }
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 uploads per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many uploads", details: "Please try again later" }
});

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

// Configure multer for video file uploads
const videoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'video-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const videoUpload = multer({ 
  storage: videoStorage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['video/mp4', 'video/mov', 'video/webm', 'video/quicktime'];
    console.log('Video file mimetype:', file.mimetype);
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only video files (MP4, MOV, WebM) are allowed.'));
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

// Configure multer for profile image uploads
const profileImageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const profileImageUpload = multer({
  storage: profileImageStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
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

// Middleware to require creator role
const requireCreator = (req: any, res: any, next: any) => {
  if (req.user.role !== 'creator') {
    return res.status(403).json({
      error: "Forbidden",
      details: "Only creators can perform this action. Switch your role to creator first."
    });
  }
  next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Serve uploaded audio files as static content first
  app.use('/uploads', express.static(uploadsDir, {
    setHeaders: (res, path) => {
      if (CORS_ORIGIN) {
        res.setHeader('Access-Control-Allow-Origin', CORS_ORIGIN);
      }
      res.setHeader('Access-Control-Allow-Methods', 'GET');
      if (path.endsWith('.mp3') || path.endsWith('.wav') || path.endsWith('.m4a') || path.endsWith('.ogg')) {
        res.setHeader('Content-Type', 'audio/mpeg');
      }
      if (path.endsWith('.mp4') || path.endsWith('.mov') || path.endsWith('.webm')) {
        res.setHeader('Content-Type', 'video/mp4');
      }
    }
  }));

  // Apply global rate limiter to all API routes
  app.use('/api', globalLimiter);

  // Stripe webhook (must use raw body for signature verification)
  app.post("/api/webhooks/stripe", express.raw({ type: 'application/json' }), async (req, res) => {
    if (!isStripeConfigured() || !config.STRIPE_WEBHOOK_SECRET) {
      return res.status(503).json({ error: "Stripe is not configured" });
    }

    const sig = req.headers['stripe-signature'] as string;
    if (!sig) {
      return res.status(400).json({ error: "Missing stripe-signature header" });
    }

    try {
      const stripe = getStripe();
      const event = stripe.webhooks.constructEvent(req.body, sig, config.STRIPE_WEBHOOK_SECRET);

      switch (event.type) {
        case 'account.updated': {
          const account = event.data.object as any;
          if (account.charges_enabled && account.details_submitted) {
            const existing = await storage.getStripeAccountByStripeId(account.id);
            if (existing) {
              await storage.updateStripeAccountOnboarding(existing.userId, true);
            }
          }
          break;
        }
        case 'checkout.session.completed': {
          const session = event.data.object as any;
          if (session.payment_status === 'paid' && session.metadata?.walkable_tour_id) {
            const paymentId = session.payment_intent as string;

            if (session.metadata.walkable_tip === 'true') {
              // Handle tip payment
              const existingTip = await storage.getTipByPaymentId(paymentId);
              if (!existingTip) {
                await storage.createTip(
                  parseInt(session.metadata.walkable_from_user_id),
                  parseInt(session.metadata.walkable_to_user_id),
                  parseInt(session.metadata.walkable_tour_id),
                  (session.amount_total / 100).toFixed(2),
                  (session.currency || 'eur').toUpperCase(),
                  paymentId
                );
              }
            } else {
              // Handle tour purchase
              const userId = parseInt(session.metadata.walkable_user_id);
              const tourId = parseInt(session.metadata.walkable_tour_id);

              const existing = await storage.getPurchaseByPaymentId(paymentId);
              if (!existing) {
                await storage.createPurchase(
                  userId,
                  tourId,
                  (session.amount_total / 100).toFixed(2),
                  (session.currency || 'eur').toUpperCase(),
                  paymentId
                );
              }
            }
          }
          break;
        }
        default:
          console.log(`Unhandled Stripe event type: ${event.type}`);
      }

      res.json({ received: true });
    } catch (error: any) {
      console.error('Stripe webhook error:', error.message);
      res.status(400).json({ error: `Webhook error: ${error.message}` });
    }
  });

  // Health check endpoint
  app.get("/api/health", async (req, res) => {
    try {
      await pool.query('SELECT 1');
      res.json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        database: "connected"
      });
    } catch (error) {
      res.status(503).json({
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        database: "disconnected"
      });
    }
  });

  // User Registration
  app.post("/api/register", authLimiter, async (req, res) => {
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

      // Create user with sanitized username
      const user = await storage.createUser({
        ...validatedData,
        username: sanitizeText(validatedData.username),
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
        user: { id: user.id, username: user.username, email: user.email, role: user.role },
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
  app.post("/api/login", authLimiter, async (req, res) => {
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
        user: { id: user.id, username: user.username, email: user.email, role: user.role },
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
        bio: req.user.bio,
        profileImage: req.user.profileImage,
        location: req.user.location,
        role: req.user.role,
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
      const { pricing } = req.query;
      let filter: 'free' | 'paid' | undefined;
      if (pricing === 'free' || pricing === 'paid') {
        filter = pricing;
      }
      const tours = await storage.getAllTours(filter);
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

      const params = new URLSearchParams({
        origin: origin as string,
        destination: destination as string,
        mode: mode as string,
        key: config.GOOGLE_API_KEY
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

  // Create tour (protected route, creator only)
  app.post("/api/tours", authenticateToken, requireCreator, async (req: any, res) => {
    try {
      const { stops, ...tourData } = req.body;
      const validatedTourData = insertTourSchema.parse(tourData);

      // Sanitize tour text fields
      const sanitizedTourData = {
        ...validatedTourData,
        title: sanitizeText(validatedTourData.title),
        description: sanitizeText(validatedTourData.description),
      };

      let tour;
      if (stops && stops.length > 0) {
        // Validate and sanitize stops data
        const validatedStops = stops.map((stop: any) => ({
          title: sanitizeText(stop.title) || '',
          description: sanitizeText(stop.description) || '',
          latitude: stop.latitude || '',
          longitude: stop.longitude || '',
          audioFileUrl: stop.audioFileUrl || '',
          videoFileUrl: stop.videoFileUrl || '',
          mediaType: stop.mediaType || 'audio',
          order: stop.order || 1,
        }));

        tour = await storage.createTourWithStops({
          ...sanitizedTourData,
          creatorId: req.user.id,
        }, validatedStops);
      } else {
        tour = await storage.createTour({
          ...sanitizedTourData,
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

      // Sanitize tour text fields
      const sanitizedTourData = {
        ...validatedTourData,
        title: sanitizeText(validatedTourData.title),
        description: sanitizeText(validatedTourData.description),
      };

      let updatedTour;
      if (stops && stops.length > 0) {
        // Validate and sanitize stops data
        const validatedStops = stops.map((stop: any) => ({
          title: sanitizeText(stop.title) || '',
          description: sanitizeText(stop.description) || '',
          latitude: stop.latitude || '',
          longitude: stop.longitude || '',
          audioFileUrl: stop.audioFileUrl || '',
          videoFileUrl: stop.videoFileUrl || '',
          mediaType: stop.mediaType || 'audio',
          order: stop.order || 1,
        }));

        updatedTour = await storage.updateTourWithStops(tourId, {
          ...sanitizedTourData,
          creatorId: req.user.id,
        }, validatedStops);
      } else {
        updatedTour = await storage.updateTour(tourId, {
          ...sanitizedTourData,
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

  // Delete tour (protected route)
  app.delete("/api/tours/:id", authenticateToken, async (req: any, res) => {
    try {
      const tourId = parseInt(req.params.id);
      if (isNaN(tourId)) {
        return res.status(400).json({
          error: "Bad request",
          details: "Invalid tour ID"
        });
      }

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
          details: "You can only delete your own tours"
        });
      }

      await storage.deleteTour(tourId);

      res.json({
        message: "Tour deleted successfully"
      });
    } catch (error: any) {
      console.error('Delete tour error:', error);
      res.status(500).json({ 
        error: "Internal server error",
        details: "Failed to delete tour"
      });
    }
  });

  // Cover image upload endpoint (protected route)
  app.post("/api/upload/cover-image", checkUploadsEnabled, uploadLimiter, authenticateToken, imageUpload.single('coverImage'), async (req: any, res) => {
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
  app.post("/api/upload/audio", checkUploadsEnabled, uploadLimiter, authenticateToken, audioUpload.single('audio'), async (req: any, res) => {
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

  // Upload video file
  app.post("/api/upload/video", checkUploadsEnabled, uploadLimiter, authenticateToken, videoUpload.single('video'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          error: "Bad request",
          details: "No video file provided"
        });
      }

      // Return the file URL for storage in tour data
      const fileUrl = `/uploads/${req.file.filename}`;
      
      res.json({
        message: "Video file uploaded successfully",
        videoUrl: fileUrl,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size
      });
    } catch (error: any) {
      console.error('Video upload error:', error);
      
      if (error.message.includes('Invalid file type')) {
        return res.status(400).json({
          error: "Invalid file type",
          details: "Only video files (MP4, MOV, WebM) are allowed"
        });
      }
      
      if (error.message.includes('File too large')) {
        return res.status(400).json({
          error: "File too large",
          details: "Video file must be less than 100MB"
        });
      }
      
      res.status(500).json({ 
        error: "Internal server error",
        details: "Failed to upload video file"
      });
    }
  });

  // Upload preview audio for a tour (POST /api/tours/:id/preview-audio)
  app.post("/api/tours/:id/preview-audio", checkUploadsEnabled, uploadLimiter, authenticateToken, requireCreator, audioUpload.single('previewAudio'), async (req: any, res) => {
    try {
      const tourId = parseInt(req.params.id);
      if (isNaN(tourId)) {
        return res.status(400).json({ error: "Bad request", details: "Invalid tour ID" });
      }

      const tour = await storage.getTour(tourId);
      if (!tour) {
        return res.status(404).json({ error: "Not found", details: "Tour not found" });
      }
      if (tour.creatorId !== req.user.id) {
        return res.status(403).json({ error: "Forbidden", details: "You can only update your own tours" });
      }

      if (!req.file) {
        return res.status(400).json({ error: "Bad request", details: "No audio file provided" });
      }

      const fileUrl = `/uploads/${req.file.filename}`;
      const updatedTour = await storage.updateTourFields(tourId, { previewAudioUrl: fileUrl });

      res.json({
        message: "Preview audio uploaded successfully",
        previewAudioUrl: fileUrl,
        tour: updatedTour,
      });
    } catch (error: any) {
      console.error('Preview audio upload error:', error);
      if (error.message?.includes('Invalid file type')) {
        return res.status(400).json({ error: "Invalid file type", details: "Only audio files are allowed" });
      }
      if (error.message?.includes('File too large')) {
        return res.status(400).json({ error: "File too large", details: "Audio file must be less than 50MB" });
      }
      res.status(500).json({ error: "Internal server error", details: "Failed to upload preview audio" });
    }
  });

  // Upload preview video for a tour (POST /api/tours/:id/preview-video)
  app.post("/api/tours/:id/preview-video", checkUploadsEnabled, uploadLimiter, authenticateToken, requireCreator, videoUpload.single('previewVideo'), async (req: any, res) => {
    try {
      const tourId = parseInt(req.params.id);
      if (isNaN(tourId)) {
        return res.status(400).json({ error: "Bad request", details: "Invalid tour ID" });
      }

      const tour = await storage.getTour(tourId);
      if (!tour) {
        return res.status(404).json({ error: "Not found", details: "Tour not found" });
      }
      if (tour.creatorId !== req.user.id) {
        return res.status(403).json({ error: "Forbidden", details: "You can only update your own tours" });
      }

      if (!req.file) {
        return res.status(400).json({ error: "Bad request", details: "No video file provided" });
      }

      const fileUrl = `/uploads/${req.file.filename}`;
      const updatedTour = await storage.updateTourFields(tourId, { previewVideoUrl: fileUrl });

      res.json({
        message: "Preview video uploaded successfully",
        previewVideoUrl: fileUrl,
        tour: updatedTour,
      });
    } catch (error: any) {
      console.error('Preview video upload error:', error);
      if (error.message?.includes('Invalid file type')) {
        return res.status(400).json({ error: "Invalid file type", details: "Only video files (MP4, MOV, WebM) are allowed" });
      }
      if (error.message?.includes('File too large')) {
        return res.status(400).json({ error: "File too large", details: "Video file must be less than 100MB" });
      }
      res.status(500).json({ error: "Internal server error", details: "Failed to upload preview video" });
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
      
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address as string)}&key=${config.GOOGLE_API_KEY}`
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

  // Profile API Endpoints

  // Update own profile (PUT /api/users/profile) - uses JWT to identify user
  app.put("/api/users/profile", authenticateToken, async (req: any, res) => {
    try {
      const userId = req.user.id;
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

      // Sanitize text fields
      const sanitizedData: Record<string, any> = { ...validatedData };
      if (sanitizedData.username) sanitizedData.username = sanitizeText(sanitizedData.username);
      if (sanitizedData.bio) sanitizedData.bio = sanitizeText(sanitizedData.bio);
      if (sanitizedData.location) sanitizedData.location = sanitizeText(sanitizedData.location);

      const updatedUser = await storage.updateUserProfile(userId, sanitizedData);
      const { password, ...userProfile } = updatedUser;

      res.json({
        message: "Profile updated successfully",
        user: userProfile
      });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({
          error: "Invalid input",
          details: error.errors.map((e: any) => e.message).join(', ')
        });
      }
      console.error('Update profile error:', error);
      res.status(500).json({
        error: "Internal server error",
        details: "Failed to update profile"
      });
    }
  });

  // Switch user role (PUT /api/users/role)
  app.put("/api/users/role", authenticateToken, async (req: any, res) => {
    try {
      const { role } = updateUserRoleSchema.parse(req.body);

      const updatedUser = await storage.updateUserProfile(req.user.id, { role });
      const { password, ...userProfile } = updatedUser;

      res.json({
        message: `Role switched to ${role}`,
        user: userProfile
      });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({
          error: "Invalid input",
          details: "Role must be 'explorer' or 'creator'"
        });
      }
      console.error('Update role error:', error);
      res.status(500).json({
        error: "Internal server error",
        details: "Failed to update role"
      });
    }
  });

  // Upload profile image (POST /api/users/profile-image)
  app.post("/api/users/profile-image", checkUploadsEnabled, uploadLimiter, authenticateToken, profileImageUpload.single('profileImage'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          error: "Bad request",
          details: "No image file provided"
        });
      }

      const fileUrl = `/uploads/${req.file.filename}`;

      // Update user's profileImage in the database
      const updatedUser = await storage.updateUserProfile(req.user.id, { profileImage: fileUrl });
      const { password, ...userProfile } = updatedUser;

      res.json({
        message: "Profile image uploaded successfully",
        imageUrl: fileUrl,
        user: userProfile
      });
    } catch (error: any) {
      console.error('Profile image upload error:', error);

      if (error.message?.includes('Invalid file type')) {
        return res.status(400).json({
          error: "Invalid file type",
          details: "Only image files (JPEG, PNG, GIF) are allowed"
        });
      }

      if (error.message?.includes('File too large')) {
        return res.status(400).json({
          error: "File too large",
          details: "Profile image must be less than 5MB"
        });
      }

      res.status(500).json({
        error: "Internal server error",
        details: "Failed to upload profile image"
      });
    }
  });

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

  // Update user profile information (PUT /api/users/:id/profile) - legacy endpoint
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
      if (req.user.id !== userId) {
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

      // Sanitize text fields
      const sanitizedData: Record<string, any> = { ...validatedData };
      if (sanitizedData.username) sanitizedData.username = sanitizeText(sanitizedData.username);
      if (sanitizedData.bio) sanitizedData.bio = sanitizeText(sanitizedData.bio);
      if (sanitizedData.location) sanitizedData.location = sanitizeText(sanitizedData.location);

      const updatedUser = await storage.updateUserProfile(userId, sanitizedData);

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

  // Get user's progress on a tour (GET /api/tours/:id/progress)
  app.get("/api/tours/:id/progress", authenticateToken, async (req: any, res) => {
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

      const progress = await storage.getTourProgress(req.user.id, tourId);
      const isCompleted = await storage.isTourCompleted(req.user.id, tourId);

      res.json({ tourId, progress, isCompleted });
    } catch (error) {
      console.error('Get tour progress error:', error);
      res.status(500).json({
        error: "Internal server error",
        details: "Failed to fetch tour progress"
      });
    }
  });

  // Mark a stop as completed (POST /api/tours/:id/progress)
  app.post("/api/tours/:id/progress", authenticateToken, async (req: any, res) => {
    try {
      const tourId = parseInt(req.params.id);
      if (isNaN(tourId)) {
        return res.status(400).json({
          error: "Bad request",
          details: "Invalid tour ID"
        });
      }

      const { stopId } = req.body;
      if (!stopId || isNaN(parseInt(stopId))) {
        return res.status(400).json({
          error: "Bad request",
          details: "Valid stopId is required"
        });
      }

      const tour = await storage.getTour(tourId);
      if (!tour) {
        return res.status(404).json({
          error: "Not found",
          details: "Tour not found"
        });
      }

      const stopIdNum = parseInt(stopId);
      const progress = await storage.markStopCompleted(req.user.id, tourId, stopIdNum);
      const isCompleted = await storage.isTourCompleted(req.user.id, tourId);

      res.status(201).json({
        message: "Stop marked as completed",
        progress,
        tourCompleted: isCompleted,
      });
    } catch (error) {
      console.error('Mark stop completed error:', error);
      res.status(500).json({
        error: "Internal server error",
        details: "Failed to mark stop as completed"
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
      if (req.user.id !== userId) {
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

  // Start Stripe Connect onboarding (POST /api/stripe/connect)
  app.post("/api/stripe/connect", authenticateToken, requireCreator, async (req: any, res) => {
    if (!isStripeConfigured()) {
      return res.status(503).json({ error: "Stripe is not configured" });
    }

    try {
      const stripe = getStripe();
      const userId = req.user.id;

      // Check if user already has a Stripe account
      let stripeAccount = await storage.getStripeAccount(userId);

      if (!stripeAccount) {
        // Create a new Stripe Connect Express account
        const account = await stripe.accounts.create({
          type: 'express',
          email: req.user.email,
          metadata: { walkable_user_id: String(userId) },
        });
        stripeAccount = await storage.createStripeAccount(userId, account.id);
      }

      // Create an account link for onboarding
      const accountLink = await stripe.accountLinks.create({
        account: stripeAccount.stripeAccountId,
        refresh_url: `${req.headers.origin || req.protocol + '://' + req.get('host')}/creator/stripe-refresh`,
        return_url: `${req.headers.origin || req.protocol + '://' + req.get('host')}/creator/stripe-return`,
        type: 'account_onboarding',
      });

      res.json({
        url: accountLink.url,
        stripeAccountId: stripeAccount.stripeAccountId,
      });
    } catch (error: any) {
      console.error('Stripe Connect error:', error);
      res.status(500).json({
        error: "Internal server error",
        details: "Failed to start Stripe Connect onboarding"
      });
    }
  });

  // Check Stripe Connect onboarding status (GET /api/stripe/connect/status)
  app.get("/api/stripe/connect/status", authenticateToken, async (req: any, res) => {
    if (!isStripeConfigured()) {
      return res.status(503).json({ error: "Stripe is not configured" });
    }

    try {
      const stripeAccount = await storage.getStripeAccount(req.user.id);

      if (!stripeAccount) {
        return res.json({ connected: false, onboardingComplete: false });
      }

      // Fetch live status from Stripe
      const stripe = getStripe();
      const account = await stripe.accounts.retrieve(stripeAccount.stripeAccountId);

      const onboardingComplete = !!(account.charges_enabled && account.details_submitted);

      // Update local record if status changed
      if (onboardingComplete !== stripeAccount.onboardingComplete) {
        await storage.updateStripeAccountOnboarding(req.user.id, onboardingComplete);
      }

      res.json({
        connected: true,
        stripeAccountId: stripeAccount.stripeAccountId,
        onboardingComplete,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
      });
    } catch (error: any) {
      console.error('Stripe Connect status error:', error);
      res.status(500).json({
        error: "Internal server error",
        details: "Failed to check Stripe Connect status"
      });
    }
  });

  // Purchase a paid tour (POST /api/tours/:id/purchase)
  app.post("/api/tours/:id/purchase", authenticateToken, async (req: any, res) => {
    if (!isStripeConfigured()) {
      return res.status(503).json({ error: "Stripe is not configured" });
    }

    try {
      const tourId = parseInt(req.params.id);
      if (isNaN(tourId)) {
        return res.status(400).json({ error: "Bad request", details: "Invalid tour ID" });
      }

      const tour = await storage.getTour(tourId);
      if (!tour) {
        return res.status(404).json({ error: "Not found", details: "Tour not found" });
      }

      // Free tours don't need purchase
      const price = parseFloat(tour.price);
      if (price <= 0) {
        return res.status(400).json({ error: "Bad request", details: "This tour is free" });
      }

      // Check if already purchased
      const existingPurchase = await storage.getPurchase(req.user.id, tourId);
      if (existingPurchase) {
        return res.status(409).json({ error: "Conflict", details: "You have already purchased this tour" });
      }

      // Creator must have a connected Stripe account
      const creatorStripe = await storage.getStripeAccount(tour.creatorId);
      if (!creatorStripe || !creatorStripe.onboardingComplete) {
        return res.status(400).json({
          error: "Bad request",
          details: "Tour creator has not completed payment setup"
        });
      }

      const stripe = getStripe();
      const origin = req.headers.origin || req.protocol + '://' + req.get('host');
      const amountInCents = Math.round(price * 100);
      const platformFee = Math.round(amountInCents * 0.20); // 20% platform fee

      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: tour.currency.toLowerCase(),
            product_data: {
              name: tour.title,
              description: tour.description.substring(0, 500),
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        }],
        payment_intent_data: {
          application_fee_amount: platformFee,
          transfer_data: {
            destination: creatorStripe.stripeAccountId,
          },
        },
        metadata: {
          walkable_user_id: String(req.user.id),
          walkable_tour_id: String(tourId),
        },
        success_url: `${origin}/tours/${tourId}?purchase=success`,
        cancel_url: `${origin}/tours/${tourId}?purchase=cancel`,
      });

      res.json({ checkoutUrl: session.url });
    } catch (error: any) {
      console.error('Tour purchase error:', error);
      res.status(500).json({
        error: "Internal server error",
        details: "Failed to create checkout session"
      });
    }
  });

  // Check if user has access to a paid tour (GET /api/tours/:id/access)
  app.get("/api/tours/:id/access", authenticateToken, async (req: any, res) => {
    try {
      const tourId = parseInt(req.params.id);
      if (isNaN(tourId)) {
        return res.status(400).json({ error: "Bad request", details: "Invalid tour ID" });
      }

      const tour = await storage.getTour(tourId);
      if (!tour) {
        return res.status(404).json({ error: "Not found", details: "Tour not found" });
      }

      // Free tours are always accessible
      const price = parseFloat(tour.price);
      if (price <= 0) {
        return res.json({ hasAccess: true, reason: 'free' });
      }

      // Creator always has access to their own tours
      if (tour.creatorId === req.user.id) {
        return res.json({ hasAccess: true, reason: 'creator' });
      }

      // Check for completed purchase
      const purchase = await storage.getPurchase(req.user.id, tourId);
      if (purchase) {
        return res.json({ hasAccess: true, reason: 'purchased', purchasedAt: purchase.purchasedAt });
      }

      res.json({ hasAccess: false });
    } catch (error) {
      console.error('Tour access check error:', error);
      res.status(500).json({
        error: "Internal server error",
        details: "Failed to check tour access"
      });
    }
  });

  // Send a tip to a tour creator (POST /api/tours/:id/tip)
  app.post("/api/tours/:id/tip", authenticateToken, async (req: any, res) => {
    if (!isStripeConfigured()) {
      return res.status(503).json({ error: "Stripe is not configured" });
    }

    try {
      const tourId = parseInt(req.params.id);
      if (isNaN(tourId)) {
        return res.status(400).json({ error: "Bad request", details: "Invalid tour ID" });
      }

      const { amount } = req.body;
      if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
        return res.status(400).json({ error: "Bad request", details: "A positive tip amount is required" });
      }

      const tour = await storage.getTour(tourId);
      if (!tour) {
        return res.status(404).json({ error: "Not found", details: "Tour not found" });
      }

      // Can't tip yourself
      if (tour.creatorId === req.user.id) {
        return res.status(400).json({ error: "Bad request", details: "You cannot tip yourself" });
      }

      // Creator must have a connected Stripe account
      const creatorStripe = await storage.getStripeAccount(tour.creatorId);
      if (!creatorStripe || !creatorStripe.onboardingComplete) {
        return res.status(400).json({
          error: "Bad request",
          details: "Tour creator has not completed payment setup"
        });
      }

      const stripe = getStripe();
      const origin = req.headers.origin || req.protocol + '://' + req.get('host');
      const tipAmountCents = Math.round(parseFloat(amount) * 100);
      const platformFee = Math.round(tipAmountCents * 0.20); // 20% platform fee

      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: tour.currency.toLowerCase(),
            product_data: {
              name: `Tip for "${tour.title}"`,
            },
            unit_amount: tipAmountCents,
          },
          quantity: 1,
        }],
        payment_intent_data: {
          application_fee_amount: platformFee,
          transfer_data: {
            destination: creatorStripe.stripeAccountId,
          },
        },
        metadata: {
          walkable_tip: 'true',
          walkable_from_user_id: String(req.user.id),
          walkable_to_user_id: String(tour.creatorId),
          walkable_tour_id: String(tourId),
        },
        success_url: `${origin}/tours/${tourId}?tip=success`,
        cancel_url: `${origin}/tours/${tourId}?tip=cancel`,
      });

      res.json({ checkoutUrl: session.url });
    } catch (error: any) {
      console.error('Tip checkout error:', error);
      res.status(500).json({
        error: "Internal server error",
        details: "Failed to create tip checkout session"
      });
    }
  });

  // Get total tips for a creator (GET /api/creators/:id/tips/total)
  app.get("/api/creators/:id/tips/total", async (req, res) => {
    try {
      const creatorId = parseInt(req.params.id);
      if (isNaN(creatorId)) {
        return res.status(400).json({ error: "Bad request", details: "Invalid creator ID" });
      }

      const user = await storage.getUser(creatorId);
      if (!user) {
        return res.status(404).json({ error: "Not found", details: "Creator not found" });
      }

      const totals = await storage.getTotalTipsForCreator(creatorId);
      res.json(totals);
    } catch (error) {
      console.error('Get creator tips total error:', error);
      res.status(500).json({
        error: "Internal server error",
        details: "Failed to fetch creator tips total"
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
