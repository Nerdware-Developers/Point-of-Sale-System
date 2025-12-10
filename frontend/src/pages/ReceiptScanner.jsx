import { useState, useRef, useEffect } from 'react';
import api from '../services/api';
import { Camera, Upload, X, CheckCircle, AlertCircle, Loader2, Receipt } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ReceiptScanner() {
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [extractedItems, setExtractedItems] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [formData, setFormData] = useState({
    supplier_id: '',
    order_date: new Date().toISOString().split('T')[0],
  });
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  // Load products and suppliers on mount
  useEffect(() => {
    fetchProducts();
    fetchSuppliers();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await api.get('/products');
      setProducts(response.data || []);
    } catch (error) {
      console.error('Failed to load products:', error);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const response = await api.get('/suppliers');
      setSuppliers(response.data || []);
    } catch (error) {
      console.error('Failed to load suppliers:', error);
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Image size must be less than 10MB');
        return;
      }
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const processReceipt = async () => {
    if (!image) {
      toast.error('Please select an image first');
      return;
    }

    setIsProcessing(true);
    try {
      // Upload image to backend for OCR processing
      const formData = new FormData();
      formData.append('receipt', image);

      const response = await api.post('/receipt/scan', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 60000, // 60 second timeout for OCR processing
      });

      if (response.data && response.data.success) {
        if (response.data.items && response.data.items.length > 0) {
          setExtractedItems(response.data.items);
          toast.success(`Found ${response.data.items.length} items on receipt`);
        } else {
          const message = response.data.message || 'No items found on receipt. Please try a clearer image.';
          toast.error(message);
          if (response.data.rawText) {
            console.log('Extracted text:', response.data.rawText);
          }
        }
      } else {
        toast.error('Unexpected response from server');
      }
    } catch (error) {
      console.error('Receipt processing error:', error);
      console.error('Error response:', error.response?.data);
      
      // Provide detailed error message
      let errorMessage = 'Failed to process receipt. Please try again.';
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
        if (error.response.data.details) {
          errorMessage += `: ${error.response.data.details}`;
        }
      } else if (error.message) {
        errorMessage = error.message;
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = 'Processing timeout. The receipt may be too complex. Please try a simpler image.';
      } else if (error.code === 'ERR_NETWORK') {
        errorMessage = 'Network error. Please check your connection and try again.';
      }
      
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const matchProduct = (itemName, itemPrice) => {
    // Try to find exact match first
    let matched = products.find(
      (p) => p.name.toLowerCase() === itemName.toLowerCase()
    );

    // Try partial match
    if (!matched) {
      matched = products.find((p) =>
        p.name.toLowerCase().includes(itemName.toLowerCase()) ||
        itemName.toLowerCase().includes(p.name.toLowerCase())
      );
    }

    return matched;
  };

  const updateMatchedProduct = (index, productId) => {
    const product = products.find((p) => p.id === parseInt(productId));
    const newItems = [...extractedItems];
    if (product) {
      newItems[index] = {
        ...newItems[index],
        product_id: product.id,
        product_name: product.name,
        price: product.buying_price || newItems[index].price,
        matched: true,
      };
    } else {
      newItems[index] = {
        ...newItems[index],
        product_id: null,
        matched: false,
      };
    }
    setExtractedItems(newItems);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (extractedItems.length === 0) {
      toast.error('No items to add');
      return;
    }

    // Filter out items without matched products
    const validItems = extractedItems.filter((item) => item.product_id);
    
    if (validItems.length === 0) {
      toast.error('Please match at least one product');
      return;
    }

    if (!formData.supplier_id) {
      toast.error('Please select a supplier');
      return;
    }

    try {
      const items = validItems.map((item) => ({
        product_id: item.product_id,
        quantity: item.quantity || 1,
        price: item.price,
      }));

      const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

      await api.post('/purchase-orders', {
        supplier_id: formData.supplier_id,
        items,
        total_amount: totalAmount,
        order_date: formData.order_date,
      });

      toast.success('Purchase order created successfully!');
      
      // Reset form
      setImage(null);
      setImagePreview(null);
      setExtractedItems([]);
      setFormData({
        supplier_id: '',
        order_date: new Date().toISOString().split('T')[0],
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to create purchase order');
    }
  };

  const resetForm = () => {
    setImage(null);
    setImagePreview(null);
    setExtractedItems([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Receipt Scanner</h1>
        <p className="text-gray-600 text-sm sm:text-base">
          Take a photo of your receipt and automatically add items to inventory
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Image Upload Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
          <h2 className="text-lg font-semibold mb-4">Upload Receipt</h2>
          
          {!imagePreview ? (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors">
                <Receipt className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">Take a photo or upload receipt image</p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <label className="cursor-pointer">
                    <input
                      ref={cameraInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                    <span className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                      <Camera className="w-5 h-5" />
                      Take Photo
                    </span>
                  </label>
                  <label className="cursor-pointer">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                    <span className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
                      <Upload className="w-5 h-5" />
                      Choose File
                    </span>
                  </label>
                </div>
                <p className="text-xs text-gray-500 mt-4">
                  Supported formats: JPG, PNG, WebP (Max 10MB)
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative rounded-lg overflow-hidden border border-gray-200">
                <img
                  src={imagePreview}
                  alt="Receipt preview"
                  className="w-full h-auto max-h-96 object-contain bg-gray-50"
                />
                <button
                  onClick={resetForm}
                  className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                  aria-label="Remove image"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={processReceipt}
                disabled={isProcessing}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing Receipt...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Extract Items from Receipt
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Extracted Items Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
          <h2 className="text-lg font-semibold mb-4">Extracted Items</h2>
          
          {extractedItems.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-sm">No items extracted yet</p>
              <p className="text-xs mt-1">Upload a receipt and click "Extract Items"</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Supplier Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Supplier *
                </label>
                <select
                  value={formData.supplier_id}
                  onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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

              {/* Order Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Order Date *
                </label>
                <input
                  type="date"
                  value={formData.order_date}
                  onChange={(e) => setFormData({ ...formData, order_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Extracted Items List */}
              <div className="border-t pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Match Products ({extractedItems.filter((i) => i.product_id).length} of {extractedItems.length} matched)
                </label>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {extractedItems.map((item, index) => {
                    const matched = item.product_id !== null;
                    return (
                      <div
                        key={index}
                        className={`p-3 rounded-lg border-2 ${
                          matched
                            ? 'border-green-200 bg-green-50'
                            : 'border-gray-200 bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-gray-900 truncate">
                              {item.name || 'Unknown Item'}
                            </p>
                            <p className="text-xs text-gray-500">
                              Qty: {item.quantity || 1} × {item.price ? `$${item.price.toFixed(2)}` : 'N/A'}
                            </p>
                          </div>
                          {matched && (
                            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                          )}
                        </div>
                        <select
                          value={item.product_id || ''}
                          onChange={(e) => updateMatchedProduct(index, e.target.value)}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select product to match...</option>
                          {products.map((product) => (
                            <option key={product.id} value={product.id}>
                              {product.name} (Stock: {product.stock_quantity})
                            </option>
                          ))}
                        </select>
                        {!matched && (
                          <p className="text-xs text-amber-600 mt-1">
                            ⚠️ Please match this item to a product
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex gap-3 pt-4 border-t">
                <button
                  type="submit"
                  disabled={extractedItems.filter((i) => i.product_id).length === 0}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  Create Purchase Order
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Reset
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

