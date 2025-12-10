import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { Search, ShoppingCart, Package, Grid, List, Filter, X } from 'lucide-react';
import { formatCurrency } from '../utils/currency';
import toast from 'react-hot-toast';

export default function ProductDisplay() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  useEffect(() => {
    // Filter products when products, search, or category changes
    let filtered = [...products];

    // Filter by search query
    if (searchQuery.trim()) {
      filtered = filtered.filter(
        (product) =>
          product.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.barcode?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by category
    if (selectedCategory) {
      filtered = filtered.filter(
        (product) => product.category_id === parseInt(selectedCategory)
      );
    }

    setFilteredProducts(filtered);
  }, [products, searchQuery, selectedCategory]);

  const fetchProducts = async () => {
    try {
      const response = await api.get('/products');
      const allProducts = response.data || [];
      setProducts(allProducts);
      setFilteredProducts(allProducts);
    } catch (error) {
      console.error('Failed to load products:', error);
      toast.error('Failed to load products');
      setProducts([]);
      setFilteredProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await api.get('/categories');
      setCategories(response.data || []);
    } catch (error) {
      console.error('Failed to load categories:', error);
      setCategories([]);
    }
  };

  const handleProductClick = (product) => {
    if (product.stock_quantity > 0) {
      navigate('/checkout', { state: { selectedProduct: product } });
    } else {
      toast.error('Product is out of stock');
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('');
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-8 flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header Section */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">Shop</h1>
          <p className="text-gray-600 text-sm sm:text-base">Browse our products and add them to your cart</p>
        </div>

        {/* Search and Controls Bar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search Bar */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
              />
            </div>

            {/* Category Filter - Desktop */}
            <div className="hidden sm:block sm:w-56">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base bg-white"
              >
                <option value="">All Categories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            {/* View Mode Toggle */}
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                aria-label="Grid view"
              >
                <Grid className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'list'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                aria-label="List view"
              >
                <List className="w-5 h-5" />
              </button>
            </div>

            {/* Mobile Filter Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="sm:hidden flex items-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Filter className="w-5 h-5" />
              Filters
            </button>
          </div>

          {/* Mobile Filters */}
          {showFilters && (
            <div className="mt-4 sm:hidden space-y-3 pt-4 border-t border-gray-200">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Categories</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Active Filters */}
          {(searchQuery || selectedCategory) && (
            <div className="mt-4 flex flex-wrap gap-2 items-center">
              <span className="text-sm text-gray-600">Active filters:</span>
              {searchQuery && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                  Search: "{searchQuery}"
                  <button
                    onClick={() => setSearchQuery('')}
                    className="hover:bg-blue-200 rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {selectedCategory && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                  {categories.find(c => c.id === parseInt(selectedCategory))?.name}
                  <button
                    onClick={() => setSelectedCategory('')}
                    className="hover:bg-blue-200 rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              <button
                onClick={clearFilters}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Clear all
              </button>
            </div>
          )}

          {/* Results Count */}
          <div className="mt-4 text-sm text-gray-600">
            Showing <span className="font-semibold">{filteredProducts.length}</span> of{' '}
            <span className="font-semibold">{products.length}</span> products
          </div>
        </div>

        {/* Products Display */}
        {filteredProducts.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <Package className="w-20 h-20 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-700 text-lg font-semibold mb-2">No products found</p>
            <p className="text-gray-500 text-sm mb-6">
              {searchQuery || selectedCategory
                ? 'Try adjusting your search or filters'
                : products.length === 0
                ? 'No products have been added yet'
                : 'No products match your current filters'}
            </p>
            {products.length === 0 && (
              <Link
                to="/products"
                className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Add Products
              </Link>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          /* Grid View */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-200 group"
              >
                {/* Product Image */}
                <div className="relative h-48 sm:h-56 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
                  {product.image_url ? (
                    <img
                      src={product.image_url.startsWith('http') ? product.image_url : `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}${product.image_url}`}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-16 h-16 text-gray-400" />
                    </div>
                  )}
                  {/* Stock Badge */}
                  {product.stock_quantity < 10 && product.stock_quantity > 0 && (
                    <div className="absolute top-3 right-3 bg-amber-500 text-white px-2.5 py-1 rounded-full text-xs font-semibold shadow-md">
                      Low Stock
                    </div>
                  )}
                  {product.stock_quantity === 0 && (
                    <div className="absolute top-3 right-3 bg-red-500 text-white px-2.5 py-1 rounded-full text-xs font-semibold shadow-md">
                      Out of Stock
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <div className="p-4 sm:p-5">
                  <h3 className="font-semibold text-base sm:text-lg text-gray-900 mb-1.5 line-clamp-2 min-h-[3rem]">
                    {product.name}
                  </h3>
                  {product.category_name && (
                    <p className="text-xs sm:text-sm text-gray-500 mb-3">{product.category_name}</p>
                  )}
                  
                  {/* Price and Stock */}
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <span className="text-xl sm:text-2xl font-bold text-blue-600">
                        {formatCurrency(product.selling_price)}
                      </span>
                      {product.wholesale_price && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          Wholesale: {formatCurrency(product.wholesale_price)}
                        </p>
                      )}
                    </div>
                    {product.stock_quantity > 0 && (
                      <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                        {product.stock_quantity} left
                      </span>
                    )}
                  </div>

                  {/* Add to Cart Button */}
                  <button
                    onClick={() => handleProductClick(product)}
                    disabled={!product.stock_quantity || product.stock_quantity <= 0}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium text-sm sm:text-base shadow-sm hover:shadow-md"
                  >
                    <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" />
                    {product.stock_quantity > 0 ? 'Add to Cart' : 'Out of Stock'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* List View */
          <div className="space-y-3">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all duration-200"
              >
                <div className="flex flex-col sm:flex-row">
                  {/* Product Image */}
                  <div className="relative w-full sm:w-32 h-48 sm:h-32 bg-gradient-to-br from-gray-100 to-gray-200 flex-shrink-0">
                    {product.image_url ? (
                      <img
                        src={product.image_url.startsWith('http') ? product.image_url : `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}${product.image_url}`}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-12 h-12 text-gray-400" />
                      </div>
                    )}
                    {(product.stock_quantity < 10 || product.stock_quantity === 0) && (
                      <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-semibold ${
                        product.stock_quantity === 0 ? 'bg-red-500' : 'bg-amber-500'
                      } text-white`}>
                        {product.stock_quantity === 0 ? 'Out of Stock' : 'Low Stock'}
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="flex-1 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg text-gray-900 mb-1">{product.name}</h3>
                      {product.category_name && (
                        <p className="text-sm text-gray-500 mb-2">{product.category_name}</p>
                      )}
                      <div className="flex items-center gap-4">
                        <span className="text-xl font-bold text-blue-600">
                          {formatCurrency(product.selling_price)}
                        </span>
                        {product.stock_quantity > 0 && (
                          <span className="text-sm text-gray-600">
                            {product.stock_quantity} in stock
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleProductClick(product)}
                      disabled={!product.stock_quantity || product.stock_quantity <= 0}
                      className="sm:w-auto w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      {product.stock_quantity > 0 ? 'Add to Cart' : 'Out of Stock'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
