import { useEffect, useState } from 'react';
import api from '../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Package, DollarSign, ShoppingCart, AlertTriangle, Clock, TrendingUp, TrendingDown } from 'lucide-react';
import { format } from 'date-fns';
import { formatCurrency } from '../utils/currency';
import toast from 'react-hot-toast';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalSales: 0,
    totalRevenue: 0,
    lowStockCount: 0,
  });
  const [salesData, setSalesData] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [expiringProducts, setExpiringProducts] = useState([]);
  const [reorderProducts, setReorderProducts] = useState([]);
  const [fastMovingProducts, setFastMovingProducts] = useState([]);
  const [slowMovingProducts, setSlowMovingProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];

      // Fetch all data in parallel with error handling - don't let one failure block everything
      const [
        productsRes,
        salesRes,
        topProductsRes,
        recentSalesRes,
        expiringRes,
        reorderRes,
        fastMovingRes,
        slowMovingRes
      ] = await Promise.allSettled([
        api.get('/products').catch(() => ({ data: [] })),
        api.get('/reports/daily', { params: { date: today } }).catch(() => ({ data: { summary: {} } })),
        api.get('/reports/top-products', { params: { limit: 5 } }).catch(() => ({ data: [] })),
        api.get('/sales', { params: { limit: 7 } }).catch(() => ({ data: [] })),
        api.get('/notifications/expiring', { params: { days: 30 } }).catch(() => ({ data: [] })),
        api.get('/notifications/reorder').catch(() => ({ data: [] })),
        api.get('/notifications/fast-moving', { params: { days: 30, limit: 5 } }).catch(() => ({ data: [] })),
        api.get('/notifications/slow-moving', { params: { days: 90, limit: 5 } }).catch(() => ({ data: [] }))
      ]);

      // Extract data from settled promises
      const products = productsRes.status === 'fulfilled' ? productsRes.value.data : [];
      const dailyReport = salesRes.status === 'fulfilled' ? salesRes.value.data : { summary: {} };
      const topProducts = topProductsRes.status === 'fulfilled' ? topProductsRes.value.data : [];
      const recentSales = recentSalesRes.status === 'fulfilled' ? recentSalesRes.value.data : [];
      const expiring = expiringRes.status === 'fulfilled' ? expiringRes.value.data : [];
      const reorder = reorderRes.status === 'fulfilled' ? reorderRes.value.data : [];
      const fastMoving = fastMovingRes.status === 'fulfilled' ? fastMovingRes.value.data : [];
      const slowMoving = slowMovingRes.status === 'fulfilled' ? slowMovingRes.value.data : [];

      const lowStock = products.filter((p) => p.stock_quantity < 10);

      setStats({
        totalProducts: products.length,
        totalSales: dailyReport.summary?.total_sales || 0,
        totalRevenue: parseFloat(dailyReport.summary?.total_revenue || 0),
        lowStockCount: lowStock.length,
      });

      setTopProducts(topProducts);
      setLowStockProducts(lowStock.slice(0, 5));
      setExpiringProducts(expiring.slice(0, 5));
      setReorderProducts(reorder.slice(0, 5));
      setFastMovingProducts(fastMoving);
      setSlowMovingProducts(slowMoving);

      // Prepare sales chart data (last 7 days)
      const last7Days = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        last7Days.push({
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          revenue: 0,
        });
      }

      // Group sales by date
      recentSales.forEach((sale) => {
        const saleDate = new Date(sale.date_time).toISOString().split('T')[0];
        const dayIndex = last7Days.findIndex((d) => {
          const dDate = new Date(d.date);
          return dDate.toISOString().split('T')[0] === saleDate;
        });
        if (dayIndex !== -1) {
          last7Days[dayIndex].revenue += parseFloat(sale.total_amount);
        }
      });

      setSalesData(last7Days);
    } catch (error) {
      console.error('Dashboard error:', error);
      // Show user-friendly error message
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        toast.error('Request timed out. The server may be slow or the database is unavailable.');
      } else {
        toast.error('Failed to load some dashboard data. Some features may be limited.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8">Loading dashboard...</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Products</p>
              <p className="text-3xl font-bold text-gray-800">{stats.totalProducts}</p>
            </div>
            <Package className="w-12 h-12 text-blue-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Today's Sales</p>
              <p className="text-3xl font-bold text-gray-800">{stats.totalSales}</p>
            </div>
            <ShoppingCart className="w-12 h-12 text-green-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Today's Revenue</p>
              <p className="text-3xl font-bold text-gray-800">{formatCurrency(stats.totalRevenue)}</p>
            </div>
            <DollarSign className="w-12 h-12 text-yellow-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Low Stock Items</p>
              <p className="text-3xl font-bold text-gray-800">{stats.lowStockCount}</p>
            </div>
            <AlertTriangle className="w-12 h-12 text-red-500" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Sales Chart */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold mb-4">Sales Trend (Last 7 Days)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Top Products */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold mb-4">Top Selling Products</h2>
          <div className="space-y-3">
            {topProducts.length > 0 ? (
              topProducts.map((product, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div>
                    <p className="font-semibold">{product.name}</p>
                    <p className="text-sm text-gray-600">Qty: {product.quantity}</p>
                  </div>
                  <p className="font-bold text-green-600">{formatCurrency(product.revenue)}</p>
                </div>
              ))
            ) : (
              <p className="text-gray-500">No sales data available</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Alert */}
        {lowStockProducts.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-bold mb-4 text-red-600 flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2" />
              Low Stock Alerts
            </h2>
            <div className="space-y-2">
              {lowStockProducts.map((product) => (
                <div key={product.id} className="p-3 bg-red-50 border border-red-200 rounded">
                  <p className="font-semibold text-gray-800">{product.name}</p>
                  <p className="text-red-600 font-bold">Stock: {product.stock_quantity}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Expiring Products Alert */}
        {expiringProducts.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-bold mb-4 text-orange-600 flex items-center">
              <Clock className="w-5 h-5 mr-2" />
              Expiring Soon
            </h2>
            <div className="space-y-2">
              {expiringProducts.map((product) => (
                <div key={product.id} className="p-3 bg-orange-50 border border-orange-200 rounded">
                  <p className="font-semibold text-gray-800">{product.name}</p>
                  <p className="text-orange-600 font-bold">
                    Expires: {format(new Date(product.expiry_date), 'MMM dd, yyyy')}
                  </p>
                  <p className="text-sm text-gray-600">Stock: {product.stock_quantity}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Advanced Inventory Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* Reorder Alerts */}
        {reorderProducts.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-bold mb-4 text-yellow-600 flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2" />
              Need Reorder
            </h2>
            <div className="space-y-2">
              {reorderProducts.map((product) => (
                <div key={product.id} className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <p className="font-semibold text-gray-800">{product.name}</p>
                  <p className="text-yellow-600 font-bold">
                    Stock: {product.stock_quantity} (Reorder: {product.reorder_level || 10})
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Fast Moving Products */}
        {fastMovingProducts.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-bold mb-4 text-green-600 flex items-center">
              <TrendingUp className="w-5 h-5 mr-2" />
              Fast Moving
            </h2>
            <div className="space-y-2">
              {fastMovingProducts.map((product) => (
                <div key={product.id} className="p-3 bg-green-50 border border-green-200 rounded">
                  <p className="font-semibold text-gray-800">{product.name}</p>
                  <p className="text-green-600 font-bold">Sold: {product.total_sold || 0} units (30 days)</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Slow Moving Products */}
        {slowMovingProducts.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-bold mb-4 text-gray-600 flex items-center">
              <Clock className="w-5 h-5 mr-2" />
              Slow Moving
            </h2>
            <div className="space-y-2">
              {slowMovingProducts.map((product) => (
                <div key={product.id} className="p-3 bg-gray-50 border border-gray-200 rounded">
                  <p className="font-semibold text-gray-800">{product.name}</p>
                  <p className="text-gray-600">
                    Stock: {product.stock_quantity}
                    {product.last_sale_date && (
                      <span className="text-xs block">Last sold: {format(new Date(product.last_sale_date), 'MMM dd')}</span>
                    )}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

