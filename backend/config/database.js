import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pkg;

// Check if DATABASE_URL is provided (connection string format)
// This is the most reliable method for Supabase
const getDatabaseConfig = () => {
  // If DATABASE_URL is set, use it directly (most reliable)
  if (process.env.DATABASE_URL) {
    console.log('✅ Using DATABASE_URL connection string');
    return {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL?.includes('supabase') ? { rejectUnauthorized: false } : false,
    };
  }

  // Otherwise, build config from individual variables
  const isSupabase = process.env.DB_HOST && process.env.DB_HOST.includes('supabase.co');
  const dbPort = parseInt(process.env.DB_PORT || (isSupabase ? '6543' : '5432'));
  const dbHost = process.env.DB_HOST || 'localhost';
  
  // Build connection string (more reliable than config object for Supabase)
  const connectionString = `postgresql://${process.env.DB_USER || 'postgres'}:${encodeURIComponent(process.env.DB_PASSWORD || 'postgres')}@${dbHost}:${dbPort}/${process.env.DB_NAME || (isSupabase ? 'postgres' : 'pos_system')}`;
  
  console.log('📝 Using connection string format');
  console.log('Database config:', {
    host: dbHost,
    port: dbPort,
    database: process.env.DB_NAME || (isSupabase ? 'postgres' : 'pos_system'),
    user: process.env.DB_USER || 'postgres',
    ssl: isSupabase ? 'enabled' : 'disabled',
    hasPassword: !!process.env.DB_PASSWORD,
  });

  return {
    connectionString,
    ssl: isSupabase ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: isSupabase ? 10000 : 5000,
    idleTimeoutMillis: isSupabase ? 30000 : 10000,
  };
};

// Create pool with the configuration
const pool = new Pool(getDatabaseConfig());

// Handle pool errors
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

export const query = async (text, params) => {
  try {
    return await pool.query(text, params);
  } catch (error) {
    console.error('Database query error:', error.message);
    throw error;
  }
};

export const getClient = async () => {
  return await pool.connect();
};

export const createConnection = async () => {
  try {
    // Test connection
    const client = await pool.connect();
    console.log('✅ Database connected successfully');
    
    // Run a simple query to verify
    await client.query('SELECT NOW()');
    client.release();
    
    // Initialize tables
    await initializeTables();
    console.log('✅ Database tables initialized');
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
    console.error('Error code:', error.code);
    console.error('\n⚠️  Database connection failed!\n');
    
    // Provide helpful error messages
    if (error.code === 'ENOTFOUND' || error.code === 'ENETUNREACH') {
      console.error('Possible causes:');
      console.error('  1. Supabase project is paused - check https://supabase.com/dashboard');
      console.error('  2. Incorrect DB_HOST or DATABASE_URL in environment variables');
      console.error('  3. Network/firewall blocking connection');
      console.error(`  Current DB_HOST: ${process.env.DB_HOST || 'not set'}`);
      console.error(`  DATABASE_URL set: ${!!process.env.DATABASE_URL}`);
      console.error('\n💡 Solution: Use DATABASE_URL connection string from Supabase dashboard');
      console.error('   Go to: Supabase Dashboard → Settings → Database → Connection string');
      console.error('   Copy the "Connection pooling" string and set it as DATABASE_URL in Render\n');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('Connection refused - check DB_PORT and ensure database is accessible');
    } else if (error.code === '28P01') {
      console.error('Authentication failed - check DB_USER and DB_PASSWORD');
    } else if (error.message.includes('password')) {
      console.error('Password authentication failed - verify DB_PASSWORD is correct');
    }
    
    console.error('The server will continue running but database operations will fail.\n');
  }
};

