// Run this in browser console to unregister service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(reg => {
      reg.unregister().then(() => {
        console.log('Service Worker unregistered');
        window.location.reload();
      });
    });
  });
}

