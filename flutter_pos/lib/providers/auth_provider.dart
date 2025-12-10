import 'package:flutter/foundation.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/user_model.dart';
import '../services/firebase_service.dart';

class AuthProvider with ChangeNotifier {
  UserModel? _user;
  bool _isLoading = true;

  UserModel? get user => _user;
  bool get isLoading => _isLoading;
  bool get isAuthenticated => _user != null;
  bool get isAdmin => _user?.isAdmin ?? false;

  AuthProvider() {
    _checkAuthState();
  }

  Future<void> _checkAuthState() async {
    _isLoading = true;
    notifyListeners();

    FirebaseAuth.instance.authStateChanges().listen((User? firebaseUser) async {
      if (firebaseUser != null) {
        await _loadUserData(firebaseUser.uid);
      } else {
        _user = null;
      }
      _isLoading = false;
      notifyListeners();
    });
  }

  Future<void> _loadUserData(String userId) async {
    try {
      final doc = await FirebaseService.usersCollection.doc(userId).get();
      if (doc.exists) {
        _user = UserModel.fromFirestore(doc);
      } else {
        // Create user document if it doesn't exist
        final firebaseUser = FirebaseAuth.instance.currentUser;
        if (firebaseUser != null) {
          _user = UserModel(
            id: firebaseUser.uid,
            email: firebaseUser.email ?? '',
            fullName: firebaseUser.displayName,
            role: 'cashier',
            createdAt: DateTime.now(),
          );
          await FirebaseService.usersCollection.doc(userId).set(_user!.toMap());
        }
      }
      notifyListeners();
    } catch (e) {
      debugPrint('Error loading user data: $e');
    }
  }

  Future<bool> login(String email, String password) async {
    try {
      final credential = await FirebaseAuth.instance.signInWithEmailAndPassword(
        email: email,
        password: password,
      );
      await _loadUserData(credential.user!.uid);
      return true;
    } on FirebaseAuthException catch (e) {
      debugPrint('Login error: ${e.message}');
      return false;
    }
  }

  Future<bool> register(String email, String password, String fullName, String role) async {
    try {
      final credential = await FirebaseAuth.instance.createUserWithEmailAndPassword(
        email: email,
        password: password,
      );

      final userModel = UserModel(
        id: credential.user!.uid,
        email: email,
        fullName: fullName,
        role: role,
        createdAt: DateTime.now(),
      );

      await FirebaseService.usersCollection.doc(credential.user!.uid).set(userModel.toMap());
      _user = userModel;
      notifyListeners();
      return true;
    } on FirebaseAuthException catch (e) {
      debugPrint('Register error: ${e.message}');
      return false;
    }
  }

  Future<void> logout() async {
    await FirebaseAuth.instance.signOut();
    _user = null;
    notifyListeners();
  }
}

