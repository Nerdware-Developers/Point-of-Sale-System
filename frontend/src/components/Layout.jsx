import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Receipt,
  BarChart3,
  FolderTree,
  Truck,
  DollarSign,
  Users,
  Store,
  RotateCcw,
  ShoppingBag,
  TrendingUp,
  Tag,
  CreditCard,
  Calendar,
  ScanBarcode,
} from 'lucide-react';

export default function Layout() {
  const location = useLocation();

  // All menu items available - no authentication required
  const menuItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/shop', icon: Store, label: 'Shop' },
    { path: '/checkout', icon: ShoppingCart, label: 'Checkout' },
    { path: '/products', icon: Package, label: 'Products' },
    { path: '/sales', icon: Receipt, label: 'Sales' },
    { path: '/reports', icon: BarChart3, label: 'Reports' },
    { path: '/categories', icon: FolderTree, label: 'Categories' },
    { path: '/suppliers', icon: Truck, label: 'Suppliers' },
    { path: '/expenses', icon: DollarSign, label: 'Expenses' },
    { path: '/returns', icon: RotateCcw, label: 'Returns' },
    { path: '/promotions', icon: Tag, label: 'Promotions' },
    { path: '/purchase-orders', icon: ShoppingBag, label: 'Purchase Orders' },
    { path: '/stock-adjustments', icon: TrendingUp, label: 'Stock Adjustments' },
    { path: '/credit-sales', icon: CreditCard, label: 'Credit Sales' },
    { path: '/daily-closings', icon: Calendar, label: 'Daily Closings' },
    { path: '/barcode-generator', icon: ScanBarcode, label: 'Barcode Generator' },
    { path: '/users', icon: Users, label: 'Users' },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-lg">
        <div className="p-6 border-b">
          <h1 className="text-2xl font-bold text-blue-600">POS System</h1>
          <p className="text-sm text-gray-500 mt-1">Point of Sale</p>
        </div>
        <nav className="mt-4">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center px-6 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors ${
                  isActive ? 'bg-blue-50 text-blue-600 border-r-2 border-blue-600' : ''
                }`}
              >
                <Icon className="w-5 h-5 mr-3" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}

