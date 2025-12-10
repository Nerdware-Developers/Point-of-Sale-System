import 'package:cloud_firestore/cloud_firestore.dart';

class SaleItem {
  final String productId;
  final String productName;
  final int quantity;
  final double price;

  SaleItem({
    required this.productId,
    required this.productName,
    required this.quantity,
    required this.price,
  });

  Map<String, dynamic> toMap() {
    return {
      'productId': productId,
      'productName': productName,
      'quantity': quantity,
      'price': price,
    };
  }

  factory SaleItem.fromMap(Map<String, dynamic> map) {
    return SaleItem(
      productId: map['productId'] ?? '',
      productName: map['productName'] ?? '',
      quantity: map['quantity'] ?? 0,
      price: (map['price'] ?? 0).toDouble(),
    );
  }

  double get total => quantity * price;
}

class SaleModel {
  final String id;
  final String saleId;
  final String? cashierId;
  final String? customerId;
  final List<SaleItem> items;
  final double subtotal;
  final double tax;
  final double discount;
  final double totalAmount;
  final String paymentMethod;
  final String saleType; // 'retail' or 'wholesale'
  final DateTime dateTime;
  final DateTime createdAt;

  SaleModel({
    required this.id,
    required this.saleId,
    this.cashierId,
    this.customerId,
    required this.items,
    required this.subtotal,
    required this.tax,
    required this.discount,
    required this.totalAmount,
    required this.paymentMethod,
    required this.saleType,
    required this.dateTime,
    required this.createdAt,
  });

  factory SaleModel.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;
    return SaleModel(
      id: doc.id,
      saleId: data['saleId'] ?? '',
      cashierId: data['cashierId'],
      customerId: data['customerId'],
      items: (data['items'] as List<dynamic>?)
              ?.map((item) => SaleItem.fromMap(item as Map<String, dynamic>))
              .toList() ??
          [],
      subtotal: (data['subtotal'] ?? 0).toDouble(),
      tax: (data['tax'] ?? 0).toDouble(),
      discount: (data['discount'] ?? 0).toDouble(),
      totalAmount: (data['totalAmount'] ?? 0).toDouble(),
      paymentMethod: data['paymentMethod'] ?? 'cash',
      saleType: data['saleType'] ?? 'retail',
      dateTime: (data['dateTime'] as Timestamp?)?.toDate() ?? DateTime.now(),
      createdAt: (data['createdAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'saleId': saleId,
      'cashierId': cashierId,
      'customerId': customerId,
      'items': items.map((item) => item.toMap()).toList(),
      'subtotal': subtotal,
      'tax': tax,
      'discount': discount,
      'totalAmount': totalAmount,
      'paymentMethod': paymentMethod,
      'saleType': saleType,
      'dateTime': Timestamp.fromDate(dateTime),
      'createdAt': Timestamp.fromDate(createdAt),
    };
  }
}

