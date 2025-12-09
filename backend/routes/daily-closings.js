import express from 'express';
import { query, getClient } from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Get all daily closings
router.get('/', authenticate, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    let sql = `
      SELECT dc.*, u.full_name as closed_by_name
      FROM daily_closings dc
      LEFT JOIN users u ON dc.closed_by = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (start_date) {
      sql += ` AND dc.closing_date >= $${paramCount}`;
      params.push(start_date);
      paramCount++;
    }

    if (end_date) {
      sql += ` AND dc.closing_date <= $${paramCount}`;
      params.push(end_date);
      paramCount++;
    }

    sql += ` ORDER BY dc.closing_date DESC`;

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get daily closings error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single daily closing
router.get('/:id', authenticate, async (req, res) => {
  try {
    const result = await query(
      `SELECT dc.*, u.full_name as closed_by_name
       FROM daily_closings dc
       LEFT JOIN users u ON dc.closed_by = u.id
       WHERE dc.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Daily closing not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get daily closing error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get closing for specific date
router.get('/date/:date', authenticate, async (req, res) => {
  try {
    const result = await query(
      `SELECT dc.*, u.full_name as closed_by_name
       FROM daily_closings dc
       LEFT JOIN users u ON dc.closed_by = u.id
       WHERE dc.closing_date = $1`,
      [req.params.date]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No closing found for this date' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get daily closing by date error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create or update daily closing
router.post('/', authenticate, async (req, res) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const {
      closing_date,
      opening_cash,
      closing_cash,
      notes
    } = req.body;

    if (!closing_date) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Closing date is required' });
    }

    // Calculate sales for the day
    const salesResult = await client.query(
      `SELECT 
        COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN total_amount ELSE 0 END), 0) as cash_sales,
        COALESCE(SUM(CASE WHEN payment_method = 'card' THEN total_amount ELSE 0 END), 0) as card_sales,
        COALESCE(SUM(CASE WHEN payment_method = 'mobile' THEN total_amount ELSE 0 END), 0) as mobile_sales,
        COALESCE(SUM(total_amount), 0) as total_sales
       FROM sales
       WHERE DATE(date_time) = $1`,
      [closing_date]
    );

    const sales = salesResult.rows[0];

    // Calculate expenses for the day
    const expensesResult = await client.query(
      `SELECT COALESCE(SUM(amount), 0) as total_expenses
       FROM expenses
       WHERE date = $1`,
      [closing_date]
    );

    const totalExpenses = parseFloat(expensesResult.rows[0].total_expenses);
    const cashSales = parseFloat(sales.cash_sales);
    const expectedCash = parseFloat(opening_cash || 0) + cashSales - totalExpenses;
    const cashDifference = parseFloat(closing_cash || 0) - expectedCash;

    // Check if closing already exists
    const existing = await client.query(
      'SELECT id FROM daily_closings WHERE closing_date = $1',
      [closing_date]
    );

    let result;
    if (existing.rows.length > 0) {
      // Update existing
      result = await client.query(
        `UPDATE daily_closings 
         SET opening_cash = $1, closing_cash = $2, cash_sales = $3, card_sales = $4,
             mobile_sales = $5, total_sales = $6, total_expenses = $7, cash_difference = $8,
             notes = $9, closed_by = $10, closed_at = CURRENT_TIMESTAMP
         WHERE closing_date = $11
         RETURNING *`,
        [
          opening_cash || 0, closing_cash || 0, cashSales, parseFloat(sales.card_sales),
          parseFloat(sales.mobile_sales), parseFloat(sales.total_sales), totalExpenses,
          cashDifference, notes || null, req.user.id, closing_date
        ]
      );
    } else {
      // Create new
      result = await client.query(
        `INSERT INTO daily_closings 
         (closing_date, opening_cash, closing_cash, cash_sales, card_sales, mobile_sales,
          total_sales, total_expenses, cash_difference, notes, closed_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
        [
          closing_date, opening_cash || 0, closing_cash || 0, cashSales,
          parseFloat(sales.card_sales), parseFloat(sales.mobile_sales),
          parseFloat(sales.total_sales), totalExpenses, cashDifference,
          notes || null, req.user.id
        ]
      );
    }

    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create daily closing error:', error);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

// Get today's summary (for closing)
router.get('/today/summary', authenticate, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Get sales summary
    const salesResult = await query(
      `SELECT 
        COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN total_amount ELSE 0 END), 0) as cash_sales,
        COALESCE(SUM(CASE WHEN payment_method = 'card' THEN total_amount ELSE 0 END), 0) as card_sales,
        COALESCE(SUM(CASE WHEN payment_method = 'mobile' THEN total_amount ELSE 0 END), 0) as mobile_sales,
        COALESCE(SUM(total_amount), 0) as total_sales,
        COUNT(*) as transaction_count
       FROM sales
       WHERE DATE(date_time) = $1`,
      [today]
    );

    // Get expenses
    const expensesResult = await query(
      `SELECT COALESCE(SUM(amount), 0) as total_expenses
       FROM expenses
       WHERE date = $1`,
      [today]
    );

    // Check if already closed
    const closingResult = await query(
      'SELECT * FROM daily_closings WHERE closing_date = $1',
      [today]
    );

    res.json({
      date: today,
      sales: salesResult.rows[0],
      expenses: expensesResult.rows[0],
      is_closed: closingResult.rows.length > 0,
      closing: closingResult.rows[0] || null
    });
  } catch (error) {
    console.error('Get today summary error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;

