import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Search, Plus, Minus, Trash2, Receipt, X, ScanLine, Save, RotateCcw, User, Star } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function Checkout() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [discount, setDiscount] = useState(0);
  const [tax, setTax] = useState(0);
  const [cashGiven, setCashGiven] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastSale, setLastSale] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [heldTransactions, setHeldTransactions] = useState([]);
  const [showHeldModal, setShowHeldModal] = useState(false);
  const [quickProducts, setQuickProducts] = useState([]);
  const searchInputRef = useRef(null);
  const barcodeTimeoutRef = useRef(null);

  useEffect(() => {
    fetchProducts();
    fetchCustomers();
    fetchHeldTransactions();
    // Auto-focus search input on mount
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);
  }, []);

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
      
      addToCart(foundProduct);
      toast.success(`Added: ${foundProduct.name}`, { duration: 1000 });
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

  const addToCart = (product) => {
    const existingItem = cart.find((item) => item.id === product.id);

    if (existingItem) {
      if (existingItem.quantity >= product.stock_quantity) {
        toast.error('Insufficient stock');
        return;
      }
      setCart(
        cart.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      if (product.stock_quantity <= 0) {
        toast.error('Product out of stock');
        return;
      }
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  const updateQuantity = (id, change) => {
    setCart(
      cart
        .map((item) => {
          if (item.id === id) {
            const newQuantity = item.quantity + change;
            if (newQuantity <= 0) return null;
            if (newQuantity > item.stock_quantity) {
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

  const removeFromCart = (id) => {
    setCart(cart.filter((item) => item.id !== id));
  };

  const subtotal = cart.reduce((sum, item) => sum + item.selling_price * item.quantity, 0);
  const taxAmount = (subtotal * tax) / 100;
  const discountAmount = (subtotal * discount) / 100;
  const total = subtotal + taxAmount - discountAmount;
  
  // Calculate payment totals
  const paymentTotal = paymentMethods.reduce((sum, pm) => sum + parseFloat(pm.amount || 0), 0);
  const remaining = total - paymentTotal;
  const change = paymentMethod === 'cash' && cashGiven ? parseFloat(cashGiven) - remaining : 0;

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
      setPaymentMethods([]);
      setCashGiven('');
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

    // Check payment methods
    if (paymentMethods.length > 0) {
      if (paymentTotal < total) {
        toast.error('Payment amount is less than total');
        return;
      }
    } else if (paymentMethod === 'cash' && (!cashGiven || parseFloat(cashGiven) < total)) {
      toast.error('Insufficient cash');
      return;
    }

    try {
      const items = cart.map((item) => ({
        product_id: item.id,
        name: item.name,
        quantity: item.quantity,
        price: item.selling_price,
      }));

      // Prepare payment methods array
      const finalPaymentMethods = paymentMethods.length > 0 
        ? paymentMethods 
        : [{ method: paymentMethod, amount: total }];

      const saleData = {
        items,
        subtotal,
        tax: taxAmount,
        discount: discountAmount,
        total_amount: total,
        payment_method: paymentMethod,
        payment_methods: finalPaymentMethods,
        customer_id: selectedCustomer?.id || null,
        cash_given: paymentMethod === 'cash' ? parseFloat(cashGiven) : null,
        change_returned: change > 0 ? change : null,
        sale_id: `SALE-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        date_time: new Date().toISOString(),
      };

      const response = await api.post('/sales', saleData);
      const saleResponse = response.data;

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
      setPaymentMethods([]);
      setCashGiven('');
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

  const addPaymentMethod = () => {
    if (paymentTotal >= total) {
      toast.error('Payment already covers total');
      return;
    }
    setPaymentMethods([...paymentMethods, { method: 'cash', amount: remaining > 0 ? remaining : 0 }]);
  };

  const removePaymentMethod = (index) => {
    setPaymentMethods(paymentMethods.filter((_, i) => i !== index));
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
          {/* Customer Selection & Held Transactions */}
          <div className="bg-white p-4 rounded-lg shadow-md">
            <div className="grid grid-cols-2 gap-4">
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
                    <p className="text-xs text-gray-600">${product.selling_price.toFixed(2)}</p>
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
                {cart.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="font-semibold text-lg">{item.name}</p>
                      <p className="text-gray-600">${item.selling_price.toFixed(2)} each</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => updateQuantity(item.id, -1)}
                        className="p-2 bg-red-100 text-red-600 rounded hover:bg-red-200"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="text-xl font-bold w-12 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, 1)}
                        className="p-2 bg-green-100 text-green-600 rounded hover:bg-green-200"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      <span className="text-xl font-bold w-24 text-right">
                        ${(item.selling_price * item.quantity).toFixed(2)}
                      </span>
                      <button
                        onClick={() => removeFromCart(item.id)}
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

        {/* Right: Payment Summary */}
        <div className="bg-white p-6 rounded-lg shadow-md h-fit sticky top-4">
          <h2 className="text-2xl font-bold mb-4">Payment</h2>

          <div className="space-y-4 mb-6">
            <div className="flex justify-between text-lg">
              <span>Subtotal:</span>
              <span className="font-semibold">${subtotal.toFixed(2)}</span>
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
                <span>${taxAmount.toFixed(2)}</span>
              </div>
            )}

            {discountAmount > 0 && (
              <div className="flex justify-between text-sm text-red-600">
                <span>Discount:</span>
                <span>-${discountAmount.toFixed(2)}</span>
              </div>
            )}

            <div className="border-t pt-4">
              <div className="flex justify-between text-2xl font-bold">
                <span>Total:</span>
                <span className="text-blue-600">${total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Multiple Payment Methods */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium">Payment Methods</label>
              <button
                type="button"
                onClick={addPaymentMethod}
                className="text-xs text-blue-600 hover:text-blue-700"
              >
                + Add Payment
              </button>
            </div>
            
            {paymentMethods.length === 0 ? (
              <div>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded mb-2"
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="mobile">Mobile Payment</option>
                </select>
                {paymentMethod === 'cash' && (
                  <div>
                    <input
                      type="number"
                      value={cashGiven}
                      onChange={(e) => setCashGiven(e.target.value)}
                      placeholder="Cash given"
                      className="w-full px-3 py-2 border border-gray-300 rounded text-lg"
                      step="0.01"
                      min="0"
                    />
                    {change > 0 && (
                      <p className="mt-2 text-green-600 font-semibold">Change: ${change.toFixed(2)}</p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {paymentMethods.map((pm, index) => (
                  <div key={index} className="flex gap-2">
                    <select
                      value={pm.method}
                      onChange={(e) => {
                        const newMethods = [...paymentMethods];
                        newMethods[index].method = e.target.value;
                        setPaymentMethods(newMethods);
                      }}
                      className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                    >
                      <option value="cash">Cash</option>
                      <option value="card">Card</option>
                      <option value="mobile">Mobile</option>
                    </select>
                    <input
                      type="number"
                      value={pm.amount}
                      onChange={(e) => {
                        const newMethods = [...paymentMethods];
                        newMethods[index].amount = parseFloat(e.target.value) || 0;
                        setPaymentMethods(newMethods);
                      }}
                      placeholder="Amount"
                      className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                      step="0.01"
                      min="0"
                    />
                    <button
                      type="button"
                      onClick={() => removePaymentMethod(index)}
                      className="p-1 text-red-600 hover:bg-red-50 rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {paymentTotal < total && (
                  <p className="text-sm text-red-600">Remaining: ${remaining.toFixed(2)}</p>
                )}
                {paymentTotal > total && (
                  <p className="text-sm text-green-600">Change: ${(paymentTotal - total).toFixed(2)}</p>
                )}
              </div>
            )}
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
              disabled={cart.length === 0}
              className="flex-1 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Complete Sale
            </button>
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
                  <span>${(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>${parseFloat(lastSale.subtotal).toFixed(2)}</span>
              </div>
              {lastSale.tax > 0 && (
                <div className="flex justify-between">
                  <span>Tax:</span>
                  <span>${parseFloat(lastSale.tax).toFixed(2)}</span>
                </div>
              )}
              {lastSale.discount > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Discount:</span>
                  <span>-${parseFloat(lastSale.discount).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg">
                <span>Total:</span>
                <span>${parseFloat(lastSale.total_amount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Payment:</span>
                <span className="capitalize">{lastSale.payment_method}</span>
              </div>
              {lastSale.change_returned > 0 && (
                <div className="flex justify-between">
                  <span>Change:</span>
                  <span>${parseFloat(lastSale.change_returned).toFixed(2)}</span>
                </div>
              )}
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
                        <p className="font-bold text-lg">${parseFloat(held.total_amount).toFixed(2)}</p>
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
    </div>
  );
}

