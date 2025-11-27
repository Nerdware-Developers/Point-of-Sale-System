import express from 'express';
import { query } from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';

const router = express.Router();

// Daily sales report
router.get('/daily', authenticate, async (req, res) => {
  try {
    const { date } = req.query;
    const reportDate = date || new Date().toISOString().split('T')[0];

    const salesResult = await query(
      `SELECT 
        COUNT(*) as total_sales,
        SUM(total_amount) as total_revenue,
        SUM(subtotal) as total_subtotal,
        SUM(tax) as total_tax,
        SUM(discount) as total_discount,
        SUM(cash_given - change_returned) as total_cash
       FROM sales
       WHERE DATE(date_time) = $1`,
      [reportDate]
    );

    const topProductsResult = await query(
      `SELECT 
        jsonb_array_elements(items) as item
       FROM sales
       WHERE DATE(date_time) = $1`,
      [reportDate]
    );

    // Aggregate top products
    const productMap = {};
    topProductsResult.rows.forEach(row => {
      const item = row.item;
      const productId = item.product_id;
      if (productMap[productId]) {
        productMap[productId].quantity += item.quantity;
        productMap[productId].revenue += item.price * item.quantity;
      } else {
        productMap[productId] = {
          product_id: productId,
          name: item.name,
          quantity: item.quantity,
          revenue: item.price * item.quantity,
        };
      }
    });

    const topProducts = Object.values(productMap).sort((a, b) => b.quantity - a.quantity).slice(0, 10);

    res.json({
      date: reportDate,
      summary: salesResult.rows[0],
      top_products: topProducts,
    });
  } catch (error) {
    console.error('Daily report error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Monthly sales report
router.get('/monthly', authenticate, async (req, res) => {
  try {
    const { year, month } = req.query;
    const reportYear = year || new Date().getFullYear();
    const reportMonth = month || new Date().getMonth() + 1;

    const salesResult = await query(
      `SELECT 
        DATE(date_time) as sale_date,
        COUNT(*) as total_sales,
        SUM(total_amount) as total_revenue
       FROM sales
       WHERE EXTRACT(YEAR FROM date_time) = $1 AND EXTRACT(MONTH FROM date_time) = $2
       GROUP BY DATE(date_time)
       ORDER BY sale_date`,
      [reportYear, reportMonth]
    );

    const summaryResult = await query(
      `SELECT 
        COUNT(*) as total_sales,
        SUM(total_amount) as total_revenue,
        SUM(subtotal) as total_subtotal,
        SUM(tax) as total_tax,
        SUM(discount) as total_discount
       FROM sales
       WHERE EXTRACT(YEAR FROM date_time) = $1 AND EXTRACT(MONTH FROM date_time) = $2`,
      [reportYear, reportMonth]
    );

    res.json({
      year: reportYear,
      month: reportMonth,
      daily_breakdown: salesResult.rows,
      summary: summaryResult.rows[0],
    });
  } catch (error) {
    console.error('Monthly report error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Best selling products
router.get('/top-products', authenticate, async (req, res) => {
  try {
    const { start_date, end_date, limit = 10 } = req.query;
    let sql = `
      SELECT 
        jsonb_array_elements(items) as item
      FROM sales
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (start_date) {
      sql += ` AND DATE(date_time) >= $${paramCount}`;
      params.push(start_date);
      paramCount++;
    }

    if (end_date) {
      sql += ` AND DATE(date_time) <= $${paramCount}`;
      params.push(end_date);
      paramCount++;
    }

    const result = await query(sql, params);

    // Aggregate products
    const productMap = {};
    result.rows.forEach(row => {
      const item = row.item;
      const productId = item.product_id;
      if (productMap[productId]) {
        productMap[productId].quantity += item.quantity;
        productMap[productId].revenue += item.price * item.quantity;
      } else {
        productMap[productId] = {
          product_id: productId,
          name: item.name,
          quantity: item.quantity,
          revenue: item.price * item.quantity,
        };
      }
    });

    const topProducts = Object.values(productMap)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, parseInt(limit));

    res.json(topProducts);
  } catch (error) {
    console.error('Top products error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Profit calculation
router.get('/profit', authenticate, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    let sql = `
      SELECT 
        jsonb_array_elements(items) as item
      FROM sales
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (start_date) {
      sql += ` AND DATE(date_time) >= $${paramCount}`;
      params.push(start_date);
      paramCount++;
    }

    if (end_date) {
      sql += ` AND DATE(date_time) <= $${paramCount}`;
      params.push(end_date);
      paramCount++;
    }

    const result = await query(sql, params);

    let totalProfit = 0;
    let totalRevenue = 0;
    let totalCost = 0;

    for (const row of result.rows) {
      const item = row.item;
      const productResult = await query('SELECT buying_price, selling_price FROM products WHERE id = $1', [item.product_id]);
      
      if (productResult.rows.length > 0) {
        const product = productResult.rows[0];
        const profit = (product.selling_price - product.buying_price) * item.quantity;
        totalProfit += profit;
        totalRevenue += item.price * item.quantity;
        totalCost += product.buying_price * item.quantity;
      }
    }

    res.json({
      total_profit: totalProfit,
      total_revenue: totalRevenue,
      total_cost: totalCost,
      profit_margin: totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(2) : 0,
    });
  } catch (error) {
    console.error('Profit calculation error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Export to PDF
router.get('/export/pdf', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    let sql = `SELECT * FROM sales WHERE 1=1`;
    const params = [];
    let paramCount = 1;

    if (start_date) {
      sql += ` AND DATE(date_time) >= $${paramCount}`;
      params.push(start_date);
      paramCount++;
    }

    if (end_date) {
      sql += ` AND DATE(date_time) <= $${paramCount}`;
      params.push(end_date);
      paramCount++;
    }

    sql += ` ORDER BY date_time DESC`;

    const result = await query(sql, params);

    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=sales-report.pdf');

    doc.pipe(res);
    doc.fontSize(20).text('Sales Report', { align: 'center' });
    doc.moveDown();

    result.rows.forEach((sale, index) => {
      doc.fontSize(12).text(`Sale ${index + 1}: ${sale.sale_id}`);
      doc.text(`Date: ${new Date(sale.date_time).toLocaleString()}`);
      doc.text(`Total: $${sale.total_amount}`);
      doc.moveDown();
    });

    doc.end();
  } catch (error) {
    console.error('PDF export error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Export to Excel
router.get('/export/excel', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    let sql = `SELECT * FROM sales WHERE 1=1`;
    const params = [];
    let paramCount = 1;

    if (start_date) {
      sql += ` AND DATE(date_time) >= $${paramCount}`;
      params.push(start_date);
      paramCount++;
    }

    if (end_date) {
      sql += ` AND DATE(date_time) <= $${paramCount}`;
      params.push(end_date);
      paramCount++;
    }

    sql += ` ORDER BY date_time DESC`;

    const result = await query(sql, params);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sales Report');

    worksheet.columns = [
      { header: 'Sale ID', key: 'sale_id', width: 20 },
      { header: 'Date', key: 'date_time', width: 20 },
      { header: 'Total Amount', key: 'total_amount', width: 15 },
      { header: 'Payment Method', key: 'payment_method', width: 15 },
    ];

    result.rows.forEach(sale => {
      worksheet.addRow({
        sale_id: sale.sale_id,
        date_time: new Date(sale.date_time).toLocaleString(),
        total_amount: sale.total_amount,
        payment_method: sale.payment_method,
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=sales-report.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Excel export error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Sales by cashier report
router.get('/cashier-performance', authenticate, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    let sql = `
      SELECT 
        u.id,
        u.username,
        u.full_name,
        COUNT(s.id) as total_sales,
        SUM(s.total_amount) as total_revenue,
        AVG(s.total_amount) as avg_sale_amount
      FROM users u
      LEFT JOIN sales s ON u.id = s.cashier_id
      WHERE u.role = 'cashier'
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

    sql += ` GROUP BY u.id, u.username, u.full_name ORDER BY total_revenue DESC`;

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Cashier performance error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Stock valuation report
router.get('/stock-valuation', authenticate, async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        SUM(stock_quantity * buying_price) as total_cost_value,
        SUM(stock_quantity * selling_price) as total_selling_value,
        SUM(stock_quantity * (selling_price - buying_price)) as total_profit_potential,
        COUNT(*) as total_products,
        SUM(CASE WHEN stock_quantity < 10 THEN 1 ELSE 0 END) as low_stock_count
      FROM products
      WHERE is_active = true OR is_active IS NULL
    `);

    const productsResult = await query(`
      SELECT 
        c.name as category_name,
        SUM(p.stock_quantity * p.buying_price) as category_cost_value,
        SUM(p.stock_quantity * p.selling_price) as category_selling_value
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = true OR p.is_active IS NULL
      GROUP BY c.name
      ORDER BY category_selling_value DESC
    `);

    res.json({
      summary: result.rows[0],
      by_category: productsResult.rows,
    });
  } catch (error) {
    console.error('Stock valuation error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;

