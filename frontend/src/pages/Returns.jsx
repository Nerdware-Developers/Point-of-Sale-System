import { useState, useEffect } from 'react';
import api from '../services/api';
import { Plus, Search, Receipt, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function Returns() {
  const [returns, setReturns] = useState([]);
  const [sales, setSales] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [returnItems, setReturnItems] = useState([]);
  const [refundMethod, setRefundMethod] = useState('cash');
  const [reason, setReason] = useState('');

  useEffect(() => {
    fetchReturns();
    fetchRecentSales();
  }, []);

  const fetchReturns = async () => {
    try {
      const response = await api.get('/returns');
      setReturns(response.data);
    } catch (error) {
      toast.error('Failed to load returns');
    }
  };

  const fetchRecentSales = async () => {
    try {
      const response = await api.get('/sales', { params: { limit: 50 } });
      setSales(response.data);
    } catch (error) {
      console.error('Failed to load sales');
    }
  };

  const handleSelectSale = (sale) => {
    setSelectedSale(sale);
    const items = typeof sale.items === 'string' ? JSON.parse(sale.items) : sale.items;
    setReturnItems(items.map(item => ({ ...item, return_quantity: item.quantity })));
    setShowModal(true);
  };

  const handleReturn = async () => {
    if (returnItems.length === 0) {
      toast.error('No items selected for return');
      return;
    }

    try {
      const totalAmount = returnItems.reduce((sum, item) => sum + (item.price * item.return_quantity), 0);
      
      await api.post('/returns', {
        sale_id: selectedSale.id,
        customer_id: selectedSale.customer_id,
        items: returnItems.map(item => ({
          product_id: item.product_id,
          name: item.name,
          quantity: item.return_quantity,
          price: item.price,
        })),
        reason,
        total_amount: totalAmount,
        refund_method: refundMethod,
      });

      toast.success('Return processed successfully');
      setShowModal(false);
      setSelectedSale(null);
      setReturnItems([]);
      setReason('');
      fetchReturns();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Return failed');
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Returns & Refunds</h1>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Return ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sale ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Refund Method</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {returns.map((returnItem) => {
              const items = typeof returnItem.items === 'string' ? JSON.parse(returnItem.items) : returnItem.items;
              return (
                <tr key={returnItem.id}>
                  <td className="px-6 py-4 whitespace-nowrap font-mono text-sm">{returnItem.return_id}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {format(new Date(returnItem.date_time), 'MMM dd, yyyy HH:mm')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{returnItem.sale_id || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap font-bold text-red-600">
                    ${parseFloat(returnItem.total_amount).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap capitalize">{returnItem.refund_method}</td>
                  <td className="px-6 py-4">{returnItem.reason || 'N/A'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {returns.length === 0 && (
          <div className="text-center py-8 text-gray-500">No returns found</div>
        )}
      </div>

      {showModal && selectedSale && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Process Return</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-600">Sale ID: {selectedSale.sale_id}</p>
              <p className="text-sm text-gray-600">Date: {format(new Date(selectedSale.date_time), 'MMM dd, yyyy')}</p>
            </div>

            <div className="space-y-3 mb-4">
              <h3 className="font-bold">Items to Return:</h3>
              {returnItems.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div className="flex-1">
                    <p className="font-semibold">{item.name}</p>
                    <p className="text-sm text-gray-600">Original Qty: {item.quantity}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max={item.quantity}
                      value={item.return_quantity}
                      onChange={(e) => {
                        const newItems = [...returnItems];
                        newItems[index].return_quantity = Math.min(item.quantity, Math.max(0, parseInt(e.target.value) || 0));
                        setReturnItems(newItems);
                      }}
                      className="w-20 px-2 py-1 border border-gray-300 rounded"
                    />
                    <span className="text-gray-600">of {item.quantity}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Refund Method</label>
              <select
                value={refundMethod}
                onChange={(e) => setRefundMethod(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded"
              >
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="store_credit">Store Credit</option>
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Reason</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded"
                rows="3"
                placeholder="Reason for return..."
              />
            </div>

            <div className="mb-4 p-3 bg-red-50 rounded">
              <p className="font-bold text-red-600">
                Total Refund: ${returnItems.reduce((sum, item) => sum + (item.price * item.return_quantity), 0).toFixed(2)}
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleReturn}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Process Return
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

