import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Calendar, DollarSign, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';
import { formatCurrency } from '../utils/currency';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function DailyClosings() {
  const { user } = useAuth();
  const [closings, setClosings] = useState([]);
  const [todaySummary, setTodaySummary] = useState(null);
  const [showClosingModal, setShowClosingModal] = useState(false);
  const [closingData, setClosingData] = useState({
    opening_cash: '',
    closing_cash: '',
    notes: '',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClosings();
    fetchTodaySummary();
  }, []);

  const fetchClosings = async () => {
    try {
      const response = await api.get('/daily-closings', {
        params: { start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] }
      });
      setClosings(response.data);
    } catch (error) {
      toast.error('Failed to load daily closings');
    } finally {
      setLoading(false);
    }
  };

  const fetchTodaySummary = async () => {
    try {
      const response = await api.get('/daily-closings/today/summary');
      setTodaySummary(response.data);
      
      if (response.data.is_closed && response.data.closing) {
        setClosingData({
          opening_cash: response.data.closing.opening_cash,
          closing_cash: response.data.closing.closing_cash,
          notes: response.data.closing.notes || '',
        });
      }
    } catch (error) {
      console.error('Failed to load today summary');
    }
  };

  const handleCloseDay = async () => {
    if (!closingData.closing_cash) {
      toast.error('Please enter closing cash amount');
      return;
    }

    try {
      await api.post('/daily-closings', {
        closing_date: new Date().toISOString().split('T')[0],
        opening_cash: parseFloat(closingData.opening_cash) || 0,
        closing_cash: parseFloat(closingData.closing_cash),
        notes: closingData.notes,
      });
      toast.success('Day closed successfully');
      setShowClosingModal(false);
      fetchClosings();
      fetchTodaySummary();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to close day');
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  const today = new Date().toISOString().split('T')[0];
  const isTodayClosed = todaySummary?.is_closed;

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Daily Closing Reports</h1>
        <p className="text-gray-600">End-of-day cash reconciliation and sales summary</p>
      </div>

      {/* Today's Summary */}
      {todaySummary && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Today's Summary ({format(new Date(), 'MMM dd, yyyy')})</h2>
            {isTodayClosed ? (
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Closed
              </span>
            ) : (
              <button
                onClick={() => setShowClosingModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Calendar className="w-4 h-4" />
                Close Day
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600">Cash Sales</p>
              <p className="text-xl font-bold">{formatCurrency(todaySummary.sales?.cash_sales || 0)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Card Sales</p>
              <p className="text-xl font-bold">{formatCurrency(todaySummary.sales?.card_sales || 0)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Mobile Sales</p>
              <p className="text-xl font-bold">{formatCurrency(todaySummary.sales?.mobile_sales || 0)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Sales</p>
              <p className="text-xl font-bold text-blue-600">{formatCurrency(todaySummary.sales?.total_sales || 0)}</p>
            </div>
          </div>

          {isTodayClosed && todaySummary.closing && (
            <div className="mt-4 pt-4 border-t">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Opening Cash</p>
                  <p className="text-lg font-semibold">{formatCurrency(todaySummary.closing.opening_cash)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Closing Cash</p>
                  <p className="text-lg font-semibold">{formatCurrency(todaySummary.closing.closing_cash)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Expenses</p>
                  <p className="text-lg font-semibold text-red-600">{formatCurrency(todaySummary.expenses?.total_expenses || 0)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Cash Difference</p>
                  <p className={`text-lg font-semibold ${
                    todaySummary.closing.cash_difference >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatCurrency(todaySummary.closing.cash_difference)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Past Closings */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-4 border-b">
          <h2 className="text-xl font-bold">Past Closings</h2>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Opening Cash</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Closing Cash</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Sales</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expenses</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Difference</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Closed By</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {closings.map((closing) => (
              <tr key={closing.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  {format(new Date(closing.closing_date), 'MMM dd, yyyy')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">{formatCurrency(closing.opening_cash)}</td>
                <td className="px-6 py-4 whitespace-nowrap font-semibold">{formatCurrency(closing.closing_cash)}</td>
                <td className="px-6 py-4 whitespace-nowrap">{formatCurrency(closing.total_sales)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-red-600">{formatCurrency(closing.total_expenses)}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`font-semibold ${
                    closing.cash_difference >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatCurrency(closing.cash_difference)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {closing.closed_by_name || 'N/A'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {closings.length === 0 && (
          <div className="p-12 text-center text-gray-500">
            <p>No closing records found</p>
          </div>
        )}
      </div>

      {/* Closing Modal */}
      {showClosingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold mb-4">Close Day</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">Date: {format(new Date(), 'MMM dd, yyyy')}</p>
                <div className="bg-blue-50 p-3 rounded mb-4">
                  <p className="text-sm font-semibold">Today's Sales Summary</p>
                  <p className="text-xs text-gray-600">Cash: {formatCurrency(todaySummary?.sales?.cash_sales || 0)}</p>
                  <p className="text-xs text-gray-600">Card: {formatCurrency(todaySummary?.sales?.card_sales || 0)}</p>
                  <p className="text-xs text-gray-600">Mobile: {formatCurrency(todaySummary?.sales?.mobile_sales || 0)}</p>
                  <p className="text-xs text-gray-600">Total: {formatCurrency(todaySummary?.sales?.total_sales || 0)}</p>
                  <p className="text-xs text-red-600">Expenses: {formatCurrency(todaySummary?.expenses?.total_expenses || 0)}</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Opening Cash</label>
                <input
                  type="number"
                  step="0.01"
                  value={closingData.opening_cash}
                  onChange={(e) => setClosingData({ ...closingData, opening_cash: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Closing Cash *</label>
                <input
                  type="number"
                  step="0.01"
                  value={closingData.closing_cash}
                  onChange={(e) => setClosingData({ ...closingData, closing_cash: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                  placeholder="Enter actual cash count"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Notes (Optional)</label>
                <textarea
                  value={closingData.notes}
                  onChange={(e) => setClosingData({ ...closingData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                  rows="3"
                  placeholder="Any notes about the day..."
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCloseDay}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Close Day
                </button>
                <button
                  onClick={() => setShowClosingModal(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

