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
      `SELECT id, name, expiry_date, stock_quantity,
              expiry_date - CURRENT_DATE as days_until_expiry
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

// Get products needing reorder
router.get('/reorder', authenticate, async (req, res) => {
  try {
    const result = await query(
      `SELECT id, name, stock_quantity, reorder_level, buying_price
       FROM products
       WHERE stock_quantity <= COALESCE(reorder_level, 10)
         AND (is_active = true OR is_active IS NULL)
       ORDER BY stock_quantity ASC`
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get reorder alerts error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get fast-moving products
router.get('/fast-moving', authenticate, async (req, res) => {
  try {
    const { days = 30, limit = 20 } = req.query;
    const result = await query(
      `SELECT p.id, p.name, p.stock_quantity, p.selling_price,
              COALESCE(SUM((item->>'quantity')::int), 0) as total_sold
       FROM products p
       LEFT JOIN sales s ON s.date_time >= CURRENT_DATE - INTERVAL '${parseInt(days)} days'
       LEFT JOIN LATERAL jsonb_array_elements(s.items) item ON (item->>'product_id')::int = p.id
       WHERE (p.is_active = true OR p.is_active IS NULL)
       GROUP BY p.id, p.name, p.stock_quantity, p.selling_price
       HAVING COALESCE(SUM((item->>'quantity')::int), 0) > 0
       ORDER BY total_sold DESC
       LIMIT $1`,
      [parseInt(limit)]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get fast-moving products error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get slow-moving products
router.get('/slow-moving', authenticate, async (req, res) => {
  try {
    const { days = 90, limit = 20 } = req.query;
    const result = await query(
      `SELECT p.id, p.name, p.stock_quantity, p.selling_price, p.last_sold_date,
              COALESCE(SUM((item->>'quantity')::int), 0) as total_sold,
              COALESCE(MAX(s.date_time)::date, NULL) as last_sale_date
       FROM products p
       LEFT JOIN sales s ON s.date_time >= CURRENT_DATE - INTERVAL '${parseInt(days)} days'
       LEFT JOIN LATERAL jsonb_array_elements(s.items) item ON (item->>'product_id')::int = p.id
       WHERE (p.is_active = true OR p.is_active IS NULL)
         AND p.stock_quantity > 0
       GROUP BY p.id, p.name, p.stock_quantity, p.selling_price, p.last_sold_date
       HAVING COALESCE(SUM((item->>'quantity')::int), 0) = 0
          OR (COALESCE(MAX(s.date_time)::date, NULL) IS NULL 
              AND (p.last_sold_date IS NULL OR p.last_sold_date < CURRENT_DATE - INTERVAL '${parseInt(days)} days'))
       ORDER BY COALESCE(p.last_sold_date, '1970-01-01'::date) ASC
       LIMIT $1`,
      [parseInt(limit)]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get slow-moving products error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all alerts summary
router.get('/summary', authenticate, async (req, res) => {
  try {
    const lowStock = await query(
      `SELECT COUNT(*) as count FROM products 
       WHERE stock_quantity <= COALESCE(reorder_level, 10) 
       AND (is_active = true OR is_active IS NULL)`
    );

    const expiring = await query(
      `SELECT COUNT(*) as count FROM products 
       WHERE expiry_date IS NOT NULL 
       AND expiry_date <= CURRENT_DATE + INTERVAL '30 days'
       AND expiry_date >= CURRENT_DATE
       AND (is_active = true OR is_active IS NULL)`
    );

    res.json({
      low_stock: parseInt(lowStock.rows[0].count),
      expiring_soon: parseInt(expiring.rows[0].count)
    });
  } catch (error) {
    console.error('Get alerts summary error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;

