import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { Plus, Edit, Trash2, Search, Package, Camera, Upload, X } from 'lucide-react';
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


  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      // Validate required fields - only name is required
      if (!formData.name || !formData.name.trim()) {
        toast.error('Product name is required');
        return;
      }
      
      const buyingPrice = formData.buying_price ? parseFloat(formData.buying_price) : null;
      const sellingPrice = formData.selling_price ? parseFloat(formData.selling_price) : null;
      const wholesalePrice = formData.wholesale_price ? parseFloat(formData.wholesale_price) : null;
      const stockQuantity = formData.stock_quantity ? parseInt(formData.stock_quantity) : 0;

      // Validate prices only if provided
      if (formData.buying_price && (isNaN(buyingPrice) || buyingPrice < 0)) {
        toast.error('If provided, buying price must be a valid positive number');
        return;
      }

      if (formData.selling_price && (isNaN(sellingPrice) || sellingPrice < 0)) {
        toast.error('If provided, retail selling price must be a valid positive number');
        return;
      }

      // Validate wholesale price only if provided
      if (formData.wholesale_price && (isNaN(wholesalePrice) || wholesalePrice < 0)) {
        toast.error('If provided, wholesale price must be a valid positive number');
        return;
      }

      // Validate stock quantity only if provided
      if (formData.stock_quantity && (isNaN(stockQuantity) || stockQuantity < 0)) {
        toast.error('If provided, stock quantity must be a valid positive number');
        return;
      }

      // Prepare data with proper types and handle empty strings
      const submitData = {
        name: formData.name.trim(),
        buying_price: buyingPrice || 0,
        selling_price: sellingPrice || 0,
        wholesale_price: wholesalePrice || null,
        stock_quantity: stockQuantity,
        category_id: formData.category_id || null,
        supplier_id: null, // Removed supplier
        barcode: null, // Removed barcode
        expiry_date: null,
        image_url: formData.image_url || null,
        unit_type: 'piece',
        base_unit: null,
        units_per_bulk: null,
        bulk_price: null,
        unit_price: null,
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
        image_url: product.image_url || '',
        unit_type: product.unit_type || 'piece',
        base_unit: product.base_unit || '',
        units_per_bulk: product.units_per_bulk || '',
        bulk_price: product.bulk_price || '',
        unit_price: product.unit_price || '',
      });
    setShowModal(true);
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
    if (!file) {
      // Reset file input
      e.target.value = '';
      return;
    }

    // Validate file type - accept all image formats
    const validImageTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/bmp',
      'image/svg+xml',
      'image/tiff',
      'image/x-icon',
    ];
    
    const isValidType = file.type.startsWith('image/') || validImageTypes.includes(file.type.toLowerCase());
    
    if (!isValidType) {
      toast.error(`Invalid file type. Please select an image file (JPG, PNG, GIF, WebP, etc.)`);
      e.target.value = '';
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image size must be less than 10MB');
      e.target.value = '';
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
        timeout: 30000, // 30 second timeout for large files
      });

      if (response.data && response.data.imageUrl) {
        // Update form data with image URL while preserving all other fields
        setFormData(prevFormData => ({ ...prevFormData, image_url: response.data.imageUrl }));
        toast.success('Image uploaded successfully');
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      console.error('Upload error:', error);
      console.error('Error response:', error.response?.data);
      
      // Provide detailed error message
      let errorMessage = 'Failed to upload image';
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
        if (error.response.data.details) {
          errorMessage += `: ${error.response.data.details}`;
        }
      } else if (error.message) {
        errorMessage = error.message;
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = 'Upload timeout. Please try a smaller image or check your connection.';
      } else if (error.code === 'ERR_NETWORK') {
        errorMessage = 'Network error. Please check your connection and try again.';
      }
      
      toast.error(errorMessage);
      // Reset file input on error
      e.target.value = '';
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
    <div className="p-2 sm:p-4 lg:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 sm:mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold">Products</h1>
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
              image_url: '',
              unit_type: 'piece',
              base_unit: '',
              units_per_bulk: '',
              bulk_price: '',
              unit_price: '',
            });
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm sm:text-base w-full sm:w-auto justify-center"
        >
          <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="hidden sm:inline">Add Product</span>
          <span className="sm:hidden">Add</span>
        </button>
      </div>

      {/* Search */}
      <div className="mb-4 sm:mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search products..."
            className="w-full pl-9 sm:pl-10 pr-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Products - Desktop Table / Mobile Cards */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {/* Desktop Table */}
        <div className="hidden lg:block overflow-x-auto">
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
        </div>

        {/* Mobile Cards */}
        <div className="lg:hidden divide-y divide-gray-200">
          {filteredProducts.map((product) => (
            <div key={product.id} className={`p-4 ${product.stock_quantity < 10 ? 'bg-red-50' : ''}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center flex-1 min-w-0">
                  {product.image_url ? (
                    <img
                      src={product.image_url.startsWith('http') ? product.image_url : `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}${product.image_url}`}
                      alt={product.name}
                      className="w-12 h-12 object-cover rounded mr-3 flex-shrink-0"
                    />
                  ) : (
                    <Package className="w-8 h-8 text-gray-400 mr-3 flex-shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium text-gray-900 truncate">{product.name}</h3>
                    <p className="text-sm text-gray-500">{product.category_name || 'N/A'}</p>
                    {product.barcode && (
                      <p className="text-xs text-gray-400 font-mono mt-1">Barcode: {product.barcode}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 ml-2 flex-shrink-0">
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
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500">Buying:</span>
                  <span className="ml-2 font-medium">{formatCurrency(product.buying_price)}</span>
                </div>
                <div>
                  <span className="text-gray-500">Retail:</span>
                  <span className="ml-2 font-semibold text-blue-600">{formatCurrency(product.selling_price)}</span>
                </div>
                <div>
                  <span className="text-gray-500">Wholesale:</span>
                  <span className="ml-2 font-medium">
                    {product.wholesale_price ? formatCurrency(product.wholesale_price) : 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Stock:</span>
                  <span className={`ml-2 px-2 py-1 rounded text-xs font-semibold ${
                    product.stock_quantity < 10 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {product.stock_quantity}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-8 text-gray-500">No products found</div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white p-4 sm:p-6 lg:p-8 rounded-lg max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">{editingProduct ? 'Edit Product' : 'Add Product'}</h2>
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Product Image - Prominent */}
              <div>
                <label className="block text-sm font-medium mb-2">Product Photo</label>
                {formData.image_url ? (
                  <div className="space-y-3">
                    <div className="relative inline-block">
                      <img
                        src={formData.image_url.startsWith('http') ? formData.image_url : `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}${formData.image_url}`}
                        alt="Product"
                        className="w-48 h-48 object-cover rounded-lg border-2 border-gray-300"
                      />
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, image_url: '' })}
                        className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <label className="flex-1 cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                          disabled={uploadingImage}
                        />
                        <span className="inline-flex items-center justify-center gap-2 w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                          <Upload className="w-4 h-4" />
                          Change Photo
                        </span>
                      </label>
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors">
                    <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-4">Take a photo of the product</p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={handleImageUpload}
                          className="hidden"
                          disabled={uploadingImage}
                        />
                        <span className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
                          <Camera className="w-5 h-5" />
                          Take Photo
                        </span>
                      </label>
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                          disabled={uploadingImage}
                        />
                        <span className="inline-flex items-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium">
                          <Upload className="w-5 h-5" />
                          Choose File
                        </span>
                      </label>
                    </div>
                    {uploadingImage && <p className="text-sm text-gray-500 mt-3">Uploading...</p>}
                  </div>
                )}
              </div>

              {/* Product Name */}
              <div>
                <label className="block text-sm font-medium mb-1">Product Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
                  placeholder="e.g., Njamba's Fortified Home Baking Flour"
                  required
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <select
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
                >
                  <option value="">Select category (optional)</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Prices */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Buying Price</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.buying_price}
                    onChange={(e) => setFormData({ ...formData, buying_price: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
                    placeholder="0.00 (optional)"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Retail Price</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.selling_price}
                    onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
                    placeholder="0.00 (optional)"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Wholesale Price</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.wholesale_price}
                    onChange={(e) => setFormData({ ...formData, wholesale_price: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
                    placeholder="0.00 (optional)"
                  />
                </div>
              </div>

              {/* Stock Quantity */}
              <div>
                <label className="block text-sm font-medium mb-1">Stock Quantity *</label>
                <input
                  type="number"
                  value={formData.stock_quantity}
                  onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
                  placeholder="0"
                  required
                  min="0"
                />
                <p className="text-xs text-gray-500 mt-2">
                  💡 Enter the number of <strong>sellable units</strong> you have in stock.
                  <br />
                  <span className="text-gray-600">
                    Example: If you have a bale with 12 packets inside and you sell individual packets, enter <strong>12</strong>.
                    <br />
                    If you only sell the whole bale, enter <strong>1</strong>.
                  </span>
                </p>
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

