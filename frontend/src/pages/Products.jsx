import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { Plus, Edit, Trash2, Search, Package, ScanLine, Download } from 'lucide-react';
import { formatCurrency } from '../utils/currency';
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
    wholesale_price: '',
    stock_quantity: '',
    barcode: '',
    supplier_id: '',
    expiry_date: '',
    image_url: '',
    unit_type: 'piece',
    base_unit: '',
    units_per_bulk: '',
    bulk_price: '',
    unit_price: '',
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
    if (!barcode || !barcode.trim()) return false;
    return products.some(p => p.barcode && p.barcode === barcode.trim() && p.id !== editingProduct?.id);
  };

  // Handle barcode scan
  const handleBarcodeScan = (barcode) => {
    if (!barcode || !barcode.trim()) return;

    // Check if product with this barcode already exists
    const existingProduct = products.find(p => p.barcode && p.barcode === barcode.trim());
    
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
    
    // Check for duplicate barcode (only if barcode is provided)
    if (formData.barcode && formData.barcode.trim() && checkBarcodeExists(formData.barcode.trim())) {
      toast.error('A product with this barcode already exists');
      return;
    }

    try {
      // Validate required fields
      if (!formData.name || !formData.name.trim()) {
        toast.error('Product name is required');
        return;
      }
      
      const buyingPrice = parseFloat(formData.buying_price);
      const sellingPrice = parseFloat(formData.selling_price);
      const wholesalePrice = parseFloat(formData.wholesale_price);
      const stockQuantity = parseInt(formData.stock_quantity);
      const unitsPerBulk = formData.units_per_bulk ? parseFloat(formData.units_per_bulk) : null;
      const bulkPrice = formData.bulk_price ? parseFloat(formData.bulk_price) : null;
      const unitPrice = formData.unit_price ? parseFloat(formData.unit_price) : null;

      if (isNaN(buyingPrice) || buyingPrice < 0) {
        toast.error('Valid buying price is required');
        return;
      }

      if (isNaN(sellingPrice) || sellingPrice < 0) {
        toast.error('Valid retail selling price is required');
        return;
      }

      // Validate wholesale price is required
      if (!formData.wholesale_price || isNaN(wholesalePrice) || wholesalePrice < 0) {
        toast.error('Valid wholesale selling price is required');
        return;
      }

      if (isNaN(stockQuantity) || stockQuantity < 0) {
        toast.error('Valid stock quantity is required');
        return;
      }

      // Validate bulk/unit pricing if base unit is provided
      if (formData.base_unit && formData.base_unit.trim()) {
        if (!unitsPerBulk || unitsPerBulk <= 0) {
          toast.error('Units per bulk is required when base unit is specified');
          return;
        }
        if ((!bulkPrice || bulkPrice < 0) && (!unitPrice || unitPrice < 0)) {
          toast.error('Either bulk price or unit price (or both) must be provided when base unit is specified');
          return;
        }
      }

      // Prepare data with proper types and handle empty strings
      const submitData = {
        name: formData.name.trim(),
        buying_price: buyingPrice,
        selling_price: sellingPrice,
        wholesale_price: wholesalePrice,
        stock_quantity: stockQuantity,
        category_id: formData.category_id || null,
        supplier_id: formData.supplier_id || null,
        barcode: formData.barcode && formData.barcode.trim() ? formData.barcode.trim() : null,
        expiry_date: null, // Removed expiry date
        image_url: formData.image_url || null,
        unit_type: formData.unit_type || 'piece',
        base_unit: formData.base_unit && formData.base_unit.trim() ? formData.base_unit.trim() : null,
        units_per_bulk: unitsPerBulk,
        bulk_price: bulkPrice,
        unit_price: unitPrice,
      };

      if (editingProduct) {
        await api.put(`/products/${editingProduct.id}`, submitData);
        toast.success('Product updated successfully');
      } else {
        await api.post('/products', submitData);
        toast.success('Product created successfully');
      }
      setShowModal(false);
      setEditingProduct(null);
      setFormData({
        name: '',
        category_id: '',
        buying_price: '',
        selling_price: '',
        wholesale_price: '',
        stock_quantity: '',
        barcode: '',
        supplier_id: '',
        image_url: '',
        unit_type: 'piece',
        base_unit: '',
        units_per_bulk: '',
        bulk_price: '',
        unit_price: '',
      });
      fetchProducts();
    } catch (error) {
      console.error('Product submit error:', error);
      console.error('Error response:', error.response?.data);
      
      // Handle different error response formats
      let errorMessage = 'Operation failed';
      
      if (error.response?.data) {
        if (error.response.data.error) {
          errorMessage = error.response.data.error;
        } else if (error.response.data.errors && Array.isArray(error.response.data.errors)) {
          // Handle validation errors array
          errorMessage = error.response.data.errors.map(err => err.msg || err.message).join(', ');
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
      setFormData({
        name: product.name,
        category_id: product.category_id || '',
        buying_price: product.buying_price,
        selling_price: product.selling_price,
        wholesale_price: product.wholesale_price || '',
        stock_quantity: product.stock_quantity,
        barcode: product.barcode || '',
        supplier_id: product.supplier_id || '',
        image_url: product.image_url || '',
        unit_type: product.unit_type || 'piece',
        base_unit: product.base_unit || '',
        units_per_bulk: product.units_per_bulk || '',
        bulk_price: product.bulk_price || '',
        unit_price: product.unit_price || '',
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

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    try {
      setUploadingImage(true);
      const uploadFormData = new FormData();
      uploadFormData.append('image', file);

      const response = await api.post('/upload/product-image', uploadFormData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Update form data with image URL while preserving all other fields
      setFormData(prevFormData => ({ ...prevFormData, image_url: response.data.imageUrl }));
      toast.success('Image uploaded successfully');
    } catch (error) {
      toast.error('Failed to upload image');
      console.error('Upload error:', error);
    } finally {
      setUploadingImage(false);
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
              wholesale_price: '',
              stock_quantity: '',
              barcode: '',
              supplier_id: '',
              image_url: '',
              unit_type: 'piece',
              base_unit: '',
              units_per_bulk: '',
              bulk_price: '',
              unit_price: '',
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Retail Price</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Wholesale Price</th>
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
                        src={product.image_url.startsWith('http') ? product.image_url : `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}${product.image_url}`}
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
                <td className="px-6 py-4 whitespace-nowrap">{formatCurrency(product.buying_price)}</td>
                <td className="px-6 py-4 whitespace-nowrap font-semibold">{formatCurrency(product.selling_price)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                  {product.wholesale_price ? formatCurrency(product.wholesale_price) : 'N/A'}
                </td>
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
                  <label className="block text-sm font-semibold text-blue-600">Scan Barcode (Optional)</label>
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
                  placeholder="Scan barcode with scanner or type manually (optional)..."
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
                  <label className="block text-sm font-medium mb-1">Barcode (Optional)</label>
                  <input
                    type="text"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded font-mono"
                    placeholder="Type barcode here (optional)"
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Buying Price *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.buying_price}
                    onChange={(e) => setFormData({ ...formData, buying_price: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                    placeholder="0.00"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Cost price when purchasing from supplier</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Retail Selling Price *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.selling_price}
                    onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                    placeholder="0.00"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Price for retail customers</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Wholesale Selling Price *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.wholesale_price}
                    onChange={(e) => setFormData({ ...formData, wholesale_price: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                    placeholder="0.00"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Price for wholesale/bulk customers</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Stock Quantity *</label>
                  <input
                    type="number"
                    value={formData.stock_quantity}
                    onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                    placeholder="0"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Current stock available</p>
                </div>
              </div>

              {/* Bulk/Unit Configuration */}
              <div className="border-t pt-4 mt-4">
                <h3 className="text-lg font-semibold mb-3">Bulk/Unit Sales Configuration (Optional)</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Configure if this product can be sold in bulk (e.g., 20L container) or per unit (e.g., per liter)
                </p>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Base Unit (e.g., "liter", "packet", "kg")</label>
                    <input
                      type="text"
                      value={formData.base_unit}
                      onChange={(e) => setFormData({ ...formData, base_unit: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded"
                      placeholder="e.g., liter, packet, kg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Units Per Bulk</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.units_per_bulk}
                      onChange={(e) => setFormData({ ...formData, units_per_bulk: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded"
                      placeholder="e.g., 20 (for 20L container)"
                    />
                    <p className="text-xs text-gray-500 mt-1">How many units in one bulk item</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Bulk Price (Price for entire bulk)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.bulk_price}
                      onChange={(e) => setFormData({ ...formData, bulk_price: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded"
                      placeholder="e.g., 5000 (for 20L container)"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Unit Price (Price per unit)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.unit_price}
                      onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded"
                      placeholder="e.g., 250 (per liter)"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Example: Cooking oil - Base unit: "liter", Units per bulk: 20, Bulk price: 5000, Unit price: 250
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Product Image</label>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <label className="flex-1 cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="w-full px-3 py-2 border border-gray-300 rounded cursor-pointer"
                        disabled={uploadingImage}
                      />
                      <span className="text-xs text-gray-500 block mt-1">Choose from gallery</span>
                    </label>
                    <label className="flex-1 cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleImageUpload}
                        className="w-full px-3 py-2 border border-gray-300 rounded cursor-pointer"
                        disabled={uploadingImage}
                      />
                      <span className="text-xs text-gray-500 block mt-1">Take a photo</span>
                    </label>
                  </div>
                  {uploadingImage && <p className="text-sm text-gray-500">Uploading...</p>}
                  {formData.image_url && (
                    <div className="mt-2">
                      <img
                        src={formData.image_url.startsWith('http') ? formData.image_url : `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}${formData.image_url}`}
                        alt="Product"
                        className="w-32 h-32 object-cover rounded border"
                      />
                    </div>
                  )}
                </div>
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
                      wholesale_price: '',
                      stock_quantity: '',
                      barcode: '',
                      supplier_id: '',
                      image_url: '',
                      unit_type: 'piece',
                      base_unit: '',
                      units_per_bulk: '',
                      bulk_price: '',
                      unit_price: '',
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

