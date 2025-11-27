import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { Plus, Edit, Trash2, Search, Package, ScanLine, Download } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    category_id: '',
    buying_price: '',
    selling_price: '',
    stock_quantity: '',
    barcode: '',
    supplier_id: '',
    expiry_date: '',
    image_url: '',
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const barcodeInputRef = useRef(null);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchSuppliers();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await api.get('/products');
      setProducts(response.data);
    } catch (error) {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await api.get('/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Failed to load categories');
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

  // Check if barcode already exists
  const checkBarcodeExists = (barcode) => {
    if (!barcode) return false;
    return products.some(p => p.barcode === barcode && p.id !== editingProduct?.id);
  };

  // Handle barcode scan
  const handleBarcodeScan = (barcode) => {
    if (!barcode.trim()) return;

    // Check if product with this barcode already exists
    const existingProduct = products.find(p => p.barcode === barcode.trim());
    
    if (existingProduct && !editingProduct) {
      toast.error(`Product with barcode ${barcode} already exists: ${existingProduct.name}`);
      setFormData({ ...formData, barcode: '' });
      return;
    }

    // Visual feedback
    setIsScanning(true);
    setTimeout(() => setIsScanning(false), 300);
    
    setFormData({ ...formData, barcode: barcode.trim() });
    toast.success('Barcode scanned successfully', { duration: 1000 });
    
    // Auto-focus next field (product name) if empty
    setTimeout(() => {
      const nameInput = document.querySelector('input[type="text"][value=""]');
      if (nameInput && !formData.name) {
        nameInput.focus();
      }
    }, 100);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Check for duplicate barcode
    if (formData.barcode && checkBarcodeExists(formData.barcode)) {
      toast.error('A product with this barcode already exists');
      return;
    }

    try {
      if (editingProduct) {
        await api.put(`/products/${editingProduct.id}`, formData);
        toast.success('Product updated successfully');
      } else {
        await api.post('/products', formData);
        toast.success('Product created successfully');
      }
      setShowModal(false);
      setEditingProduct(null);
      setFormData({
        name: '',
        category_id: '',
        buying_price: '',
        selling_price: '',
        stock_quantity: '',
        barcode: '',
        supplier_id: '',
        expiry_date: '',
      });
      fetchProducts();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Operation failed');
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      category_id: product.category_id || '',
      buying_price: product.buying_price,
      selling_price: product.selling_price,
      stock_quantity: product.stock_quantity,
      barcode: product.barcode || '',
      supplier_id: product.supplier_id || '',
      expiry_date: product.expiry_date || '',
      image_url: product.image_url || '',
    });
    setShowModal(true);
    // Focus barcode input when editing
    setTimeout(() => {
      barcodeInputRef.current?.focus();
    }, 100);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;

    try {
      await api.delete(`/products/${id}`);
      toast.success('Product deleted successfully');
      fetchProducts();
    } catch (error) {
      toast.error('Failed to delete product');
    }
  };

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.barcode?.includes(searchQuery)
  );

  if (loading) {
    return <div className="p-8">Loading products...</div>;
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Products</h1>
        <button
          onClick={() => {
            setEditingProduct(null);
            setFormData({
              name: '',
              category_id: '',
              buying_price: '',
              selling_price: '',
              stock_quantity: '',
              barcode: '',
              supplier_id: '',
              expiry_date: '',
            });
            setShowModal(true);
            // Auto-focus barcode input when modal opens
            setTimeout(() => {
              barcodeInputRef.current?.focus();
            }, 100);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          Add Product
        </button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search products by name or barcode..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Barcode</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Buying Price</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Selling Price</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredProducts.map((product) => (
              <tr key={product.id} className={product.stock_quantity < 10 ? 'bg-red-50' : ''}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {product.image_url ? (
                      <img
                        src={`http://localhost:5000${product.image_url}`}
                        alt={product.name}
                        className="w-10 h-10 object-cover rounded mr-2"
                      />
                    ) : (
                      <Package className="w-5 h-5 text-gray-400 mr-2" />
                    )}
                    <span className="font-medium">{product.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-600">{product.category_name || 'N/A'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-600 font-mono text-sm">{product.barcode}</td>
                <td className="px-6 py-4 whitespace-nowrap">${parseFloat(product.buying_price).toFixed(2)}</td>
                <td className="px-6 py-4 whitespace-nowrap font-semibold">${parseFloat(product.selling_price).toFixed(2)}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 rounded text-sm font-semibold ${
                    product.stock_quantity < 10 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {product.stock_quantity}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(product)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredProducts.length === 0 && (
          <div className="text-center py-8 text-gray-500">No products found</div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6">{editingProduct ? 'Edit Product' : 'Add Product'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Barcode Scanner Section */}
              <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <ScanLine className="w-5 h-5 text-blue-600" />
                  <label className="block text-sm font-semibold text-blue-600">Scan Barcode</label>
                </div>
                <input
                  ref={barcodeInputRef}
                  type="text"
                  value={formData.barcode}
                  onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                  onKeyDown={(e) => {
                    // Handle barcode scanner (sends Enter after barcode)
                    if (e.key === 'Enter' && formData.barcode.trim()) {
                      e.preventDefault();
                      handleBarcodeScan(formData.barcode);
                    }
                  }}
                  placeholder="Scan barcode with scanner or type manually..."
                  className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg font-mono ${
                    isScanning ? 'border-green-500 bg-green-50' : 'border-blue-300'
                  }`}
                  style={{ fontSize: '16px' }}
                />
                <p className="text-xs text-gray-600 mt-2">
                  💡 Point your barcode scanner here and scan. The barcode will be automatically captured.
                </p>
                {formData.barcode && checkBarcodeExists(formData.barcode) && (
                  <p className="text-xs text-red-600 mt-1">
                    ⚠️ A product with this barcode already exists!
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Product Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Barcode (Manual Entry)</label>
                  <input
                    type="text"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded font-mono"
                    placeholder="Or type barcode here"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Category</label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                  >
                    <option value="">Select category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Supplier</label>
                  <select
                    value={formData.supplier_id}
                    onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                  >
                    <option value="">Select supplier</option>
                    {suppliers.map((sup) => (
                      <option key={sup.id} value={sup.id}>
                        {sup.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Buying Price *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.buying_price}
                    onChange={(e) => setFormData({ ...formData, buying_price: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Selling Price *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.selling_price}
                    onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Stock Quantity *</label>
                  <input
                    type="number"
                    value={formData.stock_quantity}
                    onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Expiry Date</label>
                <input
                  type="date"
                  value={formData.expiry_date}
                  onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Product Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                  disabled={uploadingImage}
                />
                {uploadingImage && <p className="text-sm text-gray-500 mt-1">Uploading...</p>}
                {formData.image_url && (
                  <div className="mt-2">
                    <img
                      src={`http://localhost:5000${formData.image_url}`}
                      alt="Product"
                      className="w-32 h-32 object-cover rounded border"
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  {editingProduct ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingProduct(null);
                    setFormData({
                      name: '',
                      category_id: '',
                      buying_price: '',
                      selling_price: '',
                      stock_quantity: '',
                      barcode: '',
                      supplier_id: '',
                      expiry_date: '',
                    });
                  }}
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

