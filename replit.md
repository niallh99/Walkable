# Walkable - Audio Walking Tours Platform

## Overview

Walkable is a full-stack web application that allows users to discover and create immersive self-guided audio walking tours. The platform enables users to explore local culture, history, and hidden stories at their own pace through location-based audio content.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query (React Query) for server state management
- **Styling**: Tailwind CSS with custom design system based on cyan branding
- **UI Components**: Radix UI primitives with custom shadcn/ui components
- **Form Handling**: React Hook Form with Zod validation
- **Build Tool**: Vite for development and production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Language**: TypeScript with ES modules
- **Authentication**: JWT-based authentication with bcrypt password hashing
- **Session Management**: Express sessions with PostgreSQL storage
- **API Design**: RESTful endpoints with JSON responses
- **Middleware**: Custom logging, error handling, and authentication middleware

### Database Design
- **Database**: PostgreSQL with Neon serverless driver
- **ORM**: Drizzle ORM for type-safe database operations
- **Schema**: Two main tables - users and tours
- **Validation**: Drizzle-Zod integration for runtime schema validation

## Key Components

### User Management
- User registration and login with validation
- JWT token-based authentication
- Password hashing with bcrypt
- Protected routes requiring authentication

### Tour System
- Tour creation with metadata (title, description, category, location)
- Geographic data storage (latitude/longitude)
- Audio file URL storage for tour content
- Duration and distance tracking
- Creator-tour relationship with foreign keys

### UI/UX Design
- Responsive design with mobile-first approach
- Custom color scheme with cyan branding (`--walkable-cyan`)
- Comprehensive component library based on Radix UI
- Toast notifications for user feedback
- Loading states and error handling

## Data Flow

1. **Authentication Flow**: User registers/logs in → JWT token stored in localStorage → Token sent with API requests → Server validates token → User data attached to requests

2. **Tour Discovery**: Users browse tours → Map-based discovery (planned) → Location-based filtering → Tour details and audio playback

3. **Tour Creation**: Authenticated users → Form submission with validation → Server processing → Database storage → Tour available for discovery

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: Serverless PostgreSQL driver
- **drizzle-orm**: Type-safe ORM for database operations
- **@tanstack/react-query**: Server state management
- **@radix-ui/***: Accessible UI component primitives
- **react-hook-form**: Form handling and validation
- **zod**: Runtime type validation
- **jwt**: JSON Web Token implementation
- **bcrypt**: Password hashing

### Development Tools
- **Vite**: Build tool and development server
- **TypeScript**: Type safety and developer experience
- **Tailwind CSS**: Utility-first CSS framework
- **ESBuild**: JavaScript bundler for production builds

## Deployment Strategy

### Development Environment
- **Runtime**: Node.js 20 with hot module replacement
- **Database**: PostgreSQL 16 with automatic provisioning
- **Port Configuration**: Frontend on port 5000, external port 80
- **File Watching**: Vite dev server with HMR enabled

### Production Build
- **Frontend**: Vite production build to `dist/public`
- **Backend**: ESBuild bundle to `dist/index.js`
- **Assets**: Static file serving through Express
- **Environment**: Production mode with optimized builds

### Database Management
- **Migrations**: Drizzle migrations in `./migrations` directory
- **Schema**: Centralized schema definition in `shared/schema.ts`
- **Connection**: Environment-based database URL configuration

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

- June 20, 2025: Phase 5 User & Creator Profiles completed
  - Backend API endpoints for user profiles, creator tours, and completed tours
  - Profile page with real data display for created and completed tours
  - Edit profile functionality with username and email updates
  - Tour completion tracking system with database integration
  - Protected API endpoints with proper authentication and authorization
  - Profile information editing with validation and conflict checking

- June 18, 2025: Phase 3 Create Tour Flow completed
  - Complete multi-step tour creation form with validation
  - Map-based location selection with search and click functionality
  - Audio file upload system with multer backend storage
  - File validation (50MB limit, multiple audio formats)
  - Integration with authentication system
  - Progress tracking and comprehensive error handling

- June 18, 2025: Phase 2 Interactive Map Discovery completed
  - Interactive map-based discover page with Leaflet.js integration
  - User location detection with HTML5 Geolocation API
  - Location search with Google Maps geocoding integration
  - Nearby tours API with geographic proximity calculations
  - Rich tour details interface with audio preview capabilities
  - Sample tour data created for San Francisco area testing
  - Mobile-responsive design with comprehensive error handling

- June 18, 2025: Phase 1 Authentication System completed
  - Comprehensive user authentication with JWT tokens
  - Secure password hashing with bcrypt (12 salt rounds)
  - Complete API endpoints: register, login, logout, user profile
  - Protected routes with token validation middleware
  - Frontend authentication context and protected routing
  - Unit test suite with comprehensive coverage
  - Manual testing verified all endpoints working correctly

- June 18, 2025: UX improvements implemented
  - Updated navbar layout with logo and right-aligned navigation
  - Hero section redesigned with left-aligned content and image grid
  - Footer redesigned with cyan background matching brand
  - Walkable logo integration throughout the application

- June 18, 2025: Initial project setup
  - React frontend with TypeScript and Vite
  - Express backend with PostgreSQL database
  - Drizzle ORM for type-safe database operations
  - Authentication system foundation

## Changelog

- June 18, 2025: Phase 3 Create Tour Flow - COMPLETE
- June 18, 2025: Phase 2 Interactive Map Discovery - COMPLETE
- June 18, 2025: Phase 1 Authentication System - COMPLETE
- June 18, 2025: Initial setup and branding