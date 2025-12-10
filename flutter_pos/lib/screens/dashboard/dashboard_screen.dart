import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../../services/firebase_service.dart';

class DashboardScreen extends StatelessWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Dashboard',
              style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            const SizedBox(height: 24),
            StreamBuilder<QuerySnapshot>(
              stream: FirebaseService.salesCollection
                  .where('dateTime',
                      isGreaterThan: Timestamp.fromDate(
                        DateTime.now().subtract(const Duration(days: 1)),
                      ))
                  .snapshots(),
              builder: (context, snapshot) {
                if (!snapshot.hasData) {
                  return const Center(child: CircularProgressIndicator());
                }

                double todaySales = 0;
                int todayTransactions = snapshot.data!.docs.length;

                for (var doc in snapshot.data!.docs) {
                  final data = doc.data() as Map<String, dynamic>;
                  todaySales += (data['totalAmount'] ?? 0).toDouble();
                }

                return Row(
                  children: [
                    Expanded(
                      child: _StatCard(
                        title: 'Today\'s Sales',
                        value: '\$${todaySales.toStringAsFixed(2)}',
                        icon: Icons.attach_money,
                        color: Colors.green,
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: _StatCard(
                        title: 'Transactions',
                        value: todayTransactions.toString(),
                        icon: Icons.receipt,
                        color: Colors.blue,
                      ),
                    ),
                  ],
                );
              },
            ),
            const SizedBox(height: 16),
            StreamBuilder<QuerySnapshot>(
              stream: FirebaseService.productsCollection
                  .where('stockQuantity', isLessThan: 10)
                  .snapshots(),
              builder: (context, snapshot) {
                if (!snapshot.hasData) {
                  return const SizedBox.shrink();
                }

                return _StatCard(
                  title: 'Low Stock Items',
                  value: snapshot.data!.docs.length.toString(),
                  icon: Icons.warning,
                  color: Colors.orange,
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final String title;
  final String value;
  final IconData icon;
  final Color color;

  const _StatCard({
    required this.title,
    required this.value,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Icon(icon, color: color, size: 32),
                Text(
                  value,
                  style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                        color: color,
                      ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              title,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: Colors.grey[600],
                  ),
            ),
          ],
        ),
      ),
    );
  }
}

