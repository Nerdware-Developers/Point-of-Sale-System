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

// Generate barcode image URL
router.get('/image/:barcode', authenticate, async (req, res) => {
  try {
    const { barcode } = req.params;
    const barcodeUrl = `https://barcode.tec-it.com/barcode.ashx?data=${barcode}&code=Code128&translate-esc=on&dpi=96`;
    res.json({ barcode_url: barcodeUrl, barcode });
  } catch (error) {
    console.error('Get barcode image error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Print barcode labels (batch)
router.post('/print-labels', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { product_ids } = req.body;
    
    if (!product_ids || !Array.isArray(product_ids)) {
      return res.status(400).json({ error: 'Product IDs array is required' });
    }

    const result = await query(
      `SELECT id, name, barcode, selling_price
       FROM products
       WHERE id = ANY($1::int[])`,
      [product_ids]
    );

    const labels = result.rows.map(product => ({
      ...product,
      barcode_url: product.barcode 
        ? `https://barcode.tec-it.com/barcode.ashx?data=${product.barcode}&code=Code128&translate-esc=on&dpi=96`
        : null
    }));

    res.json({ labels });
  } catch (error) {
    console.error('Print labels error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;

