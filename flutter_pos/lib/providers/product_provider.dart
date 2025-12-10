import 'package:flutter/foundation.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/product_model.dart';
import '../services/firebase_service.dart';

class ProductProvider with ChangeNotifier {
  List<ProductModel> _products = [];
  bool _isLoading = false;
  String? _error;

  List<ProductModel> get products => _products;
  bool get isLoading => _isLoading;
  String? get error => _error;

  ProductProvider() {
    loadProducts();
  }

  Future<void> loadProducts() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      FirebaseService.productsCollection
          .orderBy('createdAt', descending: true)
          .snapshots()
          .listen((snapshot) {
        _products = snapshot.docs
            .map((doc) => ProductModel.fromFirestore(doc))
            .toList();
        _isLoading = false;
        _error = null;
        notifyListeners();
      });
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  List<ProductModel> searchProducts(String query) {
    if (query.isEmpty) return _products;
    final lowerQuery = query.toLowerCase();
    return _products.where((product) {
      return product.name.toLowerCase().contains(lowerQuery) ||
          (product.barcode?.toLowerCase().contains(lowerQuery) ?? false);
    }).toList();
  }

  ProductModel? getProductById(String id) {
    try {
      return _products.firstWhere((p) => p.id == id);
    } catch (e) {
      return null;
    }
  }

  ProductModel? getProductByBarcode(String barcode) {
    try {
      return _products.firstWhere((p) => p.barcode == barcode);
    } catch (e) {
      return null;
    }
  }

  Future<bool> addProduct(ProductModel product) async {
    try {
      await FirebaseService.productsCollection.add(product.toMap());
      return true;
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return false;
    }
  }

  Future<bool> updateProduct(String id, ProductModel product) async {
    try {
      await FirebaseService.productsCollection.doc(id).update(product.toMap());
      return true;
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return false;
    }
  }

  Future<bool> deleteProduct(String id) async {
    try {
      await FirebaseService.productsCollection.doc(id).delete();
      return true;
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return false;
    }
  }

  Future<bool> updateStock(String id, int quantity) async {
    try {
      await FirebaseService.productsCollection.doc(id).update({
        'stockQuantity': quantity,
        'updatedAt': FieldValue.serverTimestamp(),
      });
      return true;
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return false;
    }
  }
}

