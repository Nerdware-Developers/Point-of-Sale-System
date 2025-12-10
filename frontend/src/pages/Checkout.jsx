import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Search, Plus, Minus, Trash2, Receipt, X, ScanLine, Save, RotateCcw, User, Star } from 'lucide-react';
import { format } from 'date-fns';
import { formatCurrency } from '../utils/currency';
import toast from 'react-hot-toast';

export default function Checkout() {
  const { user } = useAuth();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [saleType, setSaleType] = useState('retail'); // 'retail' or 'wholesale'
  const [discount, setDiscount] = useState(0);
  const [tax, setTax] = useState(0);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastSale, setLastSale] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [heldTransactions, setHeldTransactions] = useState([]);
  const [showHeldModal, setShowHeldModal] = useState(false);
  const [quickProducts, setQuickProducts] = useState([]);
  const [isCreditSale, setIsCreditSale] = useState(false);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const searchInputRef = useRef(null);
  const barcodeTimeoutRef = useRef(null);

  const addToCart = (product, saleUnit = 'bulk') => {
    setCart((currentCart) => {
      // Check if product has bulk/unit configuration
      const hasBulkUnit = product.base_unit && product.units_per_bulk;
      
      // Determine price based on sale type and unit
      let price = saleType === 'wholesale' && product.wholesale_price 
        ? product.wholesale_price 
        : product.selling_price;

      // Override with bulk/unit pricing if configured
      if (hasBulkUnit) {
        if (saleUnit === 'bulk' && product.bulk_price) {
          price = product.bulk_price;
        } else if (saleUnit === 'unit' && product.unit_price) {
          price = product.unit_price;
        }
      }

      // Calculate stock check based on unit type
      let availableStock = product.stock_quantity;
      if (hasBulkUnit && saleUnit === 'unit') {
        // If selling per unit, check if we have enough units
        availableStock = product.stock_quantity * product.units_per_bulk;
      }

      const existingItem = currentCart.find((item) => 
        item.id === product.id && item.saleUnit === saleUnit
      );

      if (existingItem) {
        const currentQty = existingItem.quantity;
        const maxQty = hasBulkUnit && saleUnit === 'unit' 
          ? product.stock_quantity * product.units_per_bulk 
          : product.stock_quantity;
        
        if (currentQty >= maxQty) {
          toast.error('Insufficient stock');
          return currentCart;
        }
        return currentCart.map((item) =>
          item.id === product.id && item.saleUnit === saleUnit
            ? { ...item, quantity: item.quantity + 1, price }
            : item
        );
      } else {
        if (availableStock <= 0) {
          toast.error('Product out of stock');
          return currentCart;
        }
        return [...currentCart, { 
          ...product, 
          quantity: 1, 
          price,
          saleUnit: hasBulkUnit ? saleUnit : 'piece',
          displayName: hasBulkUnit 
            ? `${product.name} (${saleUnit === 'bulk' ? 'Bulk' : `Per ${product.base_unit}`})`
            : product.name
        }];
      }
    });
  };

  useEffect(() => {
    fetchProducts();
    fetchCustomers();
    fetchHeldTransactions();
    
    // Auto-focus search input on mount
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);
  }, []);

  // Handle product selection from Shop page
  useEffect(() => {
    if (location.state?.selectedProduct) {
      const selectedProduct = location.state.selectedProduct;
      // Clear the state first to avoid re-adding on re-render
      window.history.replaceState({}, document.title);
      // Add to cart after a small delay to ensure state is cleared
      setTimeout(() => {
        addToCart(selectedProduct);
      }, 100);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  useEffect(() => {
    // Get top selling products for quick buttons
    const topProducts = products
      .filter(p => p.stock_quantity > 0)
      .sort((a, b) => (b.stock_quantity || 0) - (a.stock_quantity || 0))
      .slice(0, 8);
    setQuickProducts(topProducts);
  }, [products]);

  // Keep input focused when not in modal
  useEffect(() => {
    if (!showReceipt) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [showReceipt, cart]);

  // Handle barcode scanner input (scanners send data very quickly)
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Prevent default if Enter is pressed in search input
      if (e.key === 'Enter' && document.activeElement === searchInputRef.current) {
        e.preventDefault();
        if (searchQuery.trim()) {
          handleSearch();
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [searchQuery]);

  const fetchProducts = async () => {
    try {
      const response = await api.get('/products');
      const productsData = Array.isArray(response.data) ? response.data : [];
      setProducts(productsData);
      
      // Save to offline DB
      if (productsData.length > 0) {
        const { saveProducts } = await import('../utils/offlineDB.js');
        const offlineDB = (await import('../utils/offlineDB.js')).default;
        await offlineDB.saveProducts(productsData);
      }
    } catch (error) {
      // Try to load from offline DB
      try {
        const offlineDB = (await import('../utils/offlineDB.js')).default;
        const offlineProducts = await offlineDB.getProducts();
        setProducts(offlineProducts);
        if (offlineProducts.length > 0) {
          toast.success(`Loaded ${offlineProducts.length} products from offline storage`);
        }
      } catch (dbError) {
        toast.error('Failed to load products');
      }
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await api.get('/customers');
      setCustomers(response.data);
    } catch (error) {
      console.error('Failed to load customers');
    }
  };

  const fetchHeldTransactions = async () => {
    try {
      const response = await api.get('/held-transactions');
      setHeldTransactions(response.data);
    } catch (error) {
      console.error('Failed to load held transactions');
    }
  };

  const handleSearch = () => {
    if (!searchQuery.trim()) return;

    const trimmedQuery = searchQuery.trim();
    
    // Prioritize exact barcode match first (for barcode scanners)
    let foundProduct = products.find((p) => p.barcode === trimmedQuery);
    
    // If no exact barcode match, try name search
    if (!foundProduct) {
      foundProduct = products.find((p) => 
        p.name.toLowerCase().includes(trimmedQuery.toLowerCase())
      );
    }

    if (foundProduct) {
      if (foundProduct.stock_quantity <= 0) {
        toast.error('Product out of stock');
        setSearchQuery('');
        searchInputRef.current?.focus();
        return;
      }
      
      // Visual feedback for barcode scan
      setIsScanning(true);
      setTimeout(() => setIsScanning(false), 300);
      
      // Check if product has bulk/unit options
      const hasBulkUnit = foundProduct.base_unit && foundProduct.units_per_bulk;
      
      if (hasBulkUnit) {
        // Show options for bulk or unit
        const useBulk = window.confirm(
          `${foundProduct.name}\n\n` +
          `Bulk: ${formatCurrency(foundProduct.bulk_price || foundProduct.selling_price)} (${foundProduct.units_per_bulk} ${foundProduct.base_unit})\n` +
          `Per ${foundProduct.base_unit}: ${formatCurrency(foundProduct.unit_price || foundProduct.selling_price / foundProduct.units_per_bulk)}\n\n` +
          `Click OK for Bulk, Cancel for Per ${foundProduct.base_unit}`
        );
        addToCart(foundProduct, useBulk ? 'bulk' : 'unit');
        toast.success(`Added: ${foundProduct.name} (${useBulk ? 'Bulk' : `Per ${foundProduct.base_unit}`})`, { duration: 1000 });
      } else {
        addToCart(foundProduct, 'piece');
        toast.success(`Added: ${foundProduct.name}`, { duration: 1000 });
      }
      setSearchQuery('');
      
      // Auto-focus for next scan
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      toast.error(`Product not found: ${trimmedQuery}`);
      setSearchQuery('');
      searchInputRef.current?.focus();
    }
  };

  const updateQuantity = (id, change, saleUnit = 'piece') => {
    setCart(
      cart
        .map((item) => {
          if (item.id === id && (item.saleUnit || 'piece') === saleUnit) {
            const newQuantity = item.quantity + change;
            if (newQuantity <= 0) return null;
            
            // Check stock based on unit type
            const hasBulkUnit = item.base_unit && item.units_per_bulk;
            let maxQty = item.stock_quantity;
            if (hasBulkUnit && saleUnit === 'unit') {
              maxQty = item.stock_quantity * item.units_per_bulk;
            }
            
            if (newQuantity > maxQty) {
              toast.error('Insufficient stock');
              return item;
            }
            return { ...item, quantity: newQuantity };
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  const removeFromCart = (id, saleUnit = 'piece') => {
    setCart(cart.filter((item) => !(item.id === id && (item.saleUnit || 'piece') === saleUnit)));
  };

  // Safely calculate totals with null checks - use price from cart item (already set based on sale type)
  const subtotal = (cart || []).reduce((sum, item) => {
    const price = parseFloat(item?.price || item?.selling_price || 0);
    const qty = parseInt(item?.quantity || 0);
    return sum + (price * qty);
  }, 0);
  const taxAmount = (subtotal * (parseFloat(tax) || 0)) / 100;
  const discountAmount = (subtotal * (parseFloat(discount) || 0)) / 100;
  const total = subtotal + taxAmount - discountAmount;

  const handleHoldTransaction = async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    try {
      await api.post('/held-transactions', {
        items: cart.map((item) => ({
          product_id: item.id,
          name: item.name,
          quantity: item.quantity,
          price: item.selling_price,
        })),
        subtotal,
        tax: taxAmount,
        discount: discountAmount,
        total_amount: total,
        notes: `Customer: ${selectedCustomer?.name || 'Walk-in'}`,
      });

      toast.success('Transaction held successfully');
      setCart([]);
      setDiscount(0);
      setTax(0);
      setSelectedCustomer(null);
      fetchHeldTransactions();
    } catch (error) {
      toast.error('Failed to hold transaction');
    }
  };

  const handleResumeTransaction = async (held) => {
    try {
      const items = typeof held.items === 'string' ? JSON.parse(held.items) : held.items;
      const resumedItems = items.map(item => {
        const product = products.find(p => p.id === item.product_id);
        return product ? { ...product, quantity: item.quantity } : null;
      }).filter(Boolean);
      
      setCart(resumedItems);
      setDiscount(parseFloat(held.discount) || 0);
      setTax(parseFloat(held.subtotal) > 0 ? (parseFloat(held.tax) / parseFloat(held.subtotal)) * 100 : 0);
      await api.delete(`/held-transactions/${held.id}`);
      setShowHeldModal(false);
      fetchHeldTransactions();
      toast.success('Transaction resumed');
    } catch (error) {
      toast.error('Failed to resume transaction');
    }
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    // If credit sale, show customer selection modal
    if (isCreditSale && !selectedCustomer) {
      toast.error('Please select a customer for credit sale');
      setShowCreditModal(true);
      return;
    }

    // No payment validation needed

    try {
      const items = cart.map((item) => ({
        product_id: item.id,
        name: item.displayName || item.name,
        quantity: item.quantity,
        price: item.price || item.selling_price,
        sale_unit: item.saleUnit || 'piece',
        base_unit: item.base_unit || null,
        units_per_bulk: item.units_per_bulk || null,
      }));

      const saleData = {
        items,
        subtotal,
        tax: taxAmount,
        discount: discountAmount,
        total_amount: total,
        payment_method: 'cash', // Default to cash for now
        customer_id: selectedCustomer?.id || null,
        sale_type: saleType,
        sale_id: `SALE-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        date_time: new Date().toISOString(),
      };

      const response = await api.post('/sales', saleData);
      const saleResponse = response.data;

      // If credit sale, create credit sale record
      if (isCreditSale && selectedCustomer) {
        try {
          await api.post('/credit-sales', {
            sale_id: saleResponse.sale_id,
            customer_id: selectedCustomer.id,
            total_amount: total,
            due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
            notes: `Credit sale - ${saleType}`
          });
          toast.success('Credit sale recorded. Customer owes ' + formatCurrency(total));
        } catch (error) {
          console.error('Failed to create credit sale:', error);
          toast.error('Sale completed but failed to record credit');
        }
      }

      // Save to offline DB if offline
      if (response.data.offline || !navigator.onLine) {
        const offlineDB = (await import('../utils/offlineDB.js')).default;
        await offlineDB.saveSale(saleResponse, false);
        toast.success('Sale saved offline. Will sync when connection is restored.');
      }

      setLastSale(saleResponse);
      setShowReceipt(true);
      setCart([]);
      setDiscount(0);
      setTax(0);
      setIsCreditSale(false);
      setSelectedCustomer(null);
      setSearchQuery('');
      toast.success('Sale completed successfully!');
      fetchProducts(); // Refresh stock
      fetchHeldTransactions();
      
      // Auto-focus search after closing receipt
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Checkout failed');
    }
  };


  const printReceipt = () => {
    window.print();
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-6">Checkout</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Product Search & Cart */}
        <div className="lg:col-span-2 space-y-6">
          {/* Sale Type, Customer Selection & Held Transactions */}
          <div className="bg-white p-4 rounded-lg shadow-md">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Sale Type</label>
                <select
                  value={saleType}
                  onChange={(e) => {
                    setSaleType(e.target.value);
                    // Recalculate cart prices when switching
                    setCart(cart.map(item => ({
                      ...item,
                      price: e.target.value === 'wholesale' && item.wholesale_price 
                        ? item.wholesale_price 
                        : item.selling_price
                    })));
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                >
                  <option value="retail">Retail</option>
                  <option value="wholesale">Wholesale</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Payment Type</label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={isCreditSale}
                      onChange={(e) => {
                        setIsCreditSale(e.target.checked);
                        if (e.target.checked && !selectedCustomer) {
                          setShowCreditModal(true);
                        }
                      }}
                      className="mr-2"
                    />
                    <span className="text-sm">Credit Sale</span>
                  </label>
                </div>
                {isCreditSale && selectedCustomer && (
                  <p className="text-xs text-gray-600 mt-1">
                    Customer: {selectedCustomer.name}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Customer (Optional)</label>
                <div className="flex gap-2">
                  <select
                    value={selectedCustomer?.id || ''}
                    onChange={(e) => {
                      const customer = customers.find(c => c.id === parseInt(e.target.value));
                      setSelectedCustomer(customer || null);
                    }}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded"
                  >
                    <option value="">Walk-in Customer</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name} {customer.phone ? `(${customer.phone})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Held Transactions</label>
                <button
                  onClick={() => setShowHeldModal(true)}
                  className="w-full px-4 py-2 bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Resume ({heldTransactions.length})
                </button>
              </div>
            </div>
          </div>

          {/* Quick Sale Buttons */}
          {quickProducts.length > 0 && (
            <div className="bg-white p-4 rounded-lg shadow-md">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Star className="w-4 h-4 text-yellow-500" />
                Quick Add
              </h3>
              <div className="grid grid-cols-4 gap-2">
                {quickProducts.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    disabled={product.stock_quantity <= 0}
                    className="p-3 bg-blue-50 hover:bg-blue-100 rounded-lg border-2 border-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <p className="font-semibold text-sm truncate">{product.name}</p>
                    <p className="text-xs text-gray-600">{formatCurrency(product.selling_price)}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
          {/* Search Bar - Barcode Scanner Ready */}
          <div className="bg-white p-6 rounded-lg shadow-md border-2 border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <ScanLine className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-semibold text-blue-600">Barcode Scanner Ready</span>
            </div>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSearch();
                    }
                  }}
                  placeholder="Scan barcode or type product name..."
                  autoFocus
                  className={`w-full pl-10 pr-4 py-4 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xl font-mono ${
                    isScanning ? 'border-green-500 bg-green-50' : 'border-blue-300'
                  }`}
                  style={{ fontSize: '18px' }}
                />
              </div>
              <button
                onClick={handleSearch}
                className="px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-lg"
              >
                Search
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              💡 Point your barcode scanner at the input field and scan. The product will be added automatically.
            </p>
          </div>

          {/* Cart */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold mb-4">Cart</h2>
            {cart.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Cart is empty</p>
            ) : (
              <div className="space-y-3">
                {cart.map((item, index) => (
                  <div
                    key={`${item.id}-${item.saleUnit}-${index}`}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="font-semibold text-lg">{item.displayName || item.name}</p>
                      <p className="text-gray-600">
                        {formatCurrency(item.price)} {item.saleUnit === 'unit' && item.base_unit ? `per ${item.base_unit}` : 'each'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => updateQuantity(item.id, -1, item.saleUnit)}
                        className="p-2 bg-red-100 text-red-600 rounded hover:bg-red-200"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="text-xl font-bold w-12 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, 1, item.saleUnit)}
                        className="p-2 bg-green-100 text-green-600 rounded hover:bg-green-200"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      <span className="text-xl font-bold w-24 text-right">
                        {formatCurrency(item.price * item.quantity)}
                      </span>
                      <button
                        onClick={() => removeFromCart(item.id, item.saleUnit)}
                        className="p-2 bg-red-100 text-red-600 rounded hover:bg-red-200 ml-2"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Order Summary */}
        <div className="bg-white p-6 rounded-lg shadow-md h-fit sticky top-4">
          <h2 className="text-2xl font-bold mb-4">Order Summary</h2>

          <div className="space-y-4 mb-6">
            <div className="flex justify-between text-lg">
              <span>Subtotal:</span>
              <span className="font-semibold">{formatCurrency(subtotal)}</span>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Tax (%)</label>
              <input
                type="number"
                value={tax}
                onChange={(e) => setTax(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded"
                min="0"
                step="0.1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Discount (%)</label>
              <input
                type="number"
                value={discount}
                onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded"
                min="0"
                step="0.1"
              />
            </div>

            {taxAmount > 0 && (
              <div className="flex justify-between text-sm text-gray-600">
                <span>Tax:</span>
                <span>{formatCurrency(taxAmount)}</span>
              </div>
            )}

            {discountAmount > 0 && (
              <div className="flex justify-between text-sm text-red-600">
                <span>Discount:</span>
                <span>-{formatCurrency(discountAmount)}</span>
              </div>
            )}

            <div className="border-t pt-4">
              <div className="flex justify-between text-2xl font-bold">
                <span>Total:</span>
                <span className="text-blue-600">{formatCurrency(total)}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleHoldTransaction}
              disabled={cart.length === 0}
              className="flex-1 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              Hold
            </button>
            <button
              onClick={handleCheckout}
              disabled={cart.length === 0 || (isCreditSale && !selectedCustomer)}
              className="flex-1 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreditSale ? 'Complete Credit Sale' : 'Complete Sale'}
            </button>
            {isCreditSale && !selectedCustomer && (
              <p className="text-xs text-red-600 mt-1 text-center">Please select a customer for credit sale</p>
            )}
          </div>
        </div>
      </div>

      {/* Receipt Modal */}
      {showReceipt && lastSale && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Receipt</h2>
              <button onClick={() => setShowReceipt(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-2 mb-4">
              <p className="text-sm text-gray-600">Sale ID: {lastSale.sale_id}</p>
              <p className="text-sm text-gray-600">Date: {new Date(lastSale.date_time).toLocaleString()}</p>
              <p className="text-sm text-gray-600">Cashier: {user?.full_name || user?.username}</p>
            </div>
            <div className="border-t border-b py-4 mb-4">
              {JSON.parse(lastSale.items).map((item, index) => (
                <div key={index} className="flex justify-between mb-2">
                  <span>{item.name} x{item.quantity}</span>
                  <span>{formatCurrency(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatCurrency(lastSale.subtotal)}</span>
              </div>
              {lastSale.tax > 0 && (
                <div className="flex justify-between">
                  <span>Tax:</span>
                  <span>{formatCurrency(lastSale.tax)}</span>
                </div>
              )}
              {lastSale.discount > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Discount:</span>
                  <span>-{formatCurrency(lastSale.discount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg">
                <span>Total:</span>
                <span>{formatCurrency(lastSale.total_amount)}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={printReceipt}
                className="flex-1 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Print
              </button>
              <button
                onClick={() => {
                  setShowReceipt(false);
                  setTimeout(() => {
                    searchInputRef.current?.focus();
                  }, 100);
                }}
                className="flex-1 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Held Transactions Modal */}
      {showHeldModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Held Transactions</h2>
              <button onClick={() => setShowHeldModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-3">
              {heldTransactions.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No held transactions</p>
              ) : (
                heldTransactions.map((held) => {
                  const items = typeof held.items === 'string' ? JSON.parse(held.items) : held.items;
                  return (
                    <div key={held.id} className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-semibold">{held.transaction_id}</p>
                          <p className="text-sm text-gray-600">
                            {format(new Date(held.created_at), 'MMM dd, yyyy HH:mm')}
                          </p>
                        </div>
                        <p className="font-bold text-lg">{formatCurrency(held.total_amount)}</p>
                      </div>
                      <div className="text-sm text-gray-600 mb-3">
                        {items.length} items
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleResumeTransaction(held)}
                          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          Resume
                        </button>
                        <button
                          onClick={async () => {
                            await api.delete(`/held-transactions/${held.id}`);
                            fetchHeldTransactions();
                            toast.success('Transaction deleted');
                          }}
                          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Credit Sale Customer Modal */}
      {showCreditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold mb-4">Select Customer for Credit Sale</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Customer *</label>
                <select
                  value={selectedCustomer?.id || ''}
                  onChange={(e) => {
                    const customer = customers.find(c => c.id === parseInt(e.target.value));
                    setSelectedCustomer(customer || null);
                    if (customer) {
                      setShowCreditModal(false);
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                >
                  <option value="">Select customer...</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} {customer.phone ? `(${customer.phone})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setIsCreditSale(false);
                    setShowCreditModal(false);
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                >
                  Cancel Credit Sale
                </button>
                <button
                  onClick={() => setShowCreditModal(false)}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

