import 'package:flutter/foundation.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/sale_model.dart';
import '../models/product_model.dart';
import '../services/firebase_service.dart';
import 'package:uuid/uuid.dart';
import 'product_provider.dart';

class SaleProvider with ChangeNotifier {
  List<SaleItem> _cart = [];
  String _saleType = 'retail'; // 'retail' or 'wholesale'
  double _tax = 0.0;
  double _discount = 0.0;
  bool _isLoading = false;

  List<SaleItem> get cart => _cart;
  String get saleType => _saleType;
  double get tax => _tax;
  double get discount => _discount;
  bool get isLoading => _isLoading;

  double get subtotal {
    return _cart.fold(0.0, (sum, item) => sum + item.total);
  }

  double get taxAmount {
    return subtotal * (_tax / 100);
  }

  double get discountAmount {
    return subtotal * (_discount / 100);
  }

  double get total {
    return subtotal + taxAmount - discountAmount;
  }

  void setSaleType(String type) {
    _saleType = type;
    notifyListeners();
  }

  void setTax(double tax) {
    _tax = tax;
    notifyListeners();
  }

  void setDiscount(double discount) {
    _discount = discount;
    notifyListeners();
  }

  void addToCart(ProductModel product, {int quantity = 1}) {
    final existingIndex = _cart.indexWhere((item) => item.productId == product.id);
    
    if (existingIndex >= 0) {
      final existingItem = _cart[existingIndex];
      if (existingItem.quantity + quantity > product.stockQuantity) {
        return; // Insufficient stock
      }
      _cart[existingIndex] = SaleItem(
        productId: product.id,
        productName: product.name,
        quantity: existingItem.quantity + quantity,
        price: _saleType == 'wholesale' && product.wholesalePrice != null
            ? product.wholesalePrice!
            : product.sellingPrice,
      );
    } else {
      if (quantity > product.stockQuantity) {
        return; // Insufficient stock
      }
      _cart.add(SaleItem(
        productId: product.id,
        productName: product.name,
        quantity: quantity,
        price: _saleType == 'wholesale' && product.wholesalePrice != null
            ? product.wholesalePrice!
            : product.sellingPrice,
      ));
    }
    notifyListeners();
  }

  void removeFromCart(String productId) {
    _cart.removeWhere((item) => item.productId == productId);
    notifyListeners();
  }

  void updateQuantity(String productId, int quantity, ProductProvider? productProvider) {
    final index = _cart.indexWhere((item) => item.productId == productId);
    if (index >= 0) {
      if (quantity <= 0) {
        _cart.removeAt(index);
      } else {
        final item = _cart[index];
        // Check stock if product provider is available
        if (productProvider != null) {
          final product = productProvider.getProductById(productId);
          if (product != null && quantity > product.stockQuantity) {
            return; // Insufficient stock
          }
        }
        _cart[index] = SaleItem(
          productId: item.productId,
          productName: item.productName,
          quantity: quantity,
          price: item.price,
        );
      }
      notifyListeners();
    }
  }

  void clearCart() {
    _cart.clear();
    _tax = 0.0;
    _discount = 0.0;
    notifyListeners();
  }

  Future<bool> processSale(String? customerId) async {
    if (_cart.isEmpty) return false;

    _isLoading = true;
    notifyListeners();

    try {
      final saleId = 'SALE-${DateTime.now().millisecondsSinceEpoch}-${const Uuid().v4().substring(0, 6)}';
      final cashierId = FirebaseService.currentUser?.uid;

      final sale = SaleModel(
        id: '',
        saleId: saleId,
        cashierId: cashierId,
        customerId: customerId,
        items: List.from(_cart),
        subtotal: subtotal,
        tax: taxAmount,
        discount: discountAmount,
        totalAmount: total,
        paymentMethod: 'cash',
        saleType: _saleType,
        dateTime: DateTime.now(),
        createdAt: DateTime.now(),
      );

      // Use batch write for atomicity
      final batch = FirebaseService.firestore.batch();

      // Add sale document
      final saleRef = FirebaseService.salesCollection.doc();
      batch.set(saleRef, sale.toMap());

      // Update product stock
      for (final item in _cart) {
        final productRef = FirebaseService.productsCollection.doc(item.productId);
        batch.update(productRef, {
          'stockQuantity': FieldValue.increment(-item.quantity),
          'updatedAt': FieldValue.serverTimestamp(),
        });
      }

      await batch.commit();

      clearCart();
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      debugPrint('Error processing sale: $e');
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }
}

