# Offline POS System Setup Guide

## Overview

The POS system now supports **full offline functionality**. You can use the system without an internet connection, and all data will automatically sync when the connection is restored.

## Features

### ✅ Offline Capabilities

1. **Full Offline Operation**
   - Browse products, categories, and customers
   - Process sales and transactions
   - Create/edit products and customers
   - View reports and history

2. **Automatic Sync**
   - All offline changes are queued
   - Automatic sync when connection is restored
   - Background sync support

3. **Local Data Storage**
   - Products cached locally
   - Sales stored in IndexedDB
   - Categories and customers cached
   - All data persists between sessions

4. **Progressive Web App (PWA)**
   - Installable on mobile and desktop
   - Works like a native app
   - Offline-first architecture

## Installation

### 1. Install as PWA (Recommended)

1. Open the POS system in your browser
2. Look for the "Install" prompt or click the install icon in your browser
3. Follow the installation instructions
4. The app will now work offline!

### 2. Service Worker Registration

The service worker is automatically registered when you first visit the site. It will:
- Cache static assets
- Enable offline functionality
- Handle background sync

### 3. Icon Setup

1. Create two icon files:
   - `icon-192.png` (192x192 pixels)
   - `icon-512.png` (512x512 pixels)

2. Place them in the `frontend/public/` folder

3. Or use the icon generator at `frontend/public/icon-generator.html`

## How It Works

### Online Mode
- All requests go to the server
- Data is cached locally for offline use
- Real-time updates

### Offline Mode
- Requests are intercepted
- Data is read from IndexedDB
- Changes are queued for sync
- Visual indicator shows offline status

### Sync Process
1. When connection is restored, sync starts automatically
2. Queued operations are processed in order
3. Local data is updated with server data
4. User is notified when sync completes

## Usage

### Making Sales Offline

1. The checkout screen works normally
2. Sales are saved locally
3. A notification shows "Sale saved offline"
4. Sales sync automatically when online

### Managing Products Offline

1. Create/edit products as usual
2. Changes are queued locally
3. Sync happens automatically when online
4. No data loss

### Viewing Reports Offline

1. Reports use cached data
2. Historical data is available
3. New sales are included after sync

## Technical Details

### Storage

- **IndexedDB**: Main offline database
  - Products
  - Sales
  - Categories
  - Customers
  - Pending operations

- **Cache API**: Static assets
  - HTML, CSS, JS files
  - Images and fonts

### Sync Queue

Operations are queued with:
- Type (CREATE, UPDATE, DELETE)
- Data payload
- Timestamp
- Sync status

### Service Worker

Located at: `frontend/public/sw.js`

Handles:
- Asset caching
- Offline responses
- Background sync

## Troubleshooting

### App Not Working Offline

1. Check if service worker is registered:
   - Open DevTools → Application → Service Workers
   - Should see "activated and running"

2. Clear cache and re-register:
   - DevTools → Application → Clear storage
   - Refresh page

### Data Not Syncing

1. Check network connection
2. Open browser console for sync logs
3. Manually trigger sync (if needed)

### Icons Not Showing

1. Ensure icon files exist in `public/` folder
2. Check `manifest.json` paths
3. Clear browser cache

## Browser Support

- ✅ Chrome/Edge (Full support)
- ✅ Firefox (Full support)
- ✅ Safari (iOS 11.3+)
- ✅ Opera (Full support)

## Best Practices

1. **First Visit**: Always visit online first to cache data
2. **Regular Sync**: App syncs automatically, but you can force sync by going online
3. **Data Backup**: Regular server backups recommended
4. **Testing**: Test offline functionality before production use

## Development

### Testing Offline Mode

1. Open DevTools → Network tab
2. Select "Offline" from throttling dropdown
3. Test all features
4. Re-enable network to test sync

### Debugging

Check browser console for:
- `[Service Worker]` logs
- `[OfflineSync]` logs
- `[OfflineDB]` logs

## Security Notes

- Offline data is stored locally in browser
- No encryption by default (consider for sensitive data)
- Clear data on logout for shared devices
- Regular sync ensures data consistency

## Support

For issues or questions:
1. Check browser console for errors
2. Verify service worker registration
3. Test in different browsers
4. Clear cache and retry

---

**The POS system is now fully functional offline!** 🎉


