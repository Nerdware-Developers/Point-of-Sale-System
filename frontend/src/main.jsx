import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import offlineDB from './utils/offlineDB.js';
import offlineSync from './utils/offlineSync.js';

// Initialize offline database (non-blocking)
offlineDB.init().then(() => {
  console.log('[Main] Offline database initialized');
  
  // Sync when online
  if (navigator.onLine) {
    offlineSync.sync().catch(err => {
      console.error('[Main] Sync error:', err);
    });
  }
}).catch(error => {
  console.error('[Main] Failed to initialize offline database:', error);
  // Don't block app from loading if offline DB fails
});

// Register service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('[Main] Service Worker registered:', registration);
        
        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New service worker available, reload to use it
              if (confirm('New version available! Reload to update?')) {
                window.location.reload();
              }
            }
          });
        });
      })
      .catch((error) => {
        console.error('[Main] Service Worker registration failed:', error);
      });
  });
  
  // Auto-unregister old service workers on load (to clear cache)
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(reg => {
      if (reg.active?.scriptURL.includes('sw.js')) {
        // Keep the current one, but clear old caches
        caches.keys().then(names => {
          names.forEach(name => {
            if (name.includes('pos-system-v1') || name.includes('pos-runtime-v1')) {
              caches.delete(name);
            }
          });
        });
      }
    });
  }).catch(error => {
    console.error('[Main] Error getting service worker registrations:', error);
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

