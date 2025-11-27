import bcrypt from 'bcryptjs';
import { query } from '../config/database.js';
import dotenv from 'dotenv';

dotenv.config();

const testLogin = async () => {
  try {
    console.log('Testing login functionality...\n');

    // Test 1: Check if users exist
    console.log('1. Checking if users exist...');
    const users = await query('SELECT id, username, email, role, password FROM users');
    console.log(`   Found ${users.rows.length} users:`);
    users.rows.forEach(u => {
      console.log(`   - ${u.username} (${u.email}) - ${u.role}`);
      console.log(`     Password hash: ${u.password ? u.password.substring(0, 20) + '...' : 'NULL'}`);
    });

    // Test 2: Test admin login
    console.log('\n2. Testing admin login...');
    const adminUser = await query('SELECT * FROM users WHERE username = $1', ['admin']);
    if (adminUser.rows.length === 0) {
      console.log('   ❌ Admin user not found!');
    } else {
      const user = adminUser.rows[0];
      const testPassword = 'admin123';
      const isValid = await bcrypt.compare(testPassword, user.password);
      console.log(`   Password test: ${isValid ? '✅ VALID' : '❌ INVALID'}`);
      if (!isValid) {
        console.log(`   Stored hash: ${user.password}`);
        const newHash = await bcrypt.hash(testPassword, 10);
        console.log(`   New hash would be: ${newHash}`);
        console.log('   💡 Try updating the password hash in the database');
      }
    }

    // Test 3: Test cashier login
    console.log('\n3. Testing cashier login...');
    const cashierUser = await query('SELECT * FROM users WHERE username = $1', ['cashier']);
    if (cashierUser.rows.length === 0) {
      console.log('   ❌ Cashier user not found!');
    } else {
      const user = cashierUser.rows[0];
      const testPassword = 'cashier123';
      const isValid = await bcrypt.compare(testPassword, user.password);
      console.log(`   Password test: ${isValid ? '✅ VALID' : '❌ INVALID'}`);
      if (!isValid) {
        console.log(`   Stored hash: ${user.password}`);
        const newHash = await bcrypt.hash(testPassword, 10);
        console.log(`   New hash would be: ${newHash}`);
        console.log('   💡 Try updating the password hash in the database');
      }
    }

    // Test 4: Fix passwords if needed
    console.log('\n4. Fixing passwords if needed...');
    const adminCheck = await query('SELECT * FROM users WHERE username = $1', ['admin']);
    if (adminCheck.rows.length > 0) {
      const adminHash = await bcrypt.hash('admin123', 10);
      await query('UPDATE users SET password = $1 WHERE username = $2', [adminHash, 'admin']);
      console.log('   ✅ Admin password updated');
    }

    const cashierCheck = await query('SELECT * FROM users WHERE username = $1', ['cashier']);
    if (cashierCheck.rows.length > 0) {
      const cashierHash = await bcrypt.hash('cashier123', 10);
      await query('UPDATE users SET password = $1 WHERE username = $2', [cashierHash, 'cashier']);
      console.log('   ✅ Cashier password updated');
    }

    console.log('\n✅ Login test complete!');
    console.log('\nTry logging in with:');
    console.log('  Admin:   username=admin, password=admin123');
    console.log('  Cashier: username=cashier, password=cashier123');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

testLogin();

