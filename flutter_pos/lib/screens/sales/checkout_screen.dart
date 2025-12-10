import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/sale_provider.dart';
import '../../providers/product_provider.dart';
import '../../models/product_model.dart';
import 'package:flutter_barcode_scanner/flutter_barcode_scanner.dart';

class CheckoutScreen extends StatefulWidget {
  const CheckoutScreen({super.key});

  @override
  State<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends State<CheckoutScreen> {
  final _searchController = TextEditingController();
  String _saleType = 'retail';

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _scanBarcode() async {
    try {
      final barcode = await FlutterBarcodeScanner.scanBarcode(
        '#ff6666',
        'Cancel',
        true,
        ScanMode.BARCODE,
      );

      if (barcode != '-1') {
        final productProvider = Provider.of<ProductProvider>(context, listen: false);
        final product = productProvider.getProductByBarcode(barcode);
        
        if (product != null) {
          final saleProvider = Provider.of<SaleProvider>(context, listen: false);
          saleProvider.addToCart(product);
        } else {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Product not found')),
            );
          }
        }
      }
    } catch (e) {
      debugPrint('Barcode scan error: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    final saleProvider = Provider.of<SaleProvider>(context);
    final productProvider = Provider.of<ProductProvider>(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Checkout'),
        actions: [
          IconButton(
            icon: const Icon(Icons.qr_code_scanner),
            onPressed: _scanBarcode,
            tooltip: 'Scan Barcode',
          ),
        ],
      ),
      body: Column(
        children: [
          // Sale Type Selector
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: SegmentedButton<String>(
              segments: const [
                ButtonSegment(value: 'retail', label: Text('Retail')),
                ButtonSegment(value: 'wholesale', label: Text('Wholesale')),
              ],
              selected: {_saleType},
              onSelectionChanged: (Set<String> newSelection) {
                setState(() {
                  _saleType = newSelection.first;
                  saleProvider.setSaleType(_saleType);
                });
              },
            ),
          ),

          // Product Search
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16.0),
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'Search products...',
                prefixIcon: const Icon(Icons.search),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              onChanged: (_) => setState(() {}),
            ),
          ),

          // Product List
          Expanded(
            child: _buildProductList(productProvider),
          ),

          // Cart Summary
          _buildCartSummary(saleProvider),
        ],
      ),
    );
  }

  Widget _buildProductList(ProductProvider provider) {
    final query = _searchController.text;
    final products = query.isEmpty
        ? provider.products.where((p) => p.stockQuantity > 0).toList()
        : provider.searchProducts(query).where((p) => p.stockQuantity > 0).toList();

    if (products.isEmpty) {
      return const Center(child: Text('No products found'));
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: products.length,
      itemBuilder: (context, index) {
        final product = products[index];
        return _ProductTile(product: product);
      },
    );
  }

  Widget _buildCartSummary(SaleProvider provider) {
    if (provider.cart.isEmpty) {
      return Container(
        padding: const EdgeInsets.all(16),
        child: const Text('Cart is empty'),
      );
    }

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.grey[100],
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.1),
            blurRadius: 4,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          ListView.builder(
            shrinkWrap: true,
            itemCount: provider.cart.length,
            itemBuilder: (context, index) {
              final item = provider.cart[index];
              return ListTile(
                title: Text(item.productName),
                subtitle: Text('Qty: ${item.quantity} × \$${item.price.toStringAsFixed(2)}'),
                trailing: Text(
                  '\$${item.total.toStringAsFixed(2)}',
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
              );
            },
          ),
          const Divider(),
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 8.0),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Total:', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                Text(
                  '\$${provider.total.toStringAsFixed(2)}',
                  style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: Colors.green,
                  ),
                ),
              ],
            ),
          ),
          ElevatedButton(
            onPressed: () async {
              final success = await provider.processSale(null);
              if (success && mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Sale completed successfully!'),
                    backgroundColor: Colors.green,
                  ),
                );
              }
            },
            style: ElevatedButton.styleFrom(
              minimumSize: const Size(double.infinity, 50),
            ),
            child: const Text('Complete Sale'),
          ),
        ],
      ),
    );
  }
}

class _ProductTile extends StatelessWidget {
  final ProductModel product;

  const _ProductTile({required this.product});

  @override
  Widget build(BuildContext context) {
    final saleProvider = Provider.of<SaleProvider>(context, listen: false);
    final cartItem = saleProvider.cart.firstWhere(
      (item) => item.productId == product.id,
      orElse: () => SaleItem(
        productId: product.id,
        productName: product.name,
        quantity: 0,
        price: product.sellingPrice,
      ),
    );

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        title: Text(product.name),
        subtitle: Text('Stock: ${product.stockQuantity} | \$${product.sellingPrice.toStringAsFixed(2)}'),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (cartItem.quantity > 0) ...[
              IconButton(
                icon: const Icon(Icons.remove),
                onPressed: () => saleProvider.updateQuantity(product.id, cartItem.quantity - 1),
              ),
              Text('${cartItem.quantity}'),
              IconButton(
                icon: const Icon(Icons.add),
                onPressed: () => saleProvider.updateQuantity(product.id, cartItem.quantity + 1),
              ),
            ] else
              IconButton(
                icon: const Icon(Icons.add_shopping_cart),
                onPressed: () => saleProvider.addToCart(product),
              ),
          ],
        ),
      ),
    );
  }
}

