import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../models/product_model.dart';
import '../../providers/product_provider.dart';
import '../../providers/auth_provider.dart';
import 'add_product_screen.dart';

class ProductsScreen extends StatefulWidget {
  const ProductsScreen({super.key});

  @override
  State<ProductsScreen> createState() => _ProductsScreenState();
}

class _ProductsScreenState extends State<ProductsScreen> {
  final _searchController = TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final productProvider = Provider.of<ProductProvider>(context);
    final authProvider = Provider.of<AuthProvider>(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Products'),
        actions: [
          if (authProvider.isAdmin)
            IconButton(
              icon: const Icon(Icons.add),
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => const AddProductScreen(),
                  ),
                );
              },
            ),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16.0),
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
          Expanded(
            child: productProvider.isLoading
                ? const Center(child: CircularProgressIndicator())
                : _buildProductsList(productProvider),
          ),
        ],
      ),
    );
  }

  Widget _buildProductsList(ProductProvider provider) {
    final query = _searchController.text;
    final products = query.isEmpty
        ? provider.products
        : provider.searchProducts(query);

    if (products.isEmpty) {
      return Center(
        child: Text(
          query.isEmpty ? 'No products found' : 'No products match your search',
          style: TextStyle(color: Colors.grey[600]),
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      itemCount: products.length,
      itemBuilder: (context, index) {
        final product = products[index];
        return _ProductCard(product: product);
      },
    );
  }
}

class _ProductCard extends StatelessWidget {
  final ProductModel product;

  const _ProductCard({required this.product});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        leading: product.imageUrl != null
            ? ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: CachedNetworkImage(
                  imageUrl: product.imageUrl!,
                  width: 60,
                  height: 60,
                  fit: BoxFit.cover,
                  placeholder: (context, url) => const SizedBox(
                    width: 60,
                    height: 60,
                    child: Center(child: CircularProgressIndicator()),
                  ),
                  errorWidget: (context, url, error) => const Icon(Icons.image),
                ),
              )
            : const Icon(Icons.inventory_2, size: 40),
        title: Text(
          product.name,
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Stock: ${product.stockQuantity}'),
            Text('Price: \$${product.sellingPrice.toStringAsFixed(2)}'),
            if (product.isLowStock)
              Text(
                'Low Stock!',
                style: TextStyle(color: Colors.orange[700], fontWeight: FontWeight.bold),
              ),
          ],
        ),
        trailing: Text(
          '\$${product.sellingPrice.toStringAsFixed(2)}',
          style: const TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: Colors.green,
          ),
        ),
        isThreeLine: true,
      ),
    );
  }
}

