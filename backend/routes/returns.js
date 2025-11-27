import express from 'express';
import { body, validationResult } from 'express-validator';
import { query, getClient } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';

const router = express.Router();

// Get all returns
router.get('/', authenticate, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    let sql = `
      SELECT r.*, u.username as cashier_name, c.name as customer_name, s.sale_id
      FROM returns r
      LEFT JOIN users u ON r.cashier_id = u.id
      LEFT JOIN customers c ON r.customer_id = c.id
      LEFT JOIN sales s ON r.sale_id = s.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (start_date) {
      sql += ` AND DATE(r.date_time) >= $${paramCount}`;
      params.push(start_date);
      paramCount++;
    }

    if (end_date) {
      sql += ` AND DATE(r.date_time) <= $${paramCount}`;
      params.push(end_date);
      paramCount++;
    }

    sql += ` ORDER BY r.date_time DESC`;

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get returns error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create return/refund
router.post('/', authenticate, [
  body('items').isArray({ min: 1 }).withMessage('Items array is required'),
  body('total_amount').isFloat({ min: 0 }).withMessage('Valid total amount is required'),
  body('refund_method').notEmpty().withMessage('Refund method is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { sale_id, customer_id, items, reason, total_amount, refund_method } = req.body;
    const returnId = `RET-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const client = await getClient();

    try {
      await client.query('BEGIN');

      // Create return record
      const returnResult = await client.query(
        `INSERT INTO returns (return_id, sale_id, cashier_id, customer_id, items, reason, total_amount, refund_method)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          returnId,
          sale_id || null,
          req.user.id,
          customer_id || null,
          JSON.stringify(items),
          reason || null,
          total_amount,
          refund_method,
        ]
      );

      // Restore product stock
      for (const item of items) {
        await client.query(
          'UPDATE products SET stock_quantity = stock_quantity + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [item.quantity, item.product_id]
        );
      }

      await client.query('COMMIT');
      client.release();

      await auditLog(req.user.id, 'CREATE_RETURN', 'returns', returnResult.rows[0].id, { return_id: returnId, total_amount });
      res.status(201).json(returnResult.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      client.release();
      throw error;
    }
  } catch (error) {
    console.error('Create return error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;

