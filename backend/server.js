import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createConnection } from './config/database.js';
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import categoryRoutes from './routes/categories.js';
import saleRoutes from './routes/sales.js';
import reportRoutes from './routes/reports.js';
import supplierRoutes from './routes/suppliers.js';
import expenseRoutes from './routes/expenses.js';
import userRoutes from './routes/users.js';
import customerRoutes from './routes/customers.js';
import returnRoutes from './routes/returns.js';
import purchaseOrderRoutes from './routes/purchase-orders.js';
import stockAdjustmentRoutes from './routes/stock-adjustments.js';
import heldTransactionRoutes from './routes/held-transactions.js';
import promotionRoutes from './routes/promotions.js';
import barcodeRoutes from './routes/barcode.js';
import uploadRoutes from './routes/upload.js';
import importExportRoutes from './routes/import-export.js';
import notificationRoutes from './routes/notifications.js';
import creditSalesRoutes from './routes/credit-sales.js';
import dailyClosingsRoutes from './routes/daily-closings.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure uploads directory exists
import { existsSync, mkdirSync } from 'fs';
if (!existsSync('uploads')) {
  mkdirSync('uploads', { recursive: true });
}
app.use('/uploads', express.static('uploads'));

// Initialize database and ensure default users exist (non-blocking)
createConnection().then(async () => {
  // Ensure default users exist on startup
  try {
    const bcrypt = (await import('bcryptjs')).default;
    const { query } = await import('./config/database.js');
    
    // Check and create admin user
    const adminCheck = await query('SELECT id FROM users WHERE username = $1', ['admin']);
    if (adminCheck.rows.length === 0) {
      const adminPassword = await bcrypt.hash('admin123', 10);
      await query(
        `INSERT INTO users (username, email, password, role, full_name)
         VALUES ($1, $2, $3, $4, $5)`,
        ['admin', 'admin@pos.com', adminPassword, 'admin', 'Administrator']
      );
      console.log('✓ Created default admin user (username: admin, password: admin123)');
    }
    
    // Check and create cashier user
    const cashierCheck = await query('SELECT id FROM users WHERE username = $1', ['cashier']);
    if (cashierCheck.rows.length === 0) {
      const cashierPassword = await bcrypt.hash('cashier123', 10);
      await query(
        `INSERT INTO users (username, email, password, role, full_name)
         VALUES ($1, $2, $3, $4, $5)`,
        ['cashier', 'cashier@pos.com', cashierPassword, 'cashier', 'Cashier User']
      );
      console.log('✓ Created default cashier user (username: cashier, password: cashier123)');
    }
  } catch (error) {
    console.error('Error ensuring default users:', error.message);
  }
}).catch((error) => {
  console.error('Database initialization error (server will continue):', error.message);
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/users', userRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/returns', returnRoutes);
app.use('/api/purchase-orders', purchaseOrderRoutes);
app.use('/api/stock-adjustments', stockAdjustmentRoutes);
app.use('/api/held-transactions', heldTransactionRoutes);
app.use('/api/promotions', promotionRoutes);
app.use('/api/barcode', barcodeRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/import-export', importExportRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/credit-sales', creditSalesRoutes);
app.use('/api/daily-closings', dailyClosingsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'POS API is running' });
});

// Database health check
app.get('/api/health/db', async (req, res) => {
  try {
    const { query } = await import('./config/database.js');
    await query('SELECT 1');
    res.json({ 
      status: 'OK', 
      message: 'Database connection successful',
      database: {
        host: process.env.DB_HOST || 'not set',
        port: process.env.DB_PORT || 'not set',
        name: process.env.DB_NAME || 'not set',
        user: process.env.DB_USER || 'not set',
        hasPassword: !!process.env.DB_PASSWORD
      }
    });
  } catch (error) {
    res.status(503).json({ 
      status: 'ERROR', 
      message: 'Database connection failed',
      error: error.message,
      code: error.code,
      database: {
        host: process.env.DB_HOST || 'not set',
        port: process.env.DB_PORT || 'not set',
        name: process.env.DB_NAME || 'not set',
        user: process.env.DB_USER || 'not set',
        hasPassword: !!process.env.DB_PASSWORD
      },
      troubleshooting: {
        checkSupabase: 'Ensure your Supabase project is active (not paused)',
        checkEnvVars: 'Verify all DB_* environment variables are set in Render',
        checkNetwork: 'Check if network/firewall is blocking the connection'
      }
    });
  }
});

// Test login endpoint (for debugging)
app.post('/api/test-login', async (req, res) => {
  console.log('[Test] Login test endpoint called');
  console.log('[Test] Request body:', req.body);
  res.json({ message: 'Test endpoint reached', body: req.body });
});

// Error handling for uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Don't exit, let the server continue
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit, let the server continue
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});