const initializeTables = async () => {
  // Users table
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(100) UNIQUE NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(20) NOT NULL DEFAULT 'cashier',
      full_name VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Categories table
  await query(`
    CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Suppliers table
  await query(`
    CREATE TABLE IF NOT EXISTS suppliers (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      contact_person VARCHAR(255),
      email VARCHAR(255),
      phone VARCHAR(50),
      address TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Products table
  await query(`
    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      buying_price DECIMAL(10, 2) NOT NULL,
      selling_price DECIMAL(10, 2) NOT NULL,
      profit DECIMAL(10, 2) GENERATED ALWAYS AS (selling_price - buying_price) STORED,
      stock_quantity INTEGER NOT NULL DEFAULT 0,
      barcode VARCHAR(100) UNIQUE,
      supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
      expiry_date DATE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Sales table
  await query(`
    CREATE TABLE IF NOT EXISTS sales (
      id SERIAL PRIMARY KEY,
      sale_id VARCHAR(50) UNIQUE NOT NULL,
      cashier_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      items JSONB NOT NULL,
      subtotal DECIMAL(10, 2) NOT NULL,
      tax DECIMAL(10, 2) DEFAULT 0,
      discount DECIMAL(10, 2) DEFAULT 0,
      total_amount DECIMAL(10, 2) NOT NULL,
      payment_method VARCHAR(50) NOT NULL,
      cash_given DECIMAL(10, 2),
      change_returned DECIMAL(10, 2),
      date_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Expenses table
  await query(`
    CREATE TABLE IF NOT EXISTS expenses (
      id SERIAL PRIMARY KEY,
      description TEXT NOT NULL,
      amount DECIMAL(10, 2) NOT NULL,
      category VARCHAR(100),
      date DATE NOT NULL,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Audit log table
  await query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      action VARCHAR(100) NOT NULL,
      table_name VARCHAR(100),
      record_id INTEGER,
      details JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Customers table
  await query(`
    CREATE TABLE IF NOT EXISTS customers (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255),
      phone VARCHAR(50),
      address TEXT,
      loyalty_points INTEGER DEFAULT 0,
      total_purchases DECIMAL(10, 2) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Returns/Refunds table
  await query(`
    CREATE TABLE IF NOT EXISTS returns (
      id SERIAL PRIMARY KEY,
      return_id VARCHAR(50) UNIQUE NOT NULL,
      sale_id INTEGER REFERENCES sales(id) ON DELETE SET NULL,
      cashier_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
      items JSONB NOT NULL,
      reason TEXT,
      total_amount DECIMAL(10, 2) NOT NULL,
      refund_method VARCHAR(50) NOT NULL,
      date_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Purchase Orders table
  await query(`
    CREATE TABLE IF NOT EXISTS purchase_orders (
      id SERIAL PRIMARY KEY,
      order_id VARCHAR(50) UNIQUE NOT NULL,
      supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
      items JSONB NOT NULL,
      total_amount DECIMAL(10, 2) NOT NULL,
      status VARCHAR(50) DEFAULT 'pending',
      order_date DATE NOT NULL,
      expected_date DATE,
      received_date DATE,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Stock Adjustments table
  await query(`
    CREATE TABLE IF NOT EXISTS stock_adjustments (
      id SERIAL PRIMARY KEY,
      product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
      adjustment_type VARCHAR(50) NOT NULL,
      quantity_change INTEGER NOT NULL,
      reason TEXT,
      previous_quantity INTEGER NOT NULL,
      new_quantity INTEGER NOT NULL,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Held Transactions table
  await query(`
    CREATE TABLE IF NOT EXISTS held_transactions (
      id SERIAL PRIMARY KEY,
      transaction_id VARCHAR(50) UNIQUE NOT NULL,
      cashier_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      items JSONB NOT NULL,
      subtotal DECIMAL(10, 2) NOT NULL,
      tax DECIMAL(10, 2) DEFAULT 0,
      discount DECIMAL(10, 2) DEFAULT 0,
      total_amount DECIMAL(10, 2) NOT NULL,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      expires_at TIMESTAMP
    )
  `);

  // Promotions/Discounts table
  await query(`
    CREATE TABLE IF NOT EXISTS promotions (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      discount_type VARCHAR(50) NOT NULL,
      discount_value DECIMAL(10, 2) NOT NULL,
      product_ids INTEGER[],
      category_ids INTEGER[],
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Product Images table
  await query(`
    CREATE TABLE IF NOT EXISTS product_images (
      id SERIAL PRIMARY KEY,
      product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
      image_url VARCHAR(500) NOT NULL,
      is_primary BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Update Sales table to support multiple payment methods and customers
  await query(`
    ALTER TABLE sales 
    ADD COLUMN IF NOT EXISTS customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS payment_methods JSONB,
    ADD COLUMN IF NOT EXISTS notes TEXT
  `);

  // Update Products table to add image support
  await query(`
    ALTER TABLE products 
    ADD COLUMN IF NOT EXISTS image_url VARCHAR(500),
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS reorder_level INTEGER DEFAULT 10
  `);

  // Add wholesale price support
  await query(`
    ALTER TABLE products 
    ADD COLUMN IF NOT EXISTS wholesale_price DECIMAL(10, 2)
  `);

  // Add sale type to sales table (wholesale/retail)
  await query(`
    ALTER TABLE sales 
    ADD COLUMN IF NOT EXISTS sale_type VARCHAR(20) DEFAULT 'retail'
  `);

  // Credit Sales and Debt Tracking
  await query(`
    CREATE TABLE IF NOT EXISTS credit_sales (
      id SERIAL PRIMARY KEY,
      sale_id VARCHAR(50) UNIQUE NOT NULL,
      customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
      total_amount DECIMAL(10, 2) NOT NULL,
      paid_amount DECIMAL(10, 2) DEFAULT 0,
      balance DECIMAL(10, 2) NOT NULL,
      due_date DATE,
      status VARCHAR(20) DEFAULT 'pending',
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS debt_payments (
      id SERIAL PRIMARY KEY,
      credit_sale_id INTEGER REFERENCES credit_sales(id) ON DELETE CASCADE,
      amount DECIMAL(10, 2) NOT NULL,
      payment_method VARCHAR(50) DEFAULT 'cash',
      payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      notes TEXT,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL
    )
  `);

  // Daily Closing Reports
  await query(`
    CREATE TABLE IF NOT EXISTS daily_closings (
      id SERIAL PRIMARY KEY,
      closing_date DATE UNIQUE NOT NULL,
      opening_cash DECIMAL(10, 2) DEFAULT 0,
      closing_cash DECIMAL(10, 2) DEFAULT 0,
      cash_sales DECIMAL(10, 2) DEFAULT 0,
      card_sales DECIMAL(10, 2) DEFAULT 0,
      mobile_sales DECIMAL(10, 2) DEFAULT 0,
      total_sales DECIMAL(10, 2) DEFAULT 0,
      total_expenses DECIMAL(10, 2) DEFAULT 0,
      cash_difference DECIMAL(10, 2) DEFAULT 0,
      notes TEXT,
      closed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      closed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Product Movement Tracking
  await query(`
    ALTER TABLE products 
    ADD COLUMN IF NOT EXISTS reorder_level INTEGER DEFAULT 10,
    ADD COLUMN IF NOT EXISTS fast_moving_threshold INTEGER DEFAULT 50,
    ADD COLUMN IF NOT EXISTS last_sold_date DATE,
    ADD COLUMN IF NOT EXISTS total_sold_quantity INTEGER DEFAULT 0
  `);

  // Add unit management support for bulk/unit sales
  await query(`
    ALTER TABLE products 
    ADD COLUMN IF NOT EXISTS unit_type VARCHAR(50) DEFAULT 'piece',
    ADD COLUMN IF NOT EXISTS base_unit VARCHAR(50),
    ADD COLUMN IF NOT EXISTS units_per_bulk DECIMAL(10, 2),
    ADD COLUMN IF NOT EXISTS bulk_price DECIMAL(10, 2),
    ADD COLUMN IF NOT EXISTS unit_price DECIMAL(10, 2)
  `);

  // Create indexes
  await query(`CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(date_time)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_sales_cashier ON sales(cashier_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_returns_date ON returns(date_time)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_stock_adjustments_product ON stock_adjustments(product_id)`);
};

export default pool;
