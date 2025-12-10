import 'package:cloud_firestore/cloud_firestore.dart';

class ProductModel {
  final String id;
  final String name;
  final String? categoryId;
  final double buyingPrice;
  final double sellingPrice;
  final double? wholesalePrice;
  final int stockQuantity;
  final String? barcode;
  final String? imageUrl;
  final DateTime createdAt;
  final DateTime? updatedAt;

  ProductModel({
    required this.id,
    required this.name,
    this.categoryId,
    required this.buyingPrice,
    required this.sellingPrice,
    this.wholesalePrice,
    required this.stockQuantity,
    this.barcode,
    this.imageUrl,
    required this.createdAt,
    this.updatedAt,
  });

  factory ProductModel.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;
    return ProductModel(
      id: doc.id,
      name: data['name'] ?? '',
      categoryId: data['categoryId'],
      buyingPrice: (data['buyingPrice'] ?? 0).toDouble(),
      sellingPrice: (data['sellingPrice'] ?? 0).toDouble(),
      wholesalePrice: data['wholesalePrice']?.toDouble(),
      stockQuantity: data['stockQuantity'] ?? 0,
      barcode: data['barcode'],
      imageUrl: data['imageUrl'],
      createdAt: (data['createdAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
      updatedAt: (data['updatedAt'] as Timestamp?)?.toDate(),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'name': name,
      'categoryId': categoryId,
      'buyingPrice': buyingPrice,
      'sellingPrice': sellingPrice,
      'wholesalePrice': wholesalePrice,
      'stockQuantity': stockQuantity,
      'barcode': barcode,
      'imageUrl': imageUrl,
      'createdAt': Timestamp.fromDate(createdAt),
      'updatedAt': updatedAt != null ? Timestamp.fromDate(updatedAt!) : null,
    };
  }

  bool get isLowStock => stockQuantity < 10;
  double get profit => sellingPrice - buyingPrice;
}

