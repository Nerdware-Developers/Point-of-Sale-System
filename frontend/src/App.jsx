import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Checkout from './pages/Checkout';
import Sales from './pages/Sales';
import Reports from './pages/Reports';
import Categories from './pages/Categories';
import Suppliers from './pages/Suppliers';
import Expenses from './pages/Expenses';
import Users from './pages/Users';
import Customers from './pages/Customers';
import Returns from './pages/Returns';
import PurchaseOrders from './pages/PurchaseOrders';
import StockAdjustments from './pages/StockAdjustments';
import Promotions from './pages/Promotions';
import Layout from './components/Layout';
import OfflineIndicator from './components/OfflineIndicator';

function AppRoutes() {
  return (
    <Routes>
      {/* Redirect any login/register attempts to dashboard */}
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="/register" element={<Navigate to="/" replace />} />
      
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="products" element={<Products />} />
        <Route path="checkout" element={<Checkout />} />
        <Route path="sales" element={<Sales />} />
        <Route path="reports" element={<Reports />} />
        <Route path="categories" element={<Categories />} />
        <Route path="suppliers" element={<Suppliers />} />
        <Route path="expenses" element={<Expenses />} />
        <Route path="users" element={<Users />} />
        <Route path="customers" element={<Customers />} />
        <Route path="returns" element={<Returns />} />
        <Route path="purchase-orders" element={<PurchaseOrders />} />
        <Route path="stock-adjustments" element={<StockAdjustments />} />
        <Route path="promotions" element={<Promotions />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <OfflineIndicator />
      <AppRoutes />
      <Toaster position="top-right" />
    </Router>
  );
}

export default App;

