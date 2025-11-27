import { useState, useEffect } from 'react';
import api from '../services/api';
import { Search, Receipt, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function Sales() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedSale, setSelectedSale] = useState(null);

  useEffect(() => {
    fetchSales();
  }, [startDate, endDate]);

  const fetchSales = async () => {
    try {
      setLoading(true);
      const params = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const response = await api.get('/sales', { params });
      setSales(response.data);
    } catch (error) {
      toast.error('Failed to load sales');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (sale) => {
    setSelectedSale(sale);
  };

  if (loading) {
    return <div className="p-8">Loading sales...</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Sales History</h1>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-md mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setStartDate('');
                setEndDate('');
              }}
              className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sale ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cashier</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Items</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {sales.map((sale) => {
              const items = typeof sale.items === 'string' ? JSON.parse(sale.items) : sale.items;
              return (
                <tr key={sale.id}>
                  <td className="px-6 py-4 whitespace-nowrap font-mono text-sm">{sale.sale_id}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {format(new Date(sale.date_time), 'MMM dd, yyyy HH:mm')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{sale.cashier_name || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{items.length} items</td>
                  <td className="px-6 py-4 whitespace-nowrap font-bold text-green-600">
                    ${parseFloat(sale.total_amount).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap capitalize">{sale.payment_method}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleViewDetails(sale)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                    >
                      <Receipt className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {sales.length === 0 && (
          <div className="text-center py-8 text-gray-500">No sales found</div>
        )}
      </div>

      {/* Sale Details Modal */}
      {selectedSale && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">Sale Details</h2>
            <div className="space-y-4 mb-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Sale ID</p>
                  <p className="font-semibold">{selectedSale.sale_id}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Date</p>
                  <p className="font-semibold">
                    {format(new Date(selectedSale.date_time), 'MMM dd, yyyy HH:mm')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Cashier</p>
                  <p className="font-semibold">{selectedSale.cashier_name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Payment Method</p>
                  <p className="font-semibold capitalize">{selectedSale.payment_method}</p>
                </div>
              </div>
            </div>

            <div className="border-t border-b py-4 mb-4">
              <h3 className="font-bold mb-2">Items</h3>
              {(() => {
                const items = typeof selectedSale.items === 'string' ? JSON.parse(selectedSale.items) : selectedSale.items;
                return items.map((item, index) => (
                  <div key={index} className="flex justify-between mb-2">
                    <span>{item.name} x{item.quantity}</span>
                    <span>${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ));
              })()}
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>${parseFloat(selectedSale.subtotal).toFixed(2)}</span>
              </div>
              {selectedSale.tax > 0 && (
                <div className="flex justify-between">
                  <span>Tax:</span>
                  <span>${parseFloat(selectedSale.tax).toFixed(2)}</span>
                </div>
              )}
              {selectedSale.discount > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Discount:</span>
                  <span>-${parseFloat(selectedSale.discount).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>Total:</span>
                <span>${parseFloat(selectedSale.total_amount).toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={() => setSelectedSale(null)}
              className="w-full px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

