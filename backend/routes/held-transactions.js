import express from 'express';
import { body, validationResult } from 'express-validator';
import { query } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Get all held transactions
router.get('/', authenticate, async (req, res) => {
  try {
    const result = await query(
      `SELECT ht.*, u.username as cashier_name
       FROM held_transactions ht
       LEFT JOIN users u ON ht.cashier_id = u.id
       WHERE ht.expires_at IS NULL OR ht.expires_at > NOW()
       ORDER BY ht.created_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get held transactions error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create held transaction
router.post('/', authenticate, [
  body('items').isArray({ min: 1 }).withMessage('Items array is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { items, subtotal, tax, discount, total_amount, notes } = req.body;
    const transactionId = `HOLD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const result = await query(
      `INSERT INTO held_transactions (transaction_id, cashier_id, items, subtotal, tax, discount, total_amount, notes, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW() + INTERVAL '24 hours') RETURNING *`,
      [
        transactionId,
        req.user.id,
        JSON.stringify(items),
        subtotal || 0,
        tax || 0,
        discount || 0,
        total_amount || 0,
        notes || null,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create held transaction error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete held transaction
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const result = await query('DELETE FROM held_transactions WHERE id = $1 RETURNING *', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Held transaction not found' });
    }

    res.json({ message: 'Held transaction deleted successfully' });
  } catch (error) {
    console.error('Delete held transaction error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;

