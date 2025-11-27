import express from 'express';
import { query } from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';
import ExcelJS from 'exceljs';

const router = express.Router();

// Export products to Excel
router.get('/products/export', authenticate, authorize('admin'), async (req, res) => {
  try {
    const result = await query(`
      SELECT p.*, c.name as category_name, s.name as supplier_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      ORDER BY p.name
    `);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Products');

    worksheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Name', key: 'name', width: 30 },
      { header: 'Category', key: 'category_name', width: 20 },
      { header: 'Barcode', key: 'barcode', width: 20 },
      { header: 'Buying Price', key: 'buying_price', width: 15 },
      { header: 'Selling Price', key: 'selling_price', width: 15 },
      { header: 'Stock Quantity', key: 'stock_quantity', width: 15 },
      { header: 'Supplier', key: 'supplier_name', width: 20 },
      { header: 'Expiry Date', key: 'expiry_date', width: 15 },
    ];

    result.rows.forEach((product) => {
      worksheet.addRow({
        id: product.id,
        name: product.name,
        category_name: product.category_name || 'N/A',
        barcode: product.barcode || 'N/A',
        buying_price: parseFloat(product.buying_price),
        selling_price: parseFloat(product.selling_price),
        stock_quantity: product.stock_quantity,
        supplier_name: product.supplier_name || 'N/A',
        expiry_date: product.expiry_date || 'N/A',
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=products-export.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Export products error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Import products from Excel
router.post('/products/import', authenticate, authorize('admin'), async (req, res) => {
  try {
    // This would require multer for file upload
    // For now, return a message
    res.json({ message: 'Import functionality requires file upload. Please use the frontend import feature.' });
  } catch (error) {
    console.error('Import products error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;

