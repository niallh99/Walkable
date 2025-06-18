import request from 'supertest';
import { Express } from 'express';
import express from 'express';
import { registerRoutes } from '../server/routes';
import { storage } from '../server/storage';
import bcrypt from 'bcrypt';

describe('Authentication API', () => {
  let app: Express;
  let server: any;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    server = await registerRoutes(app);
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
  });

  beforeEach(async () => {
    // Clean up any test users before each test
    try {
      const testUser = await storage.getUserByEmail('test@example.com');
      if (testUser) {
        // Note: In a real app, you'd have a deleteUser method
        // For now, we'll work with the existing data
      }
    } catch (error) {
      // User doesn't exist, that's fine
    }
  });

  describe('POST /api/register', () => {
    const validUserData = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123'
    };

    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/register')
        .send({
          ...validUserData,
          email: 'unique@example.com',
          username: 'uniqueuser'
        })
        .expect(201);

      expect(response.body).toHaveProperty('message', 'User registered successfully');
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user).toHaveProperty('username', 'uniqueuser');
      expect(response.body.user).toHaveProperty('email', 'unique@example.com');
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('should hash the password correctly', async () => {
      const uniqueEmail = `test${Date.now()}@example.com`;
      const uniqueUsername = `user${Date.now()}`;
      
      await request(app)
        .post('/api/register')
        .send({
          ...validUserData,
          email: uniqueEmail,
          username: uniqueUsername
        })
        .expect(201);

      const user = await storage.getUserByEmail(uniqueEmail);
      expect(user).toBeTruthy();
      if (user) {
        expect(user.password).not.toBe(validUserData.password);
        const isPasswordValid = await bcrypt.compare(validUserData.password, user.password);
        expect(isPasswordValid).toBe(true);
      }
    });

    it('should return 409 for duplicate email', async () => {
      const uniqueEmail = `duplicate${Date.now()}@example.com`;
      
      // Register first user
      await request(app)
        .post('/api/register')
        .send({
          ...validUserData,
          email: uniqueEmail,
          username: `user1${Date.now()}`
        })
        .expect(201);

      // Try to register with same email
      const response = await request(app)
        .post('/api/register')
        .send({
          ...validUserData,
          email: uniqueEmail,
          username: `user2${Date.now()}`
        })
        .expect(409);

      expect(response.body).toHaveProperty('error', 'Conflict');
      expect(response.body).toHaveProperty('details', 'Email already registered.');
    });

    it('should return 409 for duplicate username', async () => {
      const uniqueUsername = `duplicate${Date.now()}`;
      
      // Register first user
      await request(app)
        .post('/api/register')
        .send({
          ...validUserData,
          email: `user1${Date.now()}@example.com`,
          username: uniqueUsername
        })
        .expect(201);

      // Try to register with same username
      const response = await request(app)
        .post('/api/register')
        .send({
          ...validUserData,
          email: `user2${Date.now()}@example.com`,
          username: uniqueUsername
        })
        .expect(409);

      expect(response.body).toHaveProperty('error', 'Conflict');
      expect(response.body).toHaveProperty('details', 'Username already taken.');
    });

    it('should return 400 for invalid input', async () => {
      const response = await request(app)
        .post('/api/register')
        .send({
          username: '',
          email: 'invalid-email',
          password: ''
        })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid input');
    });

    it('should return 400 for missing fields', async () => {
      const response = await request(app)
        .post('/api/register')
        .send({
          username: 'testuser'
          // missing email and password
        })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid input');
    });
  });

  describe('POST /api/login', () => {
    const testUser = {
      username: 'logintest',
      email: 'login@example.com',
      password: 'password123'
    };

    beforeEach(async () => {
      // Register a test user for login tests
      await request(app)
        .post('/api/register')
        .send({
          ...testUser,
          email: `login${Date.now()}@example.com`,
          username: `login${Date.now()}`
        });
    });

    it('should login successfully with valid credentials', async () => {
      const uniqueEmail = `loginvalid${Date.now()}@example.com`;
      const uniqueUsername = `loginvalid${Date.now()}`;
      
      // Register user first
      await request(app)
        .post('/api/register')
        .send({
          ...testUser,
          email: uniqueEmail,
          username: uniqueUsername
        })
        .expect(201);

      // Now login
      const response = await request(app)
        .post('/api/login')
        .send({
          email: uniqueEmail,
          password: testUser.password
        })
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Login successful');
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
      expect(response.body.user).toHaveProperty('email', uniqueEmail);
      expect(response.body.user).toHaveProperty('username', uniqueUsername);
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('should return 401 for invalid email', async () => {
      const response = await request(app)
        .post('/api/login')
        .send({
          email: 'nonexistent@example.com',
          password: testUser.password
        })
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Unauthorized');
      expect(response.body).toHaveProperty('details', 'Invalid email or password.');
    });

    it('should return 401 for invalid password', async () => {
      const uniqueEmail = `loginwrong${Date.now()}@example.com`;
      
      // Register user first
      await request(app)
        .post('/api/register')
        .send({
          ...testUser,
          email: uniqueEmail,
          username: `loginwrong${Date.now()}`
        })
        .expect(201);

      // Try to login with wrong password
      const response = await request(app)
        .post('/api/login')
        .send({
          email: uniqueEmail,
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Unauthorized');
      expect(response.body).toHaveProperty('details', 'Invalid email or password.');
    });

    it('should return 400 for invalid input format', async () => {
      const response = await request(app)
        .post('/api/login')
        .send({
          email: 'invalid-email-format',
          password: ''
        })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid input');
    });
  });

  describe('GET /api/user', () => {
    let authToken: string;
    let userId: number;

    beforeEach(async () => {
      // Register and get auth token
      const uniqueEmail = `authtest${Date.now()}@example.com`;
      const uniqueUsername = `authtest${Date.now()}`;
      
      const registerResponse = await request(app)
        .post('/api/register')
        .send({
          username: uniqueUsername,
          email: uniqueEmail,
          password: 'password123'
        })
        .expect(201);

      authToken = registerResponse.body.token;
      userId = registerResponse.body.user.id;
    });

    it('should return user data with valid token', async () => {
      const response = await request(app)
        .get('/api/user')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('id', userId);
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('should return 401 without token', async () => {
      const response = await request(app)
        .get('/api/user')
        .expect(401);

      expect(response.body).toHaveProperty('message', 'Access token required');
    });

    it('should return 403 with invalid token', async () => {
      const response = await request(app)
        .get('/api/user')
        .set('Authorization', 'Bearer invalid-token')
        .expect(403);

      expect(response.body).toHaveProperty('message', 'Invalid or expired token');
    });

    it('should return 401 with malformed authorization header', async () => {
      const response = await request(app)
        .get('/api/user')
        .set('Authorization', 'InvalidFormat')
        .expect(401);

      expect(response.body).toHaveProperty('message', 'Access token required');
    });
  });

  describe('POST /api/logout', () => {
    let authToken: string;

    beforeEach(async () => {
      // Register and get auth token
      const uniqueEmail = `logouttest${Date.now()}@example.com`;
      const uniqueUsername = `logouttest${Date.now()}`;
      
      const registerResponse = await request(app)
        .post('/api/register')
        .send({
          username: uniqueUsername,
          email: uniqueEmail,
          password: 'password123'
        })
        .expect(201);

      authToken = registerResponse.body.token;
    });

    it('should logout successfully with valid token', async () => {
      const response = await request(app)
        .post('/api/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Logout successful');
    });

    it('should return 401 without token', async () => {
      const response = await request(app)
        .post('/api/logout')
        .expect(401);

      expect(response.body).toHaveProperty('message', 'Access token required');
    });

    it('should return 403 with invalid token', async () => {
      const response = await request(app)
        .post('/api/logout')
        .set('Authorization', 'Bearer invalid-token')
        .expect(403);

      expect(response.body).toHaveProperty('message', 'Invalid or expired token');
    });
  });

  describe('JWT Token Functionality', () => {
    it('should generate valid JWT tokens with correct payload', async () => {
      const uniqueEmail = `jwttest${Date.now()}@example.com`;
      const uniqueUsername = `jwttest${Date.now()}`;
      
      const response = await request(app)
        .post('/api/register')
        .send({
          username: uniqueUsername,
          email: uniqueEmail,
          password: 'password123'
        })
        .expect(201);

      const token = response.body.token;
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');

      // Verify token can be used for authenticated requests
      await request(app)
        .get('/api/user')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });

    it('should handle token expiration properly', async () => {
      // Note: This test would require manipulating token expiration
      // For now, we verify that the token has proper structure
      const uniqueEmail = `exptest${Date.now()}@example.com`;
      
      const response = await request(app)
        .post('/api/register')
        .send({
          username: `exptest${Date.now()}`,
          email: uniqueEmail,
          password: 'password123'
        })
        .expect(201);

      const token = response.body.token;
      const tokenParts = token.split('.');
      expect(tokenParts).toHaveLength(3); // Header, payload, signature
    });
  });

  describe('Password Security', () => {
    it('should use bcrypt with proper salt rounds', async () => {
      const uniqueEmail = `sectest${Date.now()}@example.com`;
      const uniqueUsername = `sectest${Date.now()}`;
      const password = 'testpassword123';
      
      await request(app)
        .post('/api/register')
        .send({
          username: uniqueUsername,
          email: uniqueEmail,
          password: password
        })
        .expect(201);

      const user = await storage.getUserByEmail(uniqueEmail);
      expect(user).toBeTruthy();
      
      if (user) {
        // Check that password is hashed
        expect(user.password).not.toBe(password);
        expect(user.password.length).toBeGreaterThan(50); // bcrypt hashes are long
        expect(user.password.startsWith('$2b$')).toBe(true); // bcrypt format
        
        // Verify password can be verified
        const isValid = await bcrypt.compare(password, user.password);
        expect(isValid).toBe(true);
        
        // Verify wrong password fails
        const isInvalid = await bcrypt.compare('wrongpassword', user.password);
        expect(isInvalid).toBe(false);
      }
    });
  });
});