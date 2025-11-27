import express from 'express';
import { query } from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Generate barcode for product
router.post('/product/:productId', authenticate, authorize('admin'), async (req, res) => {
  try {
    const result = await query('SELECT id, name, barcode FROM products WHERE id = $1', [req.params.productId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const product = result.rows[0];
    
    // Generate barcode if doesn't exist
    if (!product.barcode) {
      const newBarcode = `PRD${product.id}${Date.now().toString().slice(-6)}`;
      await query('UPDATE products SET barcode = $1 WHERE id = $2', [newBarcode, product.id]);
      product.barcode = newBarcode;
    }

    res.json({ 
      barcode: product.barcode, 
      product_name: product.name,
      barcode_url: `https://barcode.tec-it.com/barcode.ashx?data=${product.barcode}&code=Code128&translate-esc=on`
    });
  } catch (error) {
    console.error('Generate product barcode error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Generate barcode for product
router.post('/product/:productId', authenticate, authorize('admin'), async (req, res) => {
  try {
    const result = await query('SELECT id, name, barcode FROM products WHERE id = $1', [req.params.productId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const product = result.rows[0];
    
    // Generate barcode if doesn't exist
    if (!product.barcode) {
      const newBarcode = `PRD${product.id}${Date.now().toString().slice(-6)}`;
      await query('UPDATE products SET barcode = $1 WHERE id = $2', [newBarcode, product.id]);
      product.barcode = newBarcode;
    }

    res.json({ barcode: product.barcode, product_name: product.name });
  } catch (error) {
    console.error('Generate product barcode error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;

