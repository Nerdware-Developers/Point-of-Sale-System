# Point of Sale (POS) System

A complete full-stack Point of Sale system for small supermarkets built with Node.js, React, and PostgreSQL.

## Features

- **Product Management**: Add, edit, delete products with barcode and stock tracking
- **Category Management**: Organize products by categories
- **Inventory Tracking**: Real-time stock monitoring with low stock alerts
- **Sales/Checkout**: Scan or search products, calculate totals, process payments
- **Reports**: Daily and monthly sales reports with profit calculations
- **Expense Tracking**: Track business expenses
- **Supplier Management**: Manage supplier information
- **User Management**: Role-based access (Admin, Cashier)
- **Authentication**: Secure JWT-based authentication
- **Dashboard**: Charts and analytics for sales and inventory
- **Audit Logs**: Track all system actions

## Technology Stack

- **Backend**: Node.js + Express
- **Frontend**: React + Vite + TailwindCSS + shadcn UI
- **Database**: PostgreSQL
- **Authentication**: JWT

## Setup Instructions

### Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

### Quick Start

1. **Install all dependencies:**
```bash
npm run install:all
```

2. **Set up the database:**
   - Create a PostgreSQL database named `pos_system`
   - Or modify the database name in the backend `.env` file

3. **Configure Backend:**
   - Copy `backend/.env.example` to `backend/.env` (if it exists) or create `backend/.env` with:
   ```env
   PORT=5000
   NODE_ENV=development
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=pos_system
   DB_USER=postgres
   DB_PASSWORD=postgres
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   JWT_EXPIRE=7d
   ```

4. **Configure Frontend:**
   - Create `frontend/.env` with:
   ```env
   VITE_API_URL=http://localhost:5000/api
   ```

5. **Start Backend:**
```bash
npm run dev:backend
```
   - The database tables will be automatically created on first run
   - Seed sample data: `cd backend && npm run seed`

6. **Start Frontend (in a new terminal):**
```bash
npm run dev:frontend
```

7. **Access the application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

### Manual Setup

#### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file (see configuration above)

4. Create the PostgreSQL database:
```sql
CREATE DATABASE pos_system;
```

5. Start the backend server:
```bash
npm run dev
```

6. Seed the database with sample data:
```bash
npm run seed
```

#### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file (see configuration above)

4. Start the development server:
```bash
npm run dev
```

## Default Credentials

- **Admin**: username=`admin`, password=`admin123`
- **Cashier**: username=`cashier`, password=`cashier123`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Products
- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get single product
- `POST /api/products` - Create product (Admin only)
- `PUT /api/products/:id` - Update product (Admin only)
- `DELETE /api/products/:id` - Delete product (Admin only)
- `PATCH /api/products/:id/stock` - Update stock (Admin only)

### Sales
- `GET /api/sales` - Get all sales
- `GET /api/sales/:id` - Get single sale
- `POST /api/sales` - Create sale

### Reports
- `GET /api/reports/daily` - Daily sales report
- `GET /api/reports/monthly` - Monthly sales report
- `GET /api/reports/top-products` - Best selling products
- `GET /api/reports/profit` - Profit calculation
- `GET /api/reports/export/pdf` - Export to PDF (Admin only)
- `GET /api/reports/export/excel` - Export to Excel (Admin only)

### Categories, Suppliers, Expenses
- Similar CRUD endpoints available

## Project Structure

```
pos-system/
├── backend/
│   ├── config/
│   │   └── database.js
│   ├── middleware/
│   │   ├── auth.js
│   │   └── audit.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── products.js
│   │   ├── sales.js
│   │   ├── reports.js
│   │   └── ...
│   ├── scripts/
│   │   └── seed.js
│   └── server.js
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── ...
│   └── ...
└── README.md
```

## License

MIT

