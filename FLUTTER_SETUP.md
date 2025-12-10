# Flutter + Firebase Migration Guide

This guide will help you set up the Flutter mobile app with Firebase.

## Quick Start

### 1. Install Flutter

Download and install Flutter from: https://flutter.dev/docs/get-started/install

Verify installation:
```bash
flutter doctor
```

### 2. Create Firebase Project

1. Go to https://console.firebase.google.com
2. Click "Add project"
3. Enter project name: "POS System"
4. Enable Google Analytics (optional)
5. Click "Create project"

### 3. Add Android App to Firebase

1. In Firebase Console, click "Add app" → Android
2. Package name: `com.possystem.pos_system`
3. Download `google-services.json`
4. Place it in: `flutter_pos/android/app/`

### 4. Add iOS App to Firebase (if needed)

1. In Firebase Console, click "Add app" → iOS
2. Bundle ID: `com.possystem.posSystem`
3. Download `GoogleService-Info.plist`
4. Place it in: `flutter_pos/ios/Runner/`

### 5. Enable Firebase Services

#### Authentication
1. Go to Authentication → Sign-in method
2. Enable "Email/Password"
3. Click "Save"

#### Firestore Database
1. Go to Firestore Database
2. Click "Create database"
3. Start in **production mode**
4. Choose a location (closest to your users)
5. Click "Enable"

#### Storage
1. Go to Storage
2. Click "Get started"
3. Start in **production mode**
4. Use default security rules
5. Choose same location as Firestore
6. Click "Done"

### 6. Install Flutter Dependencies

```bash
cd flutter_pos
flutter pub get
```

### 7. Create Default Users

#### Option 1: Via Firebase Console
1. Go to Authentication → Users
2. Click "Add user"
3. Add:
   - Email: `admin@pos.com`, Password: `admin123`
   - Email: `cashier@pos.com`, Password: `cashier123`

#### Option 2: Via Flutter App
Run the app and register users (you'll need to add registration screen first)

### 8. Create User Documents in Firestore

After creating users in Authentication, create their documents:

1. Go to Firestore Database
2. Create collection: `users`
3. For each user, create a document with:
   - Document ID: (User's UID from Authentication)
   - Fields:
     ```json
     {
       "email": "admin@pos.com",
       "fullName": "Administrator",
       "role": "admin",
       "createdAt": [current timestamp]
     }
     ```

### 9. Set Up Security Rules

#### Firestore Rules
Go to Firestore Database → Rules, paste:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper function to check if user is admin
    function isAdmin() {
      return request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Users
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Products
    match /products/{productId} {
      allow read: if request.auth != null;
      allow create, update, delete: if isAdmin();
    }
    
    // Sales
    match /sales/{saleId} {
      allow read, write: if request.auth != null;
    }
    
    // Categories
    match /categories/{categoryId} {
      allow read: if request.auth != null;
      allow write: if isAdmin();
    }
    
    // Customers
    match /customers/{customerId} {
      allow read, write: if request.auth != null;
    }
    
    // Suppliers
    match /suppliers/{supplierId} {
      allow read: if request.auth != null;
      allow write: if isAdmin();
    }
    
    // Expenses
    match /expenses/{expenseId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

#### Storage Rules
Go to Storage → Rules, paste:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /products/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}
```

### 10. Run the App

```bash
# Check connected devices
flutter devices

# Run on Android
flutter run

# Run on iOS
flutter run -d ios

# Run on specific device
flutter run -d <device-id>
```

## Testing the App

1. **Login**: Use `admin@pos.com` / `admin123` or `cashier@pos.com` / `cashier123`
2. **Add Product**: Tap Products → Add button → Fill form → Take photo → Save
3. **Make Sale**: Go to Checkout → Search/Scan product → Add to cart → Complete Sale
4. **View Sales**: Go to Sales tab to see history

## Troubleshooting

### "Firebase not initialized"
- Ensure `google-services.json` is in `android/app/`
- Run `flutter clean` and `flutter pub get`

### "Permission denied" errors
- Check Firestore security rules
- Verify user document exists in `users` collection
- Check user's role field

### Build errors
```bash
flutter clean
flutter pub get
flutter run
```

### Android build issues
- Ensure Android SDK is installed
- Check `android/local.properties` has correct SDK path
- Run `flutter doctor` to check setup

## Next Steps

1. ✅ Basic app structure - DONE
2. ⏳ Add more screens (Categories, Suppliers, Reports)
3. ⏳ Implement offline support
4. ⏳ Add receipt printing
5. ⏳ Add more features from web version

## Support

If you encounter issues:
1. Check Firebase Console for errors
2. Check Flutter logs: `flutter run -v`
3. Verify all configuration files are in place
4. Ensure Firebase services are enabled

