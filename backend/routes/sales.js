import express from 'express';
import { body, validationResult } from 'express-validator';
import { query, getClient } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';

const router = express.Router();

// Get all sales
router.get('/', authenticate, async (req, res) => {
  try {
    const { start_date, end_date, cashier_id } = req.query;
    let sql = `
      SELECT s.*, u.username as cashier_name, u.full_name as cashier_full_name
      FROM sales s
      LEFT JOIN users u ON s.cashier_id = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (start_date) {
      sql += ` AND DATE(s.date_time) >= $${paramCount}`;
      params.push(start_date);
      paramCount++;
    }

    if (end_date) {
      sql += ` AND DATE(s.date_time) <= $${paramCount}`;
      params.push(end_date);
      paramCount++;
    }

    if (cashier_id) {
      sql += ` AND s.cashier_id = $${paramCount}`;
      params.push(cashier_id);
      paramCount++;
    }

    sql += ` ORDER BY s.date_time DESC LIMIT 100`;

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get sales error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single sale
router.get('/:id', authenticate, async (req, res) => {
  try {
    const result = await query(
      `SELECT s.*, u.username as cashier_name, u.full_name as cashier_full_name
       FROM sales s
       LEFT JOIN users u ON s.cashier_id = u.id
       WHERE s.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sale not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get sale error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create sale
router.post('/', authenticate, [
  body('items').isArray({ min: 1 }).withMessage('Items array is required'),
  body('total_amount').isFloat({ min: 0 }).withMessage('Valid total amount is required'),
  body('payment_method').notEmpty().withMessage('Payment method is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { items, subtotal, tax = 0, discount = 0, total_amount, payment_method, cash_given, change_returned } = req.body;

    // Generate sale ID
    const saleId = `SALE-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Calculate subtotal if not provided
    const calculatedSubtotal = subtotal || items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // Start transaction
    const client = await getClient();

    try {
      await client.query('BEGIN');

      // Create sale record
      const { customer_id, payment_methods, notes } = req.body;
      const paymentMethodsJson = payment_methods ? JSON.stringify(payment_methods) : JSON.stringify([{ method: payment_method, amount: total_amount }]);
      
      const saleResult = await client.query(
        `INSERT INTO sales (sale_id, cashier_id, customer_id, items, subtotal, tax, discount, total_amount, payment_method, payment_methods, cash_given, change_returned, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         RETURNING *`,
        [
          saleId,
          req.user.id,
          customer_id || null,
          JSON.stringify(items),
          calculatedSubtotal,
          tax,
          discount,
          total_amount,
          payment_method,
          paymentMethodsJson,
          cash_given || null,
          change_returned || null,
          notes || null,
        ]
      );

      // Update product stock
      for (const item of items) {
        await client.query(
          'UPDATE products SET stock_quantity = stock_quantity - $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [item.quantity, item.product_id]
        );
      }

      await client.query('COMMIT');
      client.release();

      await auditLog(req.user.id, 'CREATE_SALE', 'sales', saleResult.rows[0].id, { sale_id: saleId, total_amount });
      res.status(201).json(saleResult.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      client.release();
      throw error;
    }
  } catch (error) {
    console.error('Create sale error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;

