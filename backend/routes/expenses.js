import express from 'express';
import { body, validationResult } from 'express-validator';
import { query } from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';

const router = express.Router();

// Get all expenses
router.get('/', authenticate, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    let sql = `
      SELECT e.*, u.username as created_by_name
      FROM expenses e
      LEFT JOIN users u ON e.created_by = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (start_date) {
      sql += ` AND e.date >= $${paramCount}`;
      params.push(start_date);
      paramCount++;
    }

    if (end_date) {
      sql += ` AND e.date <= $${paramCount}`;
      params.push(end_date);
      paramCount++;
    }

    sql += ` ORDER BY e.date DESC`;

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get expenses error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create expense
router.post('/', authenticate, authorize('admin'), [
  body('description').notEmpty().withMessage('Description is required'),
  body('amount').isFloat({ min: 0 }).withMessage('Valid amount is required'),
  body('date').notEmpty().withMessage('Date is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { description, amount, category, date } = req.body;
    const result = await query(
      `INSERT INTO expenses (description, amount, category, date, created_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [description, amount, category || null, date, req.user.id]
    );

    await auditLog(req.user.id, 'CREATE', 'expenses', result.rows[0].id, { description, amount });
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create expense error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update expense
router.put('/:id', authenticate, authorize('admin'), [
  body('description').notEmpty().withMessage('Description is required'),
  body('amount').isFloat({ min: 0 }).withMessage('Valid amount is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { description, amount, category, date } = req.body;
    const result = await query(
      `UPDATE expenses
       SET description = $1, amount = $2, category = $3, date = $4
       WHERE id = $5 RETURNING *`,
      [description, amount, category || null, date, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    await auditLog(req.user.id, 'UPDATE', 'expenses', req.params.id, { description, amount });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update expense error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete expense
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const result = await query('DELETE FROM expenses WHERE id = $1 RETURNING *', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    await auditLog(req.user.id, 'DELETE', 'expenses', req.params.id, { description: result.rows[0].description });
    res.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    console.error('Delete expense error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;

