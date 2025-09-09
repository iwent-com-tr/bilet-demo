import React, { ReactNode, useEffect, useState } from 'react';
import { pushNotificationManager } from '../lib/push-notification-manager';

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
  const hostname = window.location.hostname;
  
  // Get OneSignal App ID from environment
  const appId = process.env.REACT_APP_ONESIGNAL_APP_ID;
  
  // In development, enable by default if App ID exists, or allow explicit disable
  if (isDevelopment) {
    const explicitlyDisabled = process.env.REACT_APP_ENABLE_PUSH_NOTIFICATIONS === 'false';
    const isLocalhost = hostname === 'localhost';
    
    // Disable only if explicitly disabled
    if (explicitlyDisabled) {
      return {
        enabled: false,
        reason: 'Push notifications explicitly disabled in development. Remove REACT_APP_ENABLE_PUSH_NOTIFICATIONS=false to enable.',
      };
    }
    
    // Check for App ID in development
    if (!appId) {
      return {
        enabled: false,
        reason: 'Push notifications not configured - missing REACT_APP_ONESIGNAL_APP_ID',
      };
    }
    
    console.log('[FeatureFlag] Push notifications enabled in development - App ID found for domain:', hostname);
  }
  
  // In production, enable if App ID exists
  if (isProduction) {
    if (!appId) {
      return {
        enabled: false,
        reason: 'Push notifications not configured - missing REACT_APP_ONESIGNAL_APP_ID',
      };
    }
    
    console.log('[FeatureFlag] Push notifications enabled in production - App ID found for domain:', hostname);
  }
  
  // Get app ID based on environment
  const getAppId = () => {
    if (isDevelopment) {
      return process.env.REACT_APP_ONESIGNAL_APP_ID || '6fb68b33-a968-4288-b0dd-5003baec3ce7';
    }
    return process.env.REACT_APP_ONESIGNAL_APP_ID || '6fb68b33-a968-4288-b0dd-5003baec3ce7';
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

function shouldLoadOneSignal(): boolean {
  const hostname = window.location.hostname;
  
  // Check if explicitly disabled in development
  if (process.env.NODE_ENV === 'development') {
    const explicitlyDisabled = process.env.REACT_APP_ENABLE_PUSH_NOTIFICATIONS === 'false';
    if (explicitlyDisabled) {
      console.log('[OneSignalLoader] OneSignal explicitly disabled in development.');
      return false;
    }
  }

  // Initialize if we have an App ID (works on any domain, any environment)
  const hasAppId = !!process.env.REACT_APP_ONESIGNAL_APP_ID;
  if (hasAppId) {
    console.log('[OneSignalLoader] OneSignal enabled - App ID found for hostname:', hostname, 'environment:', process.env.NODE_ENV);
    return true;
  }

  console.log('[OneSignalLoader] OneSignal disabled - no App ID found');
  return false;
}

function getOneSignalAppId(): string {
  // Use the standard environment variable
  return process.env.REACT_APP_ONESIGNAL_APP_ID || '6fb68b33-a968-4288-b0dd-5003baec3ce7';
}

export interface OneSignalLoaderProps {
  children: ReactNode;
}

export function OneSignalLoader({ children }: OneSignalLoaderProps): JSX.Element {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [networkStatus, setNetworkStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const featureFlag = usePushNotificationFeatureFlag();
  
  // Check network connectivity
  useEffect(() => {
    const checkConnectivity = () => {
      if (navigator.onLine) {
        setNetworkStatus('online');
      } else {
        setNetworkStatus('offline');
        setError('No internet connection detected. Please check your network connection.');
      }
    };
    
    checkConnectivity();
    
    window.addEventListener('online', checkConnectivity);
    window.addEventListener('offline', checkConnectivity);
    
    return () => {
      window.removeEventListener('online', checkConnectivity);
      window.removeEventListener('offline', checkConnectivity);
    };
  }, []);
  
  useEffect(() => {
    console.log('[OneSignalLoader] useEffect triggered', {
      featureFlagEnabled: featureFlag.enabled,
      reason: featureFlag.reason,
      windowOneSignal: !!window.OneSignal,
      hostname: window.location.hostname,
      nodeEnv: process.env.NODE_ENV,
      networkStatus,
      isOnline: navigator.onLine
    });

    // Don't load if offline
    if (networkStatus === 'offline') {
      console.log('[OneSignalLoader] Skipping OneSignal load - device is offline');
      return;
    }

    // If push notifications are disabled, don't load OneSignal
    if (!featureFlag.enabled) {
      console.log('[OneSignalLoader] Push notifications disabled:', featureFlag.reason);
      setIsLoaded(true);
      return;
    }
    
    // If OneSignal is already loaded, mark as loaded
    if (window.OneSignal) {
      console.log('[OneSignalLoader] OneSignal already loaded');
      setIsLoaded(true);
      return;
    }
    
    // Load OneSignal SDK
    console.log('[OneSignalLoader] Loading OneSignal SDK...');
    loadOneSignalSDK();
  }, [featureFlag.enabled, networkStatus]);
  
  const loadOneSignalSDK = async () => {
    if (isLoading) {
      console.log('[OneSignalLoader] Already loading, skipping...');
      return;
    }
    
    try {
      console.log('[OneSignalLoader] Starting to load OneSignal SDK...');
      setIsLoading(true);
      setError(null);
      
      // Check if script is already added
      if (document.querySelector('script[src*="onesignal"]')) {
        console.log('[OneSignalLoader] OneSignal script already exists, waiting...');
        await waitForOneSignal();
        
        // Initialize push notification manager
        try {
          console.log('[OneSignalLoader] Initializing push notification manager...');
          await pushNotificationManager.initialize();
          console.log('[OneSignalLoader] Push notification manager initialized successfully!');
        } catch (managerError) {
          console.error('[OneSignalLoader] Failed to initialize push notification manager:', managerError);
          // Don't fail the loader if manager fails, just log it
        }
        
        setIsLoaded(true);
        return;
      }
      
      // Try to load OneSignal with fallback strategies
      await loadOneSignalWithFallback();
      
    } catch (err) {
      console.error('[OneSignalLoader] Error in loadOneSignalSDK:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setIsLoading(false);
    }
  };
  
  const loadOneSignalWithFallback = async (): Promise<void> => {
    const scriptUrls = [
      'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js',
      'https://onesignal.com/sdks/web/v16/OneSignalSDK.page.js' // Fallback URL
    ];
    
    for (let i = 0; i < scriptUrls.length; i++) {
      const url = scriptUrls[i];
      console.log(`[OneSignalLoader] Attempting to load OneSignal from: ${url} (attempt ${i + 1}/${scriptUrls.length})`);
      
      try {
        await loadScriptFromUrl(url);
        console.log(`[OneSignalLoader] Successfully loaded OneSignal from: ${url}`);
        return; // Success, exit the loop
      } catch (error) {
        console.warn(`[OneSignalLoader] Failed to load from ${url}:`, error);
        
        if (i === scriptUrls.length - 1) {
          // Last attempt failed
          throw new Error('Failed to load OneSignal SDK from all available sources. Please check your internet connection.');
        }
      }
    }
  };
  
  const loadScriptFromUrl = (url: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      // Add OneSignal script with enhanced configuration
      const script = document.createElement('script');
      script.src = url;
      script.async = true;
      script.defer = true;
      script.crossOrigin = 'anonymous';
      
      // Add timeout for script loading (shorter per attempt)
      const scriptTimeout = setTimeout(() => {
        console.error(`[OneSignalLoader] Script loading timeout for: ${url}`);
        document.head.removeChild(script);
        reject(new Error(`Script loading timeout: ${url}`));
      }, 10000); // 10 second timeout per script attempt
      
      script.onload = async () => {
        try {
          clearTimeout(scriptTimeout);
          console.log('[OneSignalLoader] OneSignal script loaded successfully, waiting for initialization...');
          await waitForOneSignal();
          console.log('[OneSignalLoader] OneSignal ready!');
          
          // Initialize push notification manager
          try {
            console.log('[OneSignalLoader] Initializing push notification manager...');
            await pushNotificationManager.initialize();
            console.log('[OneSignalLoader] Push notification manager initialized successfully!');
          } catch (managerError) {
            console.error('[OneSignalLoader] Failed to initialize push notification manager:', managerError);
            // Don't fail the loader if manager fails, just log it
          }
          
          setIsLoaded(true);
          resolve();
        } catch (err) {
          clearTimeout(scriptTimeout);
          console.error('[OneSignalLoader] Error waiting for OneSignal:', err);
          setError(err instanceof Error ? err.message : 'Failed to initialize OneSignal');
          setIsLoading(false);
          reject(err);
        }
      };
    
      script.onerror = (error) => {
        clearTimeout(scriptTimeout);
        console.error(`[OneSignalLoader] Failed to load OneSignal SDK script from: ${url}`, error);
        document.head.removeChild(script);
        reject(new Error(`Script loading failed: ${url}`));
      };
      
      document.head.appendChild(script);
      console.log(`[OneSignalLoader] OneSignal script added to DOM: ${url}`);
    });
  };
  
  const waitForOneSignal = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 200; // 20 seconds timeout (increased from 5 seconds)
      
      const checkOneSignal = () => {
        console.log(`[OneSignalLoader] Checking OneSignal availability, attempt ${attempts + 1}/${maxAttempts}`);
        
        if (window.OneSignal) {
          console.log('[OneSignalLoader] OneSignal is now available!');
          resolve();
          return;
        }
        
        attempts++;
        if (attempts >= maxAttempts) {
          const errorMsg = `OneSignal SDK failed to load within ${maxAttempts / 10} seconds. This may be due to network issues or script blocking.`;
          console.error(`[OneSignalLoader] ${errorMsg}`);
          reject(new Error(errorMsg));
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
  
  // Show error state with helpful guidance
  if (error) {
    const isMobile = /Mobile|Android|iPhone|iPad/.test(navigator.userAgent);
    const isNetworkError = error.includes('network') || error.includes('timeout') || error.includes('Script loading failed');
    
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="font-semibold text-red-800 mb-2">
            ⚠️ Push Notification Service Error
          </h3>
          <p className="text-red-700 text-sm mb-4">{error}</p>
          
          {isNetworkError && (
            <div className="mb-4 p-3 bg-red-100 rounded">
              <p className="text-sm font-medium text-red-800 mb-2">Possible solutions:</p>
              <ul className="text-xs text-red-700 space-y-1">
                <li>• Check your internet connection</li>
                <li>• Disable any ad blockers or script blockers</li>
                {isMobile && <li>• Try switching between WiFi and mobile data</li>}
                <li>• Refresh the page and try again</li>
                <li>• Try in an incognito/private browsing window</li>
              </ul>
            </div>
          )}
          
          {isMobile && (
            <div className="mb-4 p-3 bg-blue-100 rounded">
              <p className="text-sm font-medium text-blue-800 mb-2">📱 Mobile users:</p>
              <ul className="text-xs text-blue-700 space-y-1">
                <li>• Make sure you're using a supported browser (Chrome, Firefox, Safari)</li>
                <li>• For iOS: Add this site to your home screen for better push notification support</li>
                <li>• Some mobile networks may block certain scripts - try WiFi</li>
              </ul>
            </div>
          )}
          
          <div className="flex gap-2">
            <button
              onClick={() => {
                setError(null);
                setIsLoaded(false);
                loadOneSignalSDK();
              }}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
            >
              🔄 Retry
            </button>
            
            <button
              onClick={() => {
                // Skip push notifications and continue with limited functionality
                setError(null);
                setIsLoaded(true);
              }}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
            >
              ⏭️ Continue without notifications
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  // Render children when loaded or when push notifications are disabled
  return <>{children}</>;
}

// Use existing OneSignal declaration from push-notification-manager