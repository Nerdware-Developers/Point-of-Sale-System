import { useState, useEffect } from 'react';
import api from '../services/api';
import { Plus, Package, TrendingUp, TrendingDown, Edit } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function StockAdjustments() {
  const [adjustments, setAdjustments] = useState([]);
  const [products, setProducts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    product_id: '',
    adjustment_type: 'add',
    quantity_change: '',
    reason: '',
  });

  useEffect(() => {
    fetchAdjustments();
    fetchProducts();
  }, []);

  const fetchAdjustments = async () => {
    try {
      const response = await api.get('/stock-adjustments');
      setAdjustments(response.data);
    } catch (error) {
      toast.error('Failed to load stock adjustments');
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await api.get('/products');
      setProducts(response.data);
    } catch (error) {
      console.error('Failed to load products');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/stock-adjustments', formData);
      toast.success('Stock adjustment created successfully');
      setShowModal(false);
      setFormData({ product_id: '', adjustment_type: 'add', quantity_change: '', reason: '' });
      fetchAdjustments();
      fetchProducts();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Operation failed');
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Stock Adjustments</h1>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          New Adjustment
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Change</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Previous</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">New</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">By</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {adjustments.map((adj) => (
              <tr key={adj.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  {format(new Date(adj.created_at), 'MMM dd, yyyy HH:mm')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap font-medium">{adj.product_name}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 py-1 rounded text-sm font-semibold ${
                      adj.adjustment_type === 'add'
                        ? 'bg-green-100 text-green-800'
                        : adj.adjustment_type === 'remove'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {adj.adjustment_type}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`font-bold ${adj.quantity_change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {adj.quantity_change > 0 ? '+' : ''}{adj.quantity_change}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">{adj.previous_quantity}</td>
                <td className="px-6 py-4 whitespace-nowrap font-bold">{adj.new_quantity}</td>
                <td className="px-6 py-4">{adj.reason || 'N/A'}</td>
                <td className="px-6 py-4 whitespace-nowrap">{adj.created_by_name || 'N/A'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {adjustments.length === 0 && (
          <div className="text-center py-8 text-gray-500">No stock adjustments found</div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold mb-6">Stock Adjustment</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Product *</label>
                <select
                  value={formData.product_id}
                  onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                  required
                >
                  <option value="">Select product</option>
                  {products.map((prod) => (
                    <option key={prod.id} value={prod.id}>
                      {prod.name} (Stock: {prod.stock_quantity})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Adjustment Type *</label>
                <select
                  value={formData.adjustment_type}
                  onChange={(e) => setFormData({ ...formData, adjustment_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                  required
                >
                  <option value="add">Add Stock</option>
                  <option value="remove">Remove Stock</option>
                  <option value="set">Set Stock</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  {formData.adjustment_type === 'set' ? 'New Quantity' : 'Quantity Change'} *
                </label>
                <input
                  type="number"
                  value={formData.quantity_change}
                  onChange={(e) => setFormData({ ...formData, quantity_change: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                  required
                  min={formData.adjustment_type === 'set' ? '0' : '1'}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Reason</label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                  rows="3"
                  placeholder="e.g., Damaged goods, Expired items, Stock count correction..."
                />
              </div>
              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Apply Adjustment
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

