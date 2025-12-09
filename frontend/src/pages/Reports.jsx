import { useState, useEffect } from 'react';
import api from '../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Download, Calendar } from 'lucide-react';
import { formatCurrency } from '../utils/currency';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function Reports() {
  const [reportType, setReportType] = useState('daily');
  const [dailyReport, setDailyReport] = useState(null);
  const [monthlyReport, setMonthlyReport] = useState(null);
  const [topProducts, setTopProducts] = useState([]);
  const [profit, setProfit] = useState(null);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [cashierPerformance, setCashierPerformance] = useState([]);
  const [stockValuation, setStockValuation] = useState(null);

  useEffect(() => {
    if (reportType === 'daily') {
      fetchDailyReport();
    } else if (reportType === 'monthly') {
      fetchMonthlyReport();
    } else if (reportType === 'top-products') {
      fetchTopProducts();
    } else if (reportType === 'profit') {
      fetchProfit();
    } else if (reportType === 'cashier-performance') {
      fetchCashierPerformance();
    } else if (reportType === 'stock-valuation') {
      fetchStockValuation();
    }
  }, [reportType, date, year, month, startDate, endDate]);

  const fetchCashierPerformance = async () => {
    try {
      setLoading(true);
      const params = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      const response = await api.get('/reports/cashier-performance', { params });
      setCashierPerformance(response.data);
    } catch (error) {
      toast.error('Failed to load cashier performance');
    } finally {
      setLoading(false);
    }
  };

  const fetchStockValuation = async () => {
    try {
      setLoading(true);
      const response = await api.get('/reports/stock-valuation');
      setStockValuation(response.data);
    } catch (error) {
      toast.error('Failed to load stock valuation');
    } finally {
      setLoading(false);
    }
  };

  const fetchDailyReport = async () => {
    try {
      setLoading(true);
      const response = await api.get('/reports/daily', { params: { date } });
      setDailyReport(response.data);
    } catch (error) {
      toast.error('Failed to load daily report');
    } finally {
      setLoading(false);
    }
  };

  const fetchMonthlyReport = async () => {
    try {
      setLoading(true);
      const response = await api.get('/reports/monthly', { params: { year, month } });
      setMonthlyReport(response.data);
    } catch (error) {
      toast.error('Failed to load monthly report');
    } finally {
      setLoading(false);
    }
  };

  const fetchTopProducts = async () => {
    try {
      setLoading(true);
      const params = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      const response = await api.get('/reports/top-products', { params });
      setTopProducts(response.data);
    } catch (error) {
      toast.error('Failed to load top products');
    } finally {
      setLoading(false);
    }
  };

  const fetchProfit = async () => {
    try {
      setLoading(true);
      const params = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      const response = await api.get('/reports/profit', { params });
      setProfit(response.data);
    } catch (error) {
      toast.error('Failed to load profit report');
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      const params = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      const response = await api.get('/reports/export/pdf', { params, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'sales-report.pdf');
      document.body.appendChild(link);
      link.click();
      toast.success('PDF exported successfully');
    } catch (error) {
      toast.error('Failed to export PDF');
    }
  };

  const handleExportExcel = async () => {
    try {
      const params = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      const response = await api.get('/reports/export/excel', { params, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'sales-report.xlsx');
      document.body.appendChild(link);
      link.click();
      toast.success('Excel exported successfully');
    } catch (error) {
      toast.error('Failed to export Excel');
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Reports</h1>
        <div className="flex gap-2">
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            <Download className="w-4 h-4" />
            Export PDF
          </button>
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Download className="w-4 h-4" />
            Export Excel
          </button>
        </div>
      </div>

      {/* Report Type Selector */}
      <div className="bg-white p-4 rounded-lg shadow-md mb-6">
        <div className="flex flex-wrap gap-2">
          {['daily', 'monthly', 'top-products', 'profit', 'cashier-performance', 'stock-valuation'].map((type) => (
            <button
              key={type}
              onClick={() => setReportType(type)}
              className={`px-4 py-2 rounded capitalize ${
                reportType === type
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {type.replace('-', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-md mb-6">
        {reportType === 'daily' && (
          <div>
            <label className="block text-sm font-medium mb-2">Select Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded"
            />
          </div>
        )}

        {reportType === 'monthly' && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Year</label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded"
                min="2020"
                max="2100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Month</label>
              <input
                type="number"
                value={month}
                onChange={(e) => setMonth(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded"
                min="1"
                max="12"
              />
            </div>
          </div>
        )}

        {(reportType === 'top-products' || reportType === 'profit' || reportType === 'cashier-performance' || reportType === 'stock-valuation') && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded"
              />
            </div>
          </div>
        )}
      </div>

      {/* Report Content */}
      {loading ? (
        <div className="text-center py-8">Loading report...</div>
      ) : (
        <>
          {reportType === 'daily' && dailyReport && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-2xl font-bold mb-4">Daily Sales Report - {format(new Date(date), 'MMM dd, yyyy')}</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-gray-600">Total Sales</p>
                    <p className="text-2xl font-bold">{dailyReport.summary?.total_sales || 0}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Total Revenue</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(dailyReport.summary?.total_revenue || 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Total Tax</p>
                    <p className="text-2xl font-bold">{formatCurrency(dailyReport.summary?.total_tax || 0)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Total Discount</p>
                    <p className="text-2xl font-bold text-red-600">
                      {formatCurrency(dailyReport.summary?.total_discount || 0)}
                    </p>
                  </div>
                </div>
              </div>

              {dailyReport.top_products && dailyReport.top_products.length > 0 && (
                <div className="bg-white p-6 rounded-lg shadow-md">
                  <h3 className="text-xl font-bold mb-4">Top Products</h3>
                  <div className="space-y-2">
                    {dailyReport.top_products.map((product, index) => (
                      <div key={index} className="flex justify-between p-3 bg-gray-50 rounded">
                        <span className="font-semibold">{product.name}</span>
                        <span className="text-green-600 font-bold">
                          Qty: {product.quantity} | {formatCurrency(product.revenue)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {reportType === 'monthly' && monthlyReport && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-2xl font-bold mb-4">
                  Monthly Sales Report - {format(new Date(year, month - 1), 'MMMM yyyy')}
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div>
                    <p className="text-gray-600">Total Sales</p>
                    <p className="text-2xl font-bold">{monthlyReport.summary?.total_sales || 0}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Total Revenue</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(monthlyReport.summary?.total_revenue || 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Total Tax</p>
                    <p className="text-2xl font-bold">{formatCurrency(monthlyReport.summary?.total_tax || 0)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Total Discount</p>
                    <p className="text-2xl font-bold text-red-600">
                      {formatCurrency(monthlyReport.summary?.total_discount || 0)}
                    </p>
                  </div>
                </div>

                {monthlyReport.daily_breakdown && monthlyReport.daily_breakdown.length > 0 && (
                  <div>
                    <h3 className="text-xl font-bold mb-4">Daily Breakdown</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={monthlyReport.daily_breakdown}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="sale_date" />
                        <YAxis />
                        <Tooltip />
                        <Line type="monotone" dataKey="total_revenue" stroke="#3b82f6" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>
          )}

          {reportType === 'top-products' && (
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-2xl font-bold mb-4">Top Selling Products</h2>
              {topProducts.length > 0 ? (
                <div className="space-y-2">
                  {topProducts.map((product, index) => (
                    <div key={index} className="flex justify-between p-4 bg-gray-50 rounded">
                      <div>
                        <p className="font-semibold">{product.name}</p>
                        <p className="text-sm text-gray-600">Quantity Sold: {product.quantity}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600">{formatCurrency(product.revenue)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No data available</p>
              )}
            </div>
          )}

          {reportType === 'profit' && profit && (
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-2xl font-bold mb-4">Profit Analysis</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(profit.total_revenue)}</p>
                </div>
                <div>
                  <p className="text-gray-600">Total Cost</p>
                  <p className="text-2xl font-bold text-red-600">{formatCurrency(profit.total_cost)}</p>
                </div>
                <div>
                  <p className="text-gray-600">Total Profit</p>
                  <p className="text-2xl font-bold text-blue-600">{formatCurrency(profit.total_profit)}</p>
                </div>
                <div>
                  <p className="text-gray-600">Profit Margin</p>
                  <p className="text-2xl font-bold">{profit.profit_margin}%</p>
                </div>
              </div>
            </div>
          )}

          {reportType === 'cashier-performance' && (
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-2xl font-bold mb-4">Cashier Performance</h2>
              {cashierPerformance.length > 0 ? (
                <div className="space-y-3">
                  {cashierPerformance.map((cashier) => (
                    <div key={cashier.id} className="flex justify-between p-4 bg-gray-50 rounded">
                      <div>
                        <p className="font-semibold">{cashier.full_name || cashier.username}</p>
                        <p className="text-sm text-gray-600">Total Sales: {cashier.total_sales || 0}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600">{formatCurrency(cashier.total_revenue || 0)}</p>
                        <p className="text-sm text-gray-600">Avg: {formatCurrency(cashier.avg_sale_amount || 0)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No data available</p>
              )}
            </div>
          )}

          {reportType === 'stock-valuation' && stockValuation && (
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-2xl font-bold mb-4">Stock Valuation</h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                <div>
                  <p className="text-gray-600">Total Cost Value</p>
                  <p className="text-2xl font-bold text-red-600">
                    {formatCurrency(stockValuation.summary?.total_cost_value || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Total Selling Value</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(stockValuation.summary?.total_selling_value || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Profit Potential</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {formatCurrency(stockValuation.summary?.total_profit_potential || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Total Products</p>
                  <p className="text-2xl font-bold">{stockValuation.summary?.total_products || 0}</p>
                </div>
                <div>
                  <p className="text-gray-600">Low Stock Items</p>
                  <p className="text-2xl font-bold text-red-600">{stockValuation.summary?.low_stock_count || 0}</p>
                </div>
              </div>
              {stockValuation.by_category && stockValuation.by_category.length > 0 && (
                <div>
                  <h3 className="text-xl font-bold mb-4">By Category</h3>
                  <div className="space-y-2">
                    {stockValuation.by_category.map((cat, index) => (
                      <div key={index} className="flex justify-between p-3 bg-gray-50 rounded">
                        <span className="font-semibold">{cat.category_name || 'Uncategorized'}</span>
                        <div className="text-right">
                          <p className="text-green-600 font-bold">
                            {formatCurrency(cat.category_selling_value || 0)}
                          </p>
                          <p className="text-sm text-gray-600">
                            Cost: {formatCurrency(cat.category_cost_value || 0)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

