import bcrypt from 'bcryptjs';
import { query } from '../config/database.js';
import dotenv from 'dotenv';

dotenv.config();

const ensureUsers = async () => {
  try {
    console.log('Ensuring default users exist...');

    // Check if admin exists
    const adminCheck = await query('SELECT id, username FROM users WHERE username = $1', ['admin']);
    if (adminCheck.rows.length === 0) {
      const adminPassword = await bcrypt.hash('admin123', 10);
      await query(
        `INSERT INTO users (username, email, password, role, full_name)
         VALUES ($1, $2, $3, $4, $5)`,
        ['admin', 'admin@pos.com', adminPassword, 'admin', 'Administrator']
      );
      console.log('✓ Created admin user (username: admin, password: admin123)');
    } else {
      console.log('✓ Admin user already exists');
    }

    // Check if cashier exists
    const cashierCheck = await query('SELECT id, username FROM users WHERE username = $1', ['cashier']);
    if (cashierCheck.rows.length === 0) {
      const cashierPassword = await bcrypt.hash('cashier123', 10);
      await query(
        `INSERT INTO users (username, email, password, role, full_name)
         VALUES ($1, $2, $3, $4, $5)`,
        ['cashier', 'cashier@pos.com', cashierPassword, 'cashier', 'Cashier User']
      );
      console.log('✓ Created cashier user (username: cashier, password: cashier123)');
    } else {
      console.log('✓ Cashier user already exists');
    }

    console.log('\n✅ Default users ready!');
    console.log('Login credentials:');
    console.log('  Admin:   username=admin, password=admin123');
    console.log('  Cashier: username=cashier, password=cashier123\n');
  } catch (error) {
    console.error('Error ensuring users:', error);
    process.exit(1);
  }
};

ensureUsers();

