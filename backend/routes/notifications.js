import express from 'express';
import { query } from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Get low stock alerts
router.get('/low-stock', authenticate, async (req, res) => {
  try {
    const { threshold = 10 } = req.query;
    const result = await query(
      `SELECT id, name, stock_quantity, barcode, category_id
       FROM products
       WHERE stock_quantity <= $1 AND (is_active = true OR is_active IS NULL)
       ORDER BY stock_quantity ASC`,
      [parseInt(threshold)]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get low stock error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get expiry alerts
router.get('/expiring', authenticate, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const result = await query(
      `SELECT id, name, expiry_date, stock_quantity
       FROM products
       WHERE expiry_date IS NOT NULL
         AND expiry_date <= CURRENT_DATE + INTERVAL '${parseInt(days)} days'
         AND expiry_date >= CURRENT_DATE
         AND (is_active = true OR is_active IS NULL)
       ORDER BY expiry_date ASC`
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get expiring products error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;

