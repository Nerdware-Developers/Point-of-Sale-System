import { useState, useEffect } from 'react';
import api from '../services/api';
import { Plus, Edit, Package, CheckCircle, XCircle } from 'lucide-react';
import { formatCurrency } from '../utils/currency';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function PurchaseOrders() {
  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    supplier_id: '',
    items: [],
    order_date: new Date().toISOString().split('T')[0],
    expected_date: '',
  });

  useEffect(() => {
    fetchOrders();
    fetchSuppliers();
    fetchProducts();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await api.get('/purchase-orders');
      setOrders(response.data);
    } catch (error) {
      toast.error('Failed to load purchase orders');
    }
  };

  const fetchSuppliers = async () => {
    try {
      const response = await api.get('/suppliers');
      setSuppliers(response.data);
    } catch (error) {
      console.error('Failed to load suppliers');
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
    if (formData.items.length === 0) {
      toast.error('Please add items to the order');
      return;
    }

    try {
      const totalAmount = formData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      
      await api.post('/purchase-orders', {
        ...formData,
        total_amount: totalAmount,
      });

      toast.success('Purchase order created successfully');
      setShowModal(false);
      setFormData({ supplier_id: '', items: [], order_date: new Date().toISOString().split('T')[0], expected_date: '' });
      fetchOrders();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Operation failed');
    }
  };

  const handleStatusUpdate = async (id, status) => {
    try {
      await api.patch(`/purchase-orders/${id}/status`, {
        status,
        received_date: status === 'received' ? new Date().toISOString().split('T')[0] : null,
      });
      toast.success('Order status updated');
      fetchOrders();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Purchase Orders</h1>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          New Order
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expected Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {orders.map((order) => {
              const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
              return (
                <tr key={order.id}>
                  <td className="px-6 py-4 whitespace-nowrap font-mono text-sm">{order.order_id}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{order.supplier_name || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{format(new Date(order.order_date), 'MMM dd, yyyy')}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {order.expected_date ? format(new Date(order.expected_date), 'MMM dd, yyyy') : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap font-bold">{formatCurrency(order.total_amount)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 rounded text-sm font-semibold ${
                        order.status === 'received'
                          ? 'bg-green-100 text-green-800'
                          : order.status === 'cancelled'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {order.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleStatusUpdate(order.id, 'received')}
                          className="p-2 text-green-600 hover:bg-green-50 rounded"
                          title="Mark as Received"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleStatusUpdate(order.id, 'cancelled')}
                          className="p-2 text-red-600 hover:bg-red-50 rounded"
                          title="Cancel Order"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {orders.length === 0 && (
          <div className="text-center py-8 text-gray-500">No purchase orders found</div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6">Create Purchase Order</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Supplier *</label>
                  <select
                    value={formData.supplier_id}
                    onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                    required
                  >
                    <option value="">Select supplier</option>
                    {suppliers.map((sup) => (
                      <option key={sup.id} value={sup.id}>
                        {sup.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Order Date</label>
                  <input
                    type="date"
                    value={formData.order_date}
                    onChange={(e) => setFormData({ ...formData, order_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Expected Delivery Date</label>
                <input
                  type="date"
                  value={formData.expected_date}
                  onChange={(e) => setFormData({ ...formData, expected_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Items</label>
                <div className="space-y-2">
                  {formData.items.map((item, index) => (
                    <div key={index} className="flex gap-2 items-center p-2 bg-gray-50 rounded">
                      <select
                        value={item.product_id}
                        onChange={(e) => {
                          const product = products.find(p => p.id === parseInt(e.target.value));
                          const newItems = [...formData.items];
                          newItems[index] = {
                            product_id: product.id,
                            name: product.name,
                            quantity: item.quantity || 1,
                            price: product.buying_price,
                          };
                          setFormData({ ...formData, items: newItems });
                        }}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded"
                      >
                        <option value="">Select product</option>
                        {products.map((prod) => (
                          <option key={prod.id} value={prod.id}>
                            {prod.name}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => {
                          const newItems = [...formData.items];
                          newItems[index].quantity = parseInt(e.target.value) || 1;
                          setFormData({ ...formData, items: newItems });
                        }}
                        className="w-24 px-3 py-2 border border-gray-300 rounded"
                        min="1"
                      />
                      <span className="w-24">{formatCurrency(item.price || 0)}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, items: formData.items.filter((_, i) => i !== index) });
                        }}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({ ...formData, items: [...formData.items, { product_id: '', quantity: 1, price: 0 }] });
                    }}
                    className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded hover:border-blue-500"
                  >
                    <Plus className="w-4 h-4 inline mr-2" />
                    Add Item
                  </button>
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Create Order
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

