import express from 'express';
import { body, validationResult } from 'express-validator';
import { query } from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';

const router = express.Router();

// Get all suppliers
router.get('/', authenticate, async (req, res) => {
  try {
    const result = await query('SELECT * FROM suppliers ORDER BY name');
    res.json(result.rows);
  } catch (error) {
    console.error('Get suppliers error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create supplier
router.post('/', authenticate, authorize('admin'), [
  body('name').notEmpty().withMessage('Name is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, contact_person, email, phone, address } = req.body;
    const result = await query(
      `INSERT INTO suppliers (name, contact_person, email, phone, address)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name, contact_person || null, email || null, phone || null, address || null]
    );

    await auditLog(req.user.id, 'CREATE', 'suppliers', result.rows[0].id, { name });
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create supplier error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update supplier
router.put('/:id', authenticate, authorize('admin'), [
  body('name').notEmpty().withMessage('Name is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, contact_person, email, phone, address } = req.body;
    const result = await query(
      `UPDATE suppliers
       SET name = $1, contact_person = $2, email = $3, phone = $4, address = $5, updated_at = CURRENT_TIMESTAMP
       WHERE id = $6 RETURNING *`,
      [name, contact_person || null, email || null, phone || null, address || null, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Supplier not found' });
    }

    await auditLog(req.user.id, 'UPDATE', 'suppliers', req.params.id, { name });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update supplier error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete supplier
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const result = await query('DELETE FROM suppliers WHERE id = $1 RETURNING *', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Supplier not found' });
    }

    await auditLog(req.user.id, 'DELETE', 'suppliers', req.params.id, { name: result.rows[0].name });
    res.json({ message: 'Supplier deleted successfully' });
  } catch (error) {
    console.error('Delete supplier error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;

