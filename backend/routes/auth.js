import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { query } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Register
router.post('/register', [
  body('username').notEmpty().withMessage('Username is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').isIn(['admin', 'cashier']).withMessage('Role must be admin or cashier'),
], async (req, res) => {
  try {
    console.log('[Auth] Registration request received:', { username: req.body.username, email: req.body.email });
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('[Auth] Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, email, password, role, full_name } = req.body;

    // Check if user exists
    const existingUser = await query('SELECT id FROM users WHERE username = $1 OR email = $2', [username, email]);
    if (existingUser.rows.length > 0) {
      console.log('[Auth] User already exists:', username);
      return res.status(400).json({ error: 'Username or email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const result = await query(
      'INSERT INTO users (username, email, password, role, full_name) VALUES ($1, $2, $3, $4, $5) RETURNING id, username, email, role, full_name',
      [username, email, hashedPassword, role, full_name || username]
    );

    console.log('[Auth] User created successfully:', result.rows[0].username);
    res.status(201).json({ message: 'User created successfully', user: result.rows[0] });
  } catch (error) {
    console.error('[Auth] Register error:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// Login
router.post('/login', [
  body('username').notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required'),
], async (req, res) => {
  try {
    console.log('[Auth] Login request received:', { username: req.body.username, hasPassword: !!req.body.password });
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('[Auth] Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password } = req.body;
    console.log('[Auth] Attempting login for username:', username);

    // Check JWT_SECRET is set
    const jwtSecret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
    if (!process.env.JWT_SECRET) {
      console.warn('⚠️  JWT_SECRET not set in .env file, using default (not secure for production!)');
    }

    // Find user
    const result = await query('SELECT * FROM users WHERE username = $1 OR email = $1', [username]);
    if (result.rows.length === 0) {
      console.error(`Login failed: User not found - ${username}`);
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const user = result.rows[0];

    // Check password
    if (!user.password) {
      console.error(`Login failed: User has no password - ${username}`);
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      console.error(`Login failed: Invalid password for user - ${username}`);
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Generate token
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      jwtSecret,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    console.log(`Login successful: ${user.username} (${user.role})`);

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        full_name: user.full_name,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

// Get current user
router.get('/me', authenticate, async (req, res) => {
  res.json({ user: req.user });
});

export default router;

