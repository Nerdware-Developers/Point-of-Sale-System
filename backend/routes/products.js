import express from 'express';
import { body, validationResult } from 'express-validator';
import { query } from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { auditLog } from '../middleware/audit.js';

const router = express.Router();

// Get all products
router.get('/', authenticate, async (req, res) => {
  try {
    const { search, category_id, low_stock } = req.query;
    let sql = `
      SELECT p.*, c.name as category_name, s.name as supplier_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (search) {
      sql += ` AND (p.name ILIKE $${paramCount} OR p.barcode = $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    if (category_id) {
      sql += ` AND p.category_id = $${paramCount}`;
      params.push(category_id);
      paramCount++;
    }

    if (low_stock === 'true') {
      sql += ` AND p.stock_quantity < 10`;
    }

    sql += ` ORDER BY p.created_at DESC`;

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single product
router.get('/:id', authenticate, async (req, res) => {
  try {
    const result = await query(
      `SELECT p.*, c.name as category_name, s.name as supplier_name
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       LEFT JOIN suppliers s ON p.supplier_id = s.id
       WHERE p.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create product
router.post('/', authenticate, authorize('admin'), [
  body('name').notEmpty().withMessage('Name is required'),
  body('buying_price').isFloat({ min: 0 }).withMessage('Valid buying price is required'),
  body('selling_price').isFloat({ min: 0 }).withMessage('Valid selling price is required'),
  body('stock_quantity').isInt({ min: 0 }).withMessage('Valid stock quantity is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, category_id, buying_price, selling_price, stock_quantity, barcode, supplier_id, expiry_date } = req.body;

    // Generate barcode if not provided
    let productBarcode = barcode;
    if (!productBarcode) {
      productBarcode = `PRD${Date.now()}${Math.floor(Math.random() * 1000)}`;
    }

    const result = await query(
      `INSERT INTO products (name, category_id, buying_price, selling_price, stock_quantity, barcode, supplier_id, expiry_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [name, category_id || null, buying_price, selling_price, stock_quantity, productBarcode, supplier_id || null, expiry_date || null]
    );

    await auditLog(req.user.id, 'CREATE', 'products', result.rows[0].id, { name, barcode: productBarcode });
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create product error:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Barcode already exists' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// Update product
router.put('/:id', authenticate, authorize('admin'), [
  body('name').notEmpty().withMessage('Name is required'),
  body('buying_price').isFloat({ min: 0 }).withMessage('Valid buying price is required'),
  body('selling_price').isFloat({ min: 0 }).withMessage('Valid selling price is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, category_id, buying_price, selling_price, stock_quantity, barcode, supplier_id, expiry_date } = req.body;

    const result = await query(
      `UPDATE products
       SET name = $1, category_id = $2, buying_price = $3, selling_price = $4,
           stock_quantity = $5, barcode = $6, supplier_id = $7, expiry_date = $8, updated_at = CURRENT_TIMESTAMP
       WHERE id = $9
       RETURNING *`,
      [name, category_id || null, buying_price, selling_price, stock_quantity, barcode, supplier_id || null, expiry_date || null, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    await auditLog(req.user.id, 'UPDATE', 'products', req.params.id, { name });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete product
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const result = await query('DELETE FROM products WHERE id = $1 RETURNING *', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    await auditLog(req.user.id, 'DELETE', 'products', req.params.id, { name: result.rows[0].name });
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update stock
router.patch('/:id/stock', authenticate, authorize('admin'), [
  body('quantity').isInt().withMessage('Valid quantity is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { quantity } = req.body;
    const result = await query(
      'UPDATE products SET stock_quantity = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [quantity, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    await auditLog(req.user.id, 'UPDATE_STOCK', 'products', req.params.id, { quantity });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update stock error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;

