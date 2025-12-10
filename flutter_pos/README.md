# POS System - Flutter Mobile App

A Point of Sale system built with Flutter and Firebase.

## Features

- ✅ Authentication with Firebase Auth
- ✅ Product Management (CRUD operations)
- ✅ Real-time Inventory Tracking
- ✅ Sales/Checkout with Cart
- ✅ Barcode Scanning
- ✅ Image Upload (Camera/Gallery)
- ✅ Sales History
- ✅ Dashboard with Statistics
- ✅ Role-based Access (Admin/Cashier)

## Prerequisites

1. **Flutter SDK** (3.0.0 or higher)
   - Install from: https://flutter.dev/docs/get-started/install

2. **Firebase Project**
   - Create a project at: https://console.firebase.google.com
   - Enable Authentication (Email/Password)
   - Create Firestore Database
   - Enable Storage

3. **Development Tools**
   - Android Studio / VS Code
   - Android SDK / Xcode (for iOS)

## Setup Instructions

### 1. Install Flutter

```bash
# Verify Flutter installation
flutter doctor
```

### 2. Setup Firebase

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project
3. Add Android/iOS apps to your project
4. Download configuration files:
   - Android: `google-services.json` → `android/app/`
   - iOS: `GoogleService-Info.plist` → `ios/Runner/`

### 3. Configure Firebase

#### Enable Authentication:
- Go to Authentication → Sign-in method
- Enable "Email/Password"

#### Create Firestore Database:
- Go to Firestore Database
- Create database in production mode
- Set up security rules (see below)

#### Enable Storage:
- Go to Storage
- Create storage bucket
- Set up security rules (see below)

### 4. Install Dependencies

```bash
cd flutter_pos
flutter pub get
```

### 5. Run the App

```bash
# For Android
flutter run

# For iOS
flutter run -d ios

# For specific device
flutter devices
flutter run -d <device-id>
```

## Firebase Security Rules

### Firestore Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read their own data
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Products - authenticated users can read, only admins can write
    match /products/{productId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Sales - authenticated users can read/write
    match /sales/{saleId} {
      allow read, write: if request.auth != null;
    }
    
    // Categories - authenticated users can read, only admins can write
    match /categories/{categoryId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
  }
}
```

### Storage Rules

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /products/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        request.auth.token.role == 'admin';
    }
  }
}
```

## Creating Default Users

After setting up Firebase, create default users:

1. Go to Firebase Console → Authentication
2. Add users manually:
   - **Admin**: email: `admin@pos.com`, password: `admin123`
   - **Cashier**: email: `cashier@pos.com`, password: `cashier123`

3. Then create user documents in Firestore:
   - Collection: `users`
   - Document ID: (user's UID from Authentication)
   - Fields:
     ```json
     {
       "email": "admin@pos.com",
       "fullName": "Administrator",
       "role": "admin",
       "createdAt": [timestamp]
     }
     ```

## Project Structure

```
lib/
├── main.dart
├── models/
│   ├── user_model.dart
│   ├── product_model.dart
│   └── sale_model.dart
├── providers/
│   ├── auth_provider.dart
│   ├── product_provider.dart
│   └── sale_provider.dart
├── screens/
│   ├── auth/
│   │   └── login_screen.dart
│   ├── home/
│   │   └── home_screen.dart
│   ├── dashboard/
│   │   └── dashboard_screen.dart
│   ├── products/
│   │   ├── products_screen.dart
│   │   └── add_product_screen.dart
│   └── sales/
│       ├── checkout_screen.dart
│       └── sales_history_screen.dart
└── services/
    └── firebase_service.dart
```

## Building for Production

### Android

```bash
flutter build apk --release
# or
flutter build appbundle --release
```

### iOS

```bash
flutter build ios --release
```

## Troubleshooting

### Firebase not initialized
- Ensure `google-services.json` (Android) or `GoogleService-Info.plist` (iOS) is in the correct location
- Run `flutter clean` and `flutter pub get`

### Build errors
- Check Flutter version: `flutter --version`
- Update dependencies: `flutter pub upgrade`
- Clean build: `flutter clean`

### Authentication issues
- Verify Firebase Authentication is enabled
- Check security rules in Firestore
- Ensure user documents exist in Firestore

## Next Steps

- [ ] Add more screens (Categories, Suppliers, Reports)
- [ ] Implement offline support with Firestore offline persistence
- [ ] Add receipt printing
- [ ] Implement advanced reporting
- [ ] Add push notifications

## License

MIT

