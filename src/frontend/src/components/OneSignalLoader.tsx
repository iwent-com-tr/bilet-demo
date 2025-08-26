import React, { ReactNode, useEffect, useState } from 'react';

export interface PushNotificationFeatureFlag {
  enabled: boolean;
  reason: string;
  config?: {
    appId: string;
    environment: 'development' | 'production';
  };
}

export function usePushNotificationFeatureFlag(): PushNotificationFeatureFlag {
  // Check if push notifications should be enabled
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isProduction = process.env.NODE_ENV === 'production';
  
  // In development, check for explicit enable flag
  if (isDevelopment) {
    const enabledInDev = process.env.REACT_APP_ENABLE_PUSH_NOTIFICATIONS === 'true';
    if (!enabledInDev) {
      return {
        enabled: false,
        reason: 'Push notifications disabled in development environment. Set REACT_APP_ENABLE_PUSH_NOTIFICATIONS=true to enable.',
      };
    }
  }
  
  // In production, check hostname
  if (isProduction) {
    const hostname = window.location.hostname;
    const isValidDomain = hostname.includes('iwent.com.tr') || hostname.includes('bilet-demo.');
    if (!isValidDomain) {
      return {
        enabled: false,
        reason: `Push notifications not configured for domain: ${hostname}`,
      };
    }
  }
  
  // Get app ID based on environment
  const getAppId = () => {
    if (isDevelopment) {
      return process.env.REACT_APP_ONESIGNAL_DEV_APP_ID || '6fb68b33-a968-4288-b0dd-5003baec3ce7';
    }
    return process.env.REACT_APP_ONESIGNAL_PROD_APP_ID || '6fb68b33-a968-4288-b0dd-5003baec3ce7';
  };
  
  return {
    enabled: true,
    reason: 'Push notifications enabled',
    config: {
      appId: getAppId(),
      environment: isDevelopment ? 'development' : 'production',
    },
  };
}

export interface OneSignalLoaderProps {
  children: ReactNode;
}

export function OneSignalLoader({ children }: OneSignalLoaderProps): JSX.Element {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const featureFlag = usePushNotificationFeatureFlag();
  
  useEffect(() => {
    // If push notifications are disabled, don't load OneSignal
    if (!featureFlag.enabled) {
      setIsLoaded(true);
      return;
    }
    
    // If OneSignal is already loaded, mark as loaded
    if (window.OneSignal) {
      setIsLoaded(true);
      return;
    }
    
    // Load OneSignal SDK
    loadOneSignalSDK();
  }, [featureFlag.enabled]);
  
  const loadOneSignalSDK = async () => {
    if (isLoading) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Check if script is already added
      if (document.querySelector('script[src*="onesignal"]')) {
        await waitForOneSignal();
        setIsLoaded(true);
        return;
      }
      
      // Add OneSignal script
      const script = document.createElement('script');
      script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
      script.async = true;
      script.defer = true;
      
      script.onload = async () => {
        try {
          await waitForOneSignal();
          setIsLoaded(true);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to load OneSignal');
        } finally {
          setIsLoading(false);
        }
      };
      
      script.onerror = () => {
        setError('Failed to load OneSignal SDK');
        setIsLoading(false);
      };
      
      document.head.appendChild(script);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setIsLoading(false);
    }
  };
  
  const waitForOneSignal = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 50; // 5 seconds timeout
      
      const checkOneSignal = () => {
        if (window.OneSignal) {
          resolve();
          return;
        }
        
        attempts++;
        if (attempts >= maxAttempts) {
          reject(new Error('OneSignal SDK failed to load within timeout'));
          return;
        }
        
        setTimeout(checkOneSignal, 100);
      };
      
      checkOneSignal();
    });
  };
  
  // Show loading state
  if (!isLoaded && isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading push notification service...</p>
        </div>
      </div>
    );
  }
  
  // Show error state
  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="font-semibold text-red-800 mb-2">
            ⚠️ Push Notification Service Error
          </h3>
          <p className="text-red-700 text-sm mb-4">{error}</p>
          <button
            onClick={() => {
              setError(null);
              setIsLoaded(false);
              loadOneSignalSDK();
            }}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }
  
  // Render children when loaded or when push notifications are disabled
  return <>{children}</>;
}

// Use existing OneSignal declaration from push-notification-manager