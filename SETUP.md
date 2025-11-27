# POS System - Detailed Setup Guide

## System Requirements

- **Node.js**: v18.0.0 or higher
- **PostgreSQL**: v12.0 or higher
- **npm**: v8.0.0 or higher (comes with Node.js)

## Step-by-Step Installation

### 1. Database Setup

#### Install PostgreSQL
- **Windows**: Download from https://www.postgresql.org/download/windows/
- **macOS**: `brew install postgresql` or download from PostgreSQL website
- **Linux**: `sudo apt-get install postgresql` (Ubuntu/Debian)

#### Create Database
```bash
# Login to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE pos_system;

# Exit psql
\q
```

### 2. Backend Setup

```bash
# Navigate to backend
cd backend

# Install dependencies
npm install

# Create .env file
# Copy the content from backend/.env.example or create manually:
# PORT=5000
# NODE_ENV=development
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=pos_system
# DB_USER=postgres
# DB_PASSWORD=your_postgres_password
# JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
# JWT_EXPIRE=7d

# Start server (tables will be auto-created)
npm run dev

# In another terminal, seed sample data
npm run seed
```

### 3. Frontend Setup

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Create .env file
# VITE_API_URL=http://localhost:5000/api

# Start development server
npm run dev
```

### 4. Access the Application

- **Frontend**: Open http://localhost:3000 in your browser
- **Backend API**: http://localhost:5000/api

## Default Login Credentials

After running the seed script:

- **Admin Account**:
  - Username: `admin`
  - Password: `admin123`

- **Cashier Account**:
  - Username: `cashier`
  - Password: `cashier123`

## Troubleshooting

### Database Connection Issues

1. **Check PostgreSQL is running:**
   ```bash
   # Windows
   # Check Services or use pgAdmin
   
   # macOS/Linux
   sudo service postgresql status
   ```

2. **Verify database credentials in `.env` file**

3. **Test connection:**
   ```bash
   psql -U postgres -d pos_system
   ```

### Port Already in Use

If port 5000 or 3000 is already in use:

1. **Backend**: Change `PORT` in `backend/.env`
2. **Frontend**: Update `VITE_API_URL` in `frontend/.env` to match
3. **Frontend Port**: Modify `vite.config.js` server port

### Module Not Found Errors

```bash
# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Do this for both backend and frontend
```

### Database Tables Not Created

The tables are automatically created on first server start. If they're missing:

1. Check database connection in `.env`
2. Check server logs for errors
3. Manually run the initialization by restarting the server

## Production Deployment

### Backend

1. Set `NODE_ENV=production` in `.env`
2. Use a strong `JWT_SECRET`
3. Configure proper CORS settings
4. Use a process manager like PM2:
   ```bash
   npm install -g pm2
   pm2 start server.js --name pos-backend
   ```

### Frontend

1. Build for production:
   ```bash
   cd frontend
   npm run build
   ```

2. Serve the `dist` folder with a web server (nginx, Apache, etc.)

3. Update `VITE_API_URL` to point to production backend

## Features Overview

✅ **Product Management**: Full CRUD with barcode support
✅ **Inventory Tracking**: Real-time stock monitoring
✅ **Sales/Checkout**: Complete POS interface
✅ **Reports**: Daily, monthly, profit analysis
✅ **Expense Tracking**: Business expense management
✅ **Supplier Management**: Track suppliers
✅ **User Management**: Role-based access (Admin/Cashier)
✅ **Dashboard**: Analytics and charts
✅ **Stock Alerts**: Low stock notifications
✅ **Audit Logs**: Track all system actions

## Support

For issues or questions, check the code comments or review the API endpoints in the backend routes.

