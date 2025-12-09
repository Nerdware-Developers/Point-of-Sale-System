import { useState, useEffect } from 'react';
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
  Menu,
  X,
} from 'lucide-react';

export default function Layout() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar when route changes on mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close sidebar on mobile when clicking a link
  const handleLinkClick = () => {
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

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
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex items-center justify-between p-4 lg:p-6 border-b">
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-blue-600">POS System</h1>
            <p className="text-xs lg:text-sm text-gray-500 mt-1">Point of Sale</p>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 text-gray-600 hover:text-gray-800"
            aria-label="Close sidebar"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        <nav className="mt-4 overflow-y-auto h-[calc(100vh-100px)]">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={handleLinkClick}
                className={`flex items-center px-4 lg:px-6 py-3 text-sm lg:text-base text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors ${
                  isActive ? 'bg-blue-50 text-blue-600 border-r-2 border-blue-600' : ''
                }`}
              >
                <Icon className="w-5 h-5 mr-3 flex-shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto w-full lg:w-auto">
        {/* Mobile Header with Menu Button */}
        <div className="lg:hidden sticky top-0 z-30 bg-white shadow-sm border-b">
          <div className="flex items-center justify-between p-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 text-gray-600 hover:text-gray-800"
              aria-label="Open sidebar"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h2 className="text-lg font-semibold text-blue-600">POS System</h2>
            <div className="w-10" /> {/* Spacer for centering */}
          </div>
        </div>
        <div className="p-4 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

