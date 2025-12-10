import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:intl/intl.dart';
import '../../models/sale_model.dart';
import '../../services/firebase_service.dart';

class SalesHistoryScreen extends StatelessWidget {
  const SalesHistoryScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Sales History'),
      ),
      body: StreamBuilder<QuerySnapshot>(
        stream: FirebaseService.salesCollection
            .orderBy('dateTime', descending: true)
            .limit(100)
            .snapshots(),
        builder: (context, snapshot) {
          if (!snapshot.hasData) {
            return const Center(child: CircularProgressIndicator());
          }

          if (snapshot.data!.docs.isEmpty) {
            return const Center(child: Text('No sales found'));
          }

          return ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: snapshot.data!.docs.length,
            itemBuilder: (context, index) {
              final doc = snapshot.data!.docs[index];
              final sale = SaleModel.fromFirestore(doc);
              return _SaleCard(sale: sale);
            },
          );
        },
      ),
    );
  }
}

class _SaleCard extends StatelessWidget {
  final SaleModel sale;

  const _SaleCard({required this.sale});

  @override
  Widget build(BuildContext context) {
    final dateFormat = DateFormat('MMM dd, yyyy HH:mm');
    
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        title: Text('Sale: ${sale.saleId}'),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('${sale.items.length} items'),
            Text(dateFormat.format(sale.dateTime)),
            Text('Type: ${sale.saleType}'),
          ],
        ),
        trailing: Text(
          '\$${sale.totalAmount.toStringAsFixed(2)}',
          style: const TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: Colors.green,
          ),
        ),
        isThreeLine: true,
        onTap: () {
          showDialog(
            context: context,
            builder: (context) => AlertDialog(
              title: Text('Sale: ${sale.saleId}'),
              content: SingleChildScrollView(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text('Date: ${dateFormat.format(sale.dateTime)}'),
                    Text('Items: ${sale.items.length}'),
                    const Divider(),
                    ...sale.items.map((item) => Padding(
                      padding: const EdgeInsets.symmetric(vertical: 4.0),
                      child: Text('${item.productName} × ${item.quantity} = \$${item.total.toStringAsFixed(2)}'),
                    )),
                    const Divider(),
                    Text('Subtotal: \$${sale.subtotal.toStringAsFixed(2)}'),
                    if (sale.tax > 0) Text('Tax: \$${sale.tax.toStringAsFixed(2)}'),
                    if (sale.discount > 0) Text('Discount: \$${sale.discount.toStringAsFixed(2)}'),
                    Text(
                      'Total: \$${sale.totalAmount.toStringAsFixed(2)}',
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('Close'),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

