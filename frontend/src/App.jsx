import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import ProductDisplay from './pages/ProductDisplay';
import Checkout from './pages/Checkout';
import Sales from './pages/Sales';
import Reports from './pages/Reports';
import Categories from './pages/Categories';
import Suppliers from './pages/Suppliers';
import Expenses from './pages/Expenses';
import Users from './pages/Users';
import Returns from './pages/Returns';
import PurchaseOrders from './pages/PurchaseOrders';
import StockAdjustments from './pages/StockAdjustments';
import Promotions from './pages/Promotions';
import CreditSales from './pages/CreditSales';
import DailyClosings from './pages/DailyClosings';
import BarcodeGenerator from './pages/BarcodeGenerator';
import ReceiptScanner from './pages/ReceiptScanner';
import Layout from './components/Layout';
import OfflineIndicator from './components/OfflineIndicator';
import ErrorBoundary from './components/ErrorBoundary';

function AppRoutes() {
  return (
    <Routes>
      {/* Redirect any login/register attempts to dashboard */}
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="/register" element={<Navigate to="/" replace />} />
      
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="products" element={<Products />} />
        <Route path="shop" element={<ProductDisplay />} />
        <Route path="checkout" element={<Checkout />} />
        <Route path="sales" element={<Sales />} />
        <Route path="reports" element={<Reports />} />
        <Route path="categories" element={<Categories />} />
        <Route path="suppliers" element={<Suppliers />} />
        <Route path="expenses" element={<Expenses />} />
        <Route path="users" element={<Users />} />
        <Route path="returns" element={<Returns />} />
        <Route path="purchase-orders" element={<PurchaseOrders />} />
        <Route path="stock-adjustments" element={<StockAdjustments />} />
        <Route path="promotions" element={<Promotions />} />
        <Route path="credit-sales" element={<CreditSales />} />
        <Route path="daily-closings" element={<DailyClosings />} />
        <Route path="barcode-generator" element={<BarcodeGenerator />} />
        <Route path="receipt-scanner" element={<ReceiptScanner />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <OfflineIndicator />
          <AppRoutes />
          <Toaster position="top-right" />
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;

