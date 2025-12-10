import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_storage/firebase_storage.dart';

class FirebaseService {
  static final FirebaseAuth _auth = FirebaseAuth.instance;
  static final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  static final FirebaseStorage _storage = FirebaseStorage.instance;

  static Future<void> initialize() async {
    // Initialize any required services
  }

  // Auth
  static FirebaseAuth get auth => _auth;
  static User? get currentUser => _auth.currentUser;

  // Firestore
  static FirebaseFirestore get firestore => _firestore;

  // Collections
  static CollectionReference get usersCollection => _firestore.collection('users');
  static CollectionReference get productsCollection => _firestore.collection('products');
  static CollectionReference get categoriesCollection => _firestore.collection('categories');
  static CollectionReference get salesCollection => _firestore.collection('sales');
  static CollectionReference get customersCollection => _firestore.collection('customers');
  static CollectionReference get suppliersCollection => _firestore.collection('suppliers');
  static CollectionReference get expensesCollection => _firestore.collection('expenses');

  // Storage
  static FirebaseStorage get storage => _storage;
  static Reference get storageRef => _storage.ref();
}

