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
  
  // In development, check for explicit enable flag OR localhost
  if (isDevelopment) {
    const enabledInDev = process.env.REACT_APP_ENABLE_PUSH_NOTIFICATIONS === 'true';
    const isLocalhost = hostname === 'localhost';
    
    // Allow on localhost for demo purposes
    if (!enabledInDev && !isLocalhost) {
      return {
        enabled: false,
        reason: 'Push notifications disabled in development environment. Set REACT_APP_ENABLE_PUSH_NOTIFICATIONS=true to enable.',
      };
    }
  }
  
  // In production, check hostname or app ID
  if (isProduction) {
    const isValidDomain = hostname.includes('iwent.com.tr') || hostname.includes('bilet-demo.');
    const hasAppId = !!process.env.REACT_APP_ONESIGNAL_APP_ID;
    
    // Allow if we have App ID (for testing) or valid domain
    if (!isValidDomain && !hasAppId) {
      return {
        enabled: false,
        reason: `Push notifications not configured for domain: ${hostname}. App ID: ${hasAppId}`,
      };
    }
    
    // If we have App ID, enable even on localhost/other domains
    if (hasAppId) {
      console.log('[FeatureFlag] Push notifications enabled - App ID found for domain:', hostname);
    }
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
  
  // Skip in development unless explicitly enabled
  if (process.env.NODE_ENV === 'development') {
    const isEnabled = process.env.REACT_APP_ENABLE_PUSH_NOTIFICATIONS === 'true';
    if (!isEnabled) {
      console.log('[OneSignalLoader] OneSignal disabled in development. Set REACT_APP_ENABLE_PUSH_NOTIFICATIONS=true to enable.');
      return false;
    }
  }

  // Always initialize if we have an App ID (for localhost testing in production builds)
  const hasAppId = !!process.env.REACT_APP_ONESIGNAL_APP_ID;
  if (hasAppId) {
    console.log('[OneSignalLoader] OneSignal enabled - App ID found');
    return true;
  }

  // In production, also check for production domains
  const isProductionDomain = hostname.includes('iwent.com.tr') || hostname.includes('bilet-demo.');
  
  return isProductionDomain;
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
  const featureFlag = usePushNotificationFeatureFlag();
  
  useEffect(() => {
    console.log('[OneSignalLoader] useEffect triggered', {
      featureFlagEnabled: featureFlag.enabled,
      reason: featureFlag.reason,
      windowOneSignal: !!window.OneSignal,
      hostname: window.location.hostname,
      nodeEnv: process.env.NODE_ENV
    });

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
  }, [featureFlag.enabled]);
  
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
      
      // Add OneSignal script
      console.log('[OneSignalLoader] Adding OneSignal script to DOM...');
      const script = document.createElement('script');
      script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
      script.async = true;
      script.defer = true;
      
              script.onload = async () => {
          try {
            console.log('[OneSignalLoader] OneSignal script loaded, waiting for initialization...');
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
          } catch (err) {
            console.error('[OneSignalLoader] Error waiting for OneSignal:', err);
            setError(err instanceof Error ? err.message : 'Failed to load OneSignal');
          } finally {
            setIsLoading(false);
          }
        };
      
      script.onerror = (error) => {
        console.error('[OneSignalLoader] Failed to load OneSignal SDK:', error);
        setError('Failed to load OneSignal SDK');
        setIsLoading(false);
      };
      
      document.head.appendChild(script);
      console.log('[OneSignalLoader] OneSignal script added to DOM');
      
    } catch (err) {
      console.error('[OneSignalLoader] Error in loadOneSignalSDK:', err);
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