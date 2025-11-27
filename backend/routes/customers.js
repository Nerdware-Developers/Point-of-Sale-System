import express from 'express';
import { body, validationResult } from 'express-validator';
import { query } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';

const router = express.Router();

// Get all customers
router.get('/', authenticate, async (req, res) => {
  try {
    const { search } = req.query;
    let sql = 'SELECT * FROM customers WHERE 1=1';
    const params = [];
    let paramCount = 1;

    if (search) {
      sql += ` AND (name ILIKE $${paramCount} OR phone ILIKE $${paramCount} OR email ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    sql += ' ORDER BY name';

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single customer
router.get('/:id', authenticate, async (req, res) => {
  try {
    const result = await query('SELECT * FROM customers WHERE id = $1', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get customer error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create customer
router.post('/', authenticate, [
  body('name').notEmpty().withMessage('Name is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, phone, address } = req.body;
    const result = await query(
      `INSERT INTO customers (name, email, phone, address)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [name, email || null, phone || null, address || null]
    );

    await auditLog(req.user.id, 'CREATE', 'customers', result.rows[0].id, { name });
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create customer error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update customer
router.put('/:id', authenticate, [
  body('name').notEmpty().withMessage('Name is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, phone, address, loyalty_points } = req.body;
    const result = await query(
      `UPDATE customers
       SET name = $1, email = $2, phone = $3, address = $4, loyalty_points = $5, updated_at = CURRENT_TIMESTAMP
       WHERE id = $6 RETURNING *`,
      [name, email || null, phone || null, address || null, loyalty_points || 0, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    await auditLog(req.user.id, 'UPDATE', 'customers', req.params.id, { name });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update customer error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete customer
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const result = await query('DELETE FROM customers WHERE id = $1 RETURNING *', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    await auditLog(req.user.id, 'DELETE', 'customers', req.params.id, { name: result.rows[0].name });
    res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    console.error('Delete customer error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get customer purchase history
router.get('/:id/purchases', authenticate, async (req, res) => {
  try {
    const result = await query(
      `SELECT s.*, u.username as cashier_name
       FROM sales s
       LEFT JOIN users u ON s.cashier_id = u.id
       WHERE s.customer_id = $1
       ORDER BY s.date_time DESC`,
      [req.params.id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get customer purchases error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;

