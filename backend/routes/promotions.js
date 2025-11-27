import express from 'express';
import { body, validationResult } from 'express-validator';
import { query } from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';

const router = express.Router();

// Get all promotions
router.get('/', authenticate, async (req, res) => {
  try {
    const { active_only } = req.query;
    let sql = 'SELECT * FROM promotions WHERE 1=1';
    const params = [];
    let paramCount = 1;

    if (active_only === 'true') {
      sql += ` AND is_active = true AND start_date <= CURRENT_DATE AND end_date >= CURRENT_DATE`;
    }

    sql += ' ORDER BY created_at DESC';

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get promotions error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create promotion
router.post('/', authenticate, authorize('admin'), [
  body('name').notEmpty().withMessage('Name is required'),
  body('discount_type').isIn(['percentage', 'fixed']).withMessage('Invalid discount type'),
  body('discount_value').isFloat({ min: 0 }).withMessage('Valid discount value is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description, discount_type, discount_value, product_ids, category_ids, start_date, end_date } = req.body;

    const result = await query(
      `INSERT INTO promotions (name, description, discount_type, discount_value, product_ids, category_ids, start_date, end_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        name,
        description || null,
        discount_type,
        discount_value,
        product_ids ? JSON.stringify(product_ids) : null,
        category_ids ? JSON.stringify(category_ids) : null,
        start_date,
        end_date,
      ]
    );

    await auditLog(req.user.id, 'CREATE', 'promotions', result.rows[0].id, { name });
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create promotion error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update promotion
router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { name, description, discount_type, discount_value, product_ids, category_ids, start_date, end_date, is_active } = req.body;

    const result = await query(
      `UPDATE promotions
       SET name = $1, description = $2, discount_type = $3, discount_value = $4,
           product_ids = $5, category_ids = $6, start_date = $7, end_date = $8, is_active = $9, updated_at = CURRENT_TIMESTAMP
       WHERE id = $10 RETURNING *`,
      [
        name,
        description || null,
        discount_type,
        discount_value,
        product_ids ? JSON.stringify(product_ids) : null,
        category_ids ? JSON.stringify(category_ids) : null,
        start_date,
        end_date,
        is_active !== undefined ? is_active : true,
        req.params.id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Promotion not found' });
    }

    await auditLog(req.user.id, 'UPDATE', 'promotions', req.params.id, { name });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update promotion error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete promotion
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const result = await query('DELETE FROM promotions WHERE id = $1 RETURNING *', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Promotion not found' });
    }

    await auditLog(req.user.id, 'DELETE', 'promotions', req.params.id, { name: result.rows[0].name });
    res.json({ message: 'Promotion deleted successfully' });
  } catch (error) {
    console.error('Delete promotion error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;

