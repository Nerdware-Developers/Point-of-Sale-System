import express from 'express';
import { body, validationResult } from 'express-validator';
import { query } from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';

const router = express.Router();

// Get all purchase orders
router.get('/', authenticate, async (req, res) => {
  try {
    const { status } = req.query;
    let sql = `
      SELECT po.*, s.name as supplier_name, u.username as created_by_name
      FROM purchase_orders po
      LEFT JOIN suppliers s ON po.supplier_id = s.id
      LEFT JOIN users u ON po.created_by = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (status) {
      sql += ` AND po.status = $${paramCount}`;
      params.push(status);
    }

    sql += ` ORDER BY po.order_date DESC`;

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get purchase orders error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create purchase order
router.post('/', authenticate, authorize('admin'), [
  body('supplier_id').notEmpty().withMessage('Supplier is required'),
  body('items').isArray({ min: 1 }).withMessage('Items array is required'),
  body('total_amount').isFloat({ min: 0 }).withMessage('Valid total amount is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { supplier_id, items, total_amount, order_date, expected_date } = req.body;
    const orderId = `PO-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const result = await query(
      `INSERT INTO purchase_orders (order_id, supplier_id, items, total_amount, order_date, expected_date, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        orderId,
        supplier_id,
        JSON.stringify(items),
        total_amount,
        order_date || new Date().toISOString().split('T')[0],
        expected_date || null,
        req.user.id,
      ]
    );

    await auditLog(req.user.id, 'CREATE', 'purchase_orders', result.rows[0].id, { order_id: orderId });
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create purchase order error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update purchase order status
router.patch('/:id/status', authenticate, authorize('admin'), [
  body('status').isIn(['pending', 'received', 'cancelled']).withMessage('Invalid status'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { status, received_date } = req.body;
    const updateFields = ['status = $1', 'updated_at = CURRENT_TIMESTAMP'];
    const params = [status];
    let paramCount = 2;

    if (status === 'received' && received_date) {
      updateFields.push(`received_date = $${paramCount}`);
      params.push(received_date);
      paramCount++;
    }

    params.push(req.params.id);

    const result = await query(
      `UPDATE purchase_orders SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }

    // If received, update product stock
    if (status === 'received') {
      const items = result.rows[0].items;
      if (typeof items === 'string') {
        const parsedItems = JSON.parse(items);
        for (const item of parsedItems) {
          await query(
            'UPDATE products SET stock_quantity = stock_quantity + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [item.quantity, item.product_id]
          );
        }
      }
    }

    await auditLog(req.user.id, 'UPDATE_STATUS', 'purchase_orders', req.params.id, { status });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update purchase order error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;

