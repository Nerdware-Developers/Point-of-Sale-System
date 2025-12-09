import express from 'express';
import { query, getClient } from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Get all credit sales
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, customer_id } = req.query;
    let sql = `
      SELECT cs.*, c.name as customer_name, c.phone as customer_phone,
             (SELECT COALESCE(SUM(amount), 0) FROM debt_payments WHERE credit_sale_id = cs.id) as total_paid
      FROM credit_sales cs
      LEFT JOIN customers c ON cs.customer_id = c.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (status) {
      sql += ` AND cs.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (customer_id) {
      sql += ` AND cs.customer_id = $${paramCount}`;
      params.push(customer_id);
      paramCount++;
    }

    sql += ` ORDER BY cs.created_at DESC`;

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get credit sales error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single credit sale
router.get('/:id', authenticate, async (req, res) => {
  try {
    const result = await query(
      `SELECT cs.*, c.name as customer_name, c.phone as customer_phone,
              (SELECT COALESCE(SUM(amount), 0) FROM debt_payments WHERE credit_sale_id = cs.id) as total_paid
       FROM credit_sales cs
       LEFT JOIN customers c ON cs.customer_id = c.id
       WHERE cs.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Credit sale not found' });
    }

    // Get payment history
    const payments = await query(
      `SELECT dp.*, u.full_name as created_by_name
       FROM debt_payments dp
       LEFT JOIN users u ON dp.created_by = u.id
       WHERE dp.credit_sale_id = $1
       ORDER BY dp.payment_date DESC`,
      [req.params.id]
    );

    res.json({
      ...result.rows[0],
      payments: payments.rows
    });
  } catch (error) {
    console.error('Get credit sale error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create credit sale
router.post('/', authenticate, async (req, res) => {
  try {
    const { sale_id, customer_id, total_amount, due_date, notes } = req.body;

    if (!sale_id || !customer_id || !total_amount) {
      return res.status(400).json({ error: 'Sale ID, customer ID, and total amount are required' });
    }

    const result = await query(
      `INSERT INTO credit_sales (sale_id, customer_id, total_amount, balance, due_date, notes)
       VALUES ($1, $2, $3, $3, $4, $5)
       RETURNING *`,
      [sale_id, customer_id, total_amount, due_date || null, notes || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create credit sale error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add payment to credit sale
router.post('/:id/payments', authenticate, async (req, res) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const { amount, payment_method, notes } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid payment amount is required' });
    }

    // Get current credit sale
    const creditSale = await client.query(
      'SELECT * FROM credit_sales WHERE id = $1',
      [req.params.id]
    );

    if (creditSale.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Credit sale not found' });
    }

    const currentBalance = parseFloat(creditSale.rows[0].balance);
    const paymentAmount = parseFloat(amount);

    if (paymentAmount > currentBalance) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Payment amount exceeds balance' });
    }

    // Add payment
    await client.query(
      `INSERT INTO debt_payments (credit_sale_id, amount, payment_method, notes, created_by)
       VALUES ($1, $2, $3, $4, $5)`,
      [req.params.id, paymentAmount, payment_method || 'cash', notes || null, req.user.id]
    );

    // Update credit sale
    const newBalance = currentBalance - paymentAmount;
    const newPaidAmount = parseFloat(creditSale.rows[0].paid_amount) + paymentAmount;
    const status = newBalance <= 0 ? 'paid' : 'partial';

    await client.query(
      `UPDATE credit_sales 
       SET balance = $1, paid_amount = $2, status = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [newBalance, newPaidAmount, status, req.params.id]
    );

    await client.query('COMMIT');

    const updated = await query('SELECT * FROM credit_sales WHERE id = $1', [req.params.id]);
    res.json(updated.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Add payment error:', error);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

// Get customer debt summary
router.get('/customer/:customer_id/summary', authenticate, async (req, res) => {
  try {
    const result = await query(
      `SELECT 
        COUNT(*) as total_credits,
        COALESCE(SUM(total_amount), 0) as total_debt,
        COALESCE(SUM(paid_amount), 0) as total_paid,
        COALESCE(SUM(balance), 0) as outstanding_balance,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
        COUNT(CASE WHEN status = 'partial' THEN 1 END) as partial_count
       FROM credit_sales
       WHERE customer_id = $1`,
      [req.params.customer_id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get customer debt summary error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;

