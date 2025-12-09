import { useState, useEffect } from 'react';
import api from '../services/api';
import { Search, Download, Printer, Barcode } from 'lucide-react';
import toast from 'react-hot-toast';

export default function BarcodeGenerator() {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [barcodeImages, setBarcodeImages] = useState({});

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [products, searchQuery]);

  const fetchProducts = async () => {
    try {
      const response = await api.get('/products');
      setProducts(response.data);
    } catch (error) {
      toast.error('Failed to load products');
    }
  };

  const filterProducts = () => {
    let filtered = products;

    if (searchQuery.trim()) {
      filtered = filtered.filter(
        (product) =>
          product.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.barcode?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredProducts(filtered);
  };

  const generateBarcode = async (productId) => {
    try {
      const response = await api.post(`/barcode/product/${productId}`);
      const barcodeUrl = `https://barcode.tec-it.com/barcode.ashx?data=${response.data.barcode}&code=Code128&translate-esc=on&dpi=96`;
      setBarcodeImages(prev => ({ ...prev, [productId]: barcodeUrl }));
      toast.success('Barcode generated');
    } catch (error) {
      toast.error('Failed to generate barcode');
    }
  };

  const toggleProductSelection = (product) => {
    setSelectedProducts(prev => {
      if (prev.find(p => p.id === product.id)) {
        return prev.filter(p => p.id !== product.id);
      } else {
        return [...prev, product];
      }
    });
  };

  const printSelectedLabels = () => {
    if (selectedProducts.length === 0) {
      toast.error('Please select products to print');
      return;
    }

    // Generate barcodes for selected products
    selectedProducts.forEach(product => {
      if (!product.barcode) {
        generateBarcode(product.id);
      }
    });

    // Open print window with labels
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Barcode Labels</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .label { 
              display: inline-block; 
              width: 200px; 
              margin: 10px; 
              padding: 10px; 
              border: 1px solid #ccc; 
              text-align: center;
              page-break-inside: avoid;
            }
            .label img { max-width: 100%; height: auto; }
            .label-name { font-size: 12px; margin: 5px 0; font-weight: bold; }
            .label-price { font-size: 14px; color: #2563eb; font-weight: bold; }
            @media print {
              .label { margin: 5px; }
            }
          </style>
        </head>
        <body>
          ${selectedProducts.map(product => {
            const barcode = product.barcode || `PRD${product.id}`;
            const barcodeUrl = `https://barcode.tec-it.com/barcode.ashx?data=${barcode}&code=Code128&translate-esc=on&dpi=96`;
            return `
              <div class="label">
                <div class="label-name">${product.name}</div>
                <img src="${barcodeUrl}" alt="${barcode}" />
                <div style="font-size: 10px; margin-top: 5px;">${barcode}</div>
                <div class="label-price">${product.selling_price ? `Ksh ${parseFloat(product.selling_price).toFixed(2)}` : ''}</div>
              </div>
            `;
          }).join('')}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Barcode Generator</h1>
        <p className="text-gray-600">Generate and print barcode labels for products</p>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-lg shadow-md mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search products..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
          />
        </div>
      </div>

      {/* Actions */}
      {selectedProducts.length > 0 && (
        <div className="bg-blue-50 p-4 rounded-lg mb-6 flex items-center justify-between">
          <p className="font-semibold">{selectedProducts.length} product(s) selected</p>
          <button
            onClick={printSelectedLabels}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            Print Selected Labels
          </button>
        </div>
      )}

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProducts.map((product) => {
          const isSelected = selectedProducts.find(p => p.id === product.id);
          const barcode = product.barcode || `PRD${product.id}`;
          const barcodeUrl = barcodeImages[product.id] || 
            (product.barcode ? `https://barcode.tec-it.com/barcode.ashx?data=${barcode}&code=Code128&translate-esc=on&dpi=96` : null);

          return (
            <div
              key={product.id}
              className={`bg-white p-4 rounded-lg shadow-md border-2 ${
                isSelected ? 'border-blue-500' : 'border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{product.name}</h3>
                  <p className="text-sm text-gray-600">{product.barcode || 'No barcode'}</p>
                </div>
                <input
                  type="checkbox"
                  checked={!!isSelected}
                  onChange={() => toggleProductSelection(product)}
                  className="w-5 h-5"
                />
              </div>

              {barcodeUrl ? (
                <div className="text-center mb-3">
                  <img src={barcodeUrl} alt={barcode} className="mx-auto max-w-full h-20 object-contain" />
                  <p className="text-xs text-gray-600 mt-1 font-mono">{barcode}</p>
                </div>
              ) : (
                <div className="text-center mb-3 p-4 bg-gray-100 rounded">
                  <Barcode className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-xs text-gray-600">No barcode image</p>
                </div>
              )}

              <div className="flex gap-2">
                {!product.barcode ? (
                  <button
                    onClick={() => generateBarcode(product.id)}
                    className="flex-1 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                  >
                    Generate Barcode
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      const url = `https://barcode.tec-it.com/barcode.ashx?data=${barcode}&code=Code128&translate-esc=on&dpi=96`;
                      setBarcodeImages(prev => ({ ...prev, [product.id]: url }));
                    }}
                    className="flex-1 px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
                  >
                    Show Barcode
                  </button>
                )}
                <button
                  onClick={() => {
                    if (barcodeUrl) {
                      const printWindow = window.open('', '_blank');
                      printWindow.document.write(`
                        <html>
                          <head><title>Barcode - ${product.name}</title></head>
                          <body style="text-align: center; padding: 20px;">
                            <h3>${product.name}</h3>
                            <img src="${barcodeUrl}" alt="${barcode}" style="max-width: 100%;" />
                            <p style="font-family: monospace; margin-top: 10px;">${barcode}</p>
                            ${product.selling_price ? `<p style="font-size: 18px; font-weight: bold; color: #2563eb; margin-top: 10px;">Ksh ${parseFloat(product.selling_price).toFixed(2)}</p>` : ''}
                          </body>
                        </html>
                      `);
                      printWindow.document.close();
                      printWindow.print();
                    }
                  }}
                  className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                  disabled={!barcodeUrl}
                >
                  <Printer className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredProducts.length === 0 && (
        <div className="bg-white p-12 rounded-lg shadow-md text-center">
          <p className="text-gray-600">No products found</p>
        </div>
      )}
    </div>
  );
}

