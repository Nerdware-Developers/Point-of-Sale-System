import { useState, useEffect } from 'react';
import { Wifi, WifiOff, Cloud, CloudOff } from 'lucide-react';

export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const handleConnectionChange = (event) => {
      const online = event.detail?.isOnline ?? navigator.onLine;
      setIsOnline(online);
      setShowBanner(true);
      
      // Hide banner after 3 seconds
      setTimeout(() => setShowBanner(false), 3000);
    };

    const handleOnline = () => {
      setIsOnline(true);
      setShowBanner(true);
      setTimeout(() => setShowBanner(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowBanner(true);
    };

    window.addEventListener('connectionchange', handleConnectionChange);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('connectionchange', handleConnectionChange);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!showBanner && isOnline) {
    return null;
  }

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        showBanner ? 'translate-y-0' : '-translate-y-full'
      }`}
    >
      <div
        className={`flex items-center justify-center gap-2 px-4 py-3 text-white font-semibold ${
          isOnline ? 'bg-green-600' : 'bg-red-600'
        }`}
      >
        {isOnline ? (
          <>
            <Wifi className="w-5 h-5" />
            <span>Back Online - Syncing data...</span>
          </>
        ) : (
          <>
            <WifiOff className="w-5 h-5" />
            <span>Offline Mode - Changes will sync when connection is restored</span>
          </>
        )}
      </div>
    </div>
  );
}


