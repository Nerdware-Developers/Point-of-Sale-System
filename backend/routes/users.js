import express from 'express';
import { query } from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Get all users
router.get('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const result = await query('SELECT id, username, email, role, full_name, created_at FROM users ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;

