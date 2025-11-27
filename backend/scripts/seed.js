import bcrypt from 'bcryptjs';
import { query } from '../config/database.js';
import dotenv from 'dotenv';

dotenv.config();

const seedDatabase = async () => {
  try {
    console.log('Seeding database...');

    // Check if users already exist
    const existingUsers = await query('SELECT username FROM users WHERE username IN ($1, $2)', ['admin', 'cashier']);
    const existingUsernames = existingUsers.rows.map(u => u.username);

    // Create admin user
    if (!existingUsernames.includes('admin')) {
      const adminPassword = await bcrypt.hash('admin123', 10);
      const adminResult = await query(
        `INSERT INTO users (username, email, password, role, full_name)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING username`,
        ['admin', 'admin@pos.com', adminPassword, 'admin', 'Administrator']
      );
      console.log(`✓ Created admin user: ${adminResult.rows[0].username}`);
    } else {
      console.log('✓ Admin user already exists');
    }

    // Create cashier user
    if (!existingUsernames.includes('cashier')) {
      const cashierPassword = await bcrypt.hash('cashier123', 10);
      const cashierResult = await query(
        `INSERT INTO users (username, email, password, role, full_name)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING username`,
        ['cashier', 'cashier@pos.com', cashierPassword, 'cashier', 'Cashier User']
      );
      console.log(`✓ Created cashier user: ${cashierResult.rows[0].username}`);
    } else {
      console.log('✓ Cashier user already exists');
    }

    // Create categories
    const categories = [
      { name: 'Beverages', description: 'Drinks and beverages' },
      { name: 'Snacks', description: 'Chips, cookies, and snacks' },
      { name: 'Dairy', description: 'Milk, cheese, and dairy products' },
      { name: 'Fruits & Vegetables', description: 'Fresh produce' },
      { name: 'Meat & Seafood', description: 'Fresh meat and seafood' },
    ];

    for (const cat of categories) {
      await query(
        `INSERT INTO categories (name, description)
         VALUES ($1, $2)
         ON CONFLICT (name) DO NOTHING`,
        [cat.name, cat.description]
      );
    }

    // Create suppliers
    const suppliers = [
      { name: 'ABC Suppliers', contact_person: 'John Doe', email: 'john@abc.com', phone: '123-456-7890' },
      { name: 'XYZ Distributors', contact_person: 'Jane Smith', email: 'jane@xyz.com', phone: '098-765-4321' },
    ];

    for (const sup of suppliers) {
      await query(
        `INSERT INTO suppliers (name, contact_person, email, phone)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT DO NOTHING`,
        [sup.name, sup.contact_person, sup.email, sup.phone]
      );
    }

    // Get category and supplier IDs
    const catResult = await query('SELECT id, name FROM categories LIMIT 1');
    const supResult = await query('SELECT id FROM suppliers LIMIT 1');

    const categoryId = catResult.rows[0]?.id;
    const supplierId = supResult.rows[0]?.id;

    // Create sample products
    const products = [
      { name: 'Coca Cola 500ml', buying_price: 0.50, selling_price: 1.00, stock_quantity: 100, barcode: '1234567890123' },
      { name: 'Bread Loaf', buying_price: 1.00, selling_price: 2.50, stock_quantity: 50, barcode: '1234567890124' },
      { name: 'Milk 1L', buying_price: 1.50, selling_price: 3.00, stock_quantity: 75, barcode: '1234567890125' },
      { name: 'Chicken Breast 500g', buying_price: 3.00, selling_price: 6.00, stock_quantity: 30, barcode: '1234567890126' },
      { name: 'Apple 1kg', buying_price: 2.00, selling_price: 4.00, stock_quantity: 40, barcode: '1234567890127' },
    ];

    for (const prod of products) {
      await query(
        `INSERT INTO products (name, category_id, buying_price, selling_price, stock_quantity, barcode, supplier_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (barcode) DO NOTHING`,
        [prod.name, categoryId, prod.buying_price, prod.selling_price, prod.stock_quantity, prod.barcode, supplierId]
      );
    }

    console.log('Database seeded successfully!');
    console.log('Admin credentials: username=admin, password=admin123');
    console.log('Cashier credentials: username=cashier, password=cashier123');
  } catch (error) {
    console.error('Seeding error:', error);
  }
};

seedDatabase();

