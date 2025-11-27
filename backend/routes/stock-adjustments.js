import express from 'express';
import { body, validationResult } from 'express-validator';
import { query, getClient } from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';

const router = express.Router();

// Get all stock adjustments
router.get('/', authenticate, async (req, res) => {
  try {
    const { product_id, start_date, end_date } = req.query;
    let sql = `
      SELECT sa.*, p.name as product_name, u.username as created_by_name
      FROM stock_adjustments sa
      LEFT JOIN products p ON sa.product_id = p.id
      LEFT JOIN users u ON sa.created_by = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (product_id) {
      sql += ` AND sa.product_id = $${paramCount}`;
      params.push(product_id);
      paramCount++;
    }

    if (start_date) {
      sql += ` AND DATE(sa.created_at) >= $${paramCount}`;
      params.push(start_date);
      paramCount++;
    }

    if (end_date) {
      sql += ` AND DATE(sa.created_at) <= $${paramCount}`;
      params.push(end_date);
      paramCount++;
    }

    sql += ` ORDER BY sa.created_at DESC`;

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get stock adjustments error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create stock adjustment
router.post('/', authenticate, authorize('admin'), [
  body('product_id').notEmpty().withMessage('Product is required'),
  body('adjustment_type').isIn(['add', 'remove', 'set']).withMessage('Invalid adjustment type'),
  body('quantity_change').isInt().withMessage('Valid quantity change is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { product_id, adjustment_type, quantity_change, reason } = req.body;

    const client = await getClient();

    try {
      await client.query('BEGIN');

      // Get current stock
      const productResult = await client.query('SELECT stock_quantity FROM products WHERE id = $1', [product_id]);
      if (productResult.rows.length === 0) {
        throw new Error('Product not found');
      }

      const previousQuantity = productResult.rows[0].stock_quantity;
      let newQuantity;

      if (adjustment_type === 'add') {
        newQuantity = previousQuantity + Math.abs(quantity_change);
      } else if (adjustment_type === 'remove') {
        newQuantity = Math.max(0, previousQuantity - Math.abs(quantity_change));
      } else {
        newQuantity = quantity_change;
      }

      // Update product stock
      await client.query(
        'UPDATE products SET stock_quantity = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [newQuantity, product_id]
      );

      // Create adjustment record
      const adjustmentResult = await client.query(
        `INSERT INTO stock_adjustments (product_id, adjustment_type, quantity_change, reason, previous_quantity, new_quantity, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [product_id, adjustment_type, quantity_change, reason || null, previousQuantity, newQuantity, req.user.id]
      );

      await client.query('COMMIT');
      client.release();

      await auditLog(req.user.id, 'STOCK_ADJUSTMENT', 'stock_adjustments', adjustmentResult.rows[0].id, {
        product_id,
        adjustment_type,
        quantity_change,
      });
      res.status(201).json(adjustmentResult.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      client.release();
      throw error;
    }
  } catch (error) {
    console.error('Create stock adjustment error:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

export default router;

