import { createContext, useContext, ReactNode } from 'react';
import { useState, useEffect, useCallback } from 'react';
import { pushNotificationManager, SubscriptionStatus, NotificationPermissionState } from '../lib/push-notification-manager';

export interface UsePushNotificationOptions {
  autoInitialize?: boolean;
  onSubscriptionChange?: (status: SubscriptionStatus) => void;
  onPermissionChange?: (state: NotificationPermissionState) => void;
  onError?: (error: Error) => void;
}

export interface UsePushNotificationReturn {
  // State
  isInitialized: boolean;
  isInitializing: boolean;
  subscriptionStatus: SubscriptionStatus | null;
  permissionState: NotificationPermissionState;
  error: string | null;
  
  // Actions
  initialize: () => Promise<void>;
  requestPermission: () => Promise<void>;
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
  setTags: (tags: Record<string, string>) => Promise<void>;
  loginUser: (userId: string) => Promise<void>;
  logoutUser: () => Promise<void>;
  
  // Computed properties
  canRequestPermission: boolean;
  isSupported: boolean;
  isPWA: boolean;
  showIOSBanner: boolean;
}

export function usePushNotification(options: UsePushNotificationOptions = {}): UsePushNotificationReturn {
  const {
    autoInitialize = true,
    onSubscriptionChange,
    onPermissionChange,
    onError,
  } = options;

  // State
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [permissionState, setPermissionState] = useState<NotificationPermissionState>({
    permission: 'default',
    canRequestPermission: false,
    requiresUserAction: true,
    isSupported: false,
  });
  const [error, setError] = useState<string | null>(null);

  // Initialize push notification manager
  const initialize = useCallback(async () => {
    if (isInitializing || isInitialized) return;
    
    try {
      setIsInitializing(true);
      setError(null);
      
      await pushNotificationManager.initialize();
      
      setIsInitialized(true);
      
      // Get initial states
      const [currentStatus, currentPermissionState] = await Promise.all([
        pushNotificationManager.getSubscriptionStatus(),
        Promise.resolve(pushNotificationManager.getPermissionState()),
      ]);
      
      setSubscriptionStatus(currentStatus);
      setPermissionState(currentPermissionState);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize push notifications';
      setError(errorMessage);
      onError?.(err instanceof Error ? err : new Error(errorMessage));
    } finally {
      setIsInitializing(false);
    }
  }, [isInitializing, isInitialized, onError]);

  // Request permission and subscribe
  const requestPermission = useCallback(async () => {
    try {
      setError(null);
      
      if (!isInitialized) {
        await initialize();
      }
      
      const status = await pushNotificationManager.requestPermissionAndSubscribe();
      setSubscriptionStatus(status);
      
      if (status.error) {
        setError(status.error);
        onError?.(new Error(status.error));
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to request permission';
      setError(errorMessage);
      onError?.(err instanceof Error ? err : new Error(errorMessage));
    }
  }, [isInitialized, initialize, onError]);

  // Subscribe (alias for requestPermission for clarity)
  const subscribe = useCallback(async () => {
    await requestPermission();
  }, [requestPermission]);

  // Unsubscribe from notifications
  const unsubscribe = useCallback(async () => {
    try {
      setError(null);
      
      const success = await pushNotificationManager.unsubscribe();
      
      if (success) {
        const updatedStatus = await pushNotificationManager.getSubscriptionStatus();
        setSubscriptionStatus(updatedStatus);
      } else {
        throw new Error('Failed to unsubscribe');
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to unsubscribe';
      setError(errorMessage);
      onError?.(err instanceof Error ? err : new Error(errorMessage));
    }
  }, [onError]);

  // Set user tags
  const setTags = useCallback(async (tags: Record<string, string>) => {
    try {
      setError(null);
      
      const success = await pushNotificationManager.setUserTags(tags);
      
      if (!success) {
        throw new Error('Failed to set user tags');
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to set tags';
      setError(errorMessage);
      onError?.(err instanceof Error ? err : new Error(errorMessage));
    }
  }, [onError]);

  // Login user
  const loginUser = useCallback(async (userId: string) => {
    try {
      setError(null);
      
      if (!isInitialized) {
        await initialize();
      }
      
      const success = await pushNotificationManager.loginUser(userId);
      
      if (!success) {
        throw new Error('Failed to login user');
      }
      
      // Update subscription status after login
      const updatedStatus = await pushNotificationManager.getSubscriptionStatus();
      setSubscriptionStatus(updatedStatus);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to login user';
      setError(errorMessage);
      onError?.(err instanceof Error ? err : new Error(errorMessage));
    }
  }, [isInitialized, initialize, onError]);

  // Logout user
  const logoutUser = useCallback(async () => {
    try {
      setError(null);
      
      const success = await pushNotificationManager.logoutUser();
      
      if (success) {
        // Update subscription status after logout
        const updatedStatus = await pushNotificationManager.getSubscriptionStatus();
        setSubscriptionStatus(updatedStatus);
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to logout user';
      setError(errorMessage);
      onError?.(err instanceof Error ? err : new Error(errorMessage));
    }
  }, [onError]);

  // Setup event listeners
  useEffect(() => {
    const unsubscribeFromSubscription = pushNotificationManager.onSubscriptionChange((status) => {
      setSubscriptionStatus(status);
      onSubscriptionChange?.(status);
      
      if (status.error) {
        setError(status.error);
      }
    });

    const unsubscribeFromPermission = pushNotificationManager.onPermissionChange((state) => {
      setPermissionState(state);
      onPermissionChange?.(state);
    });

    return () => {
      unsubscribeFromSubscription();
      unsubscribeFromPermission();
    };
  }, [onSubscriptionChange, onPermissionChange]);

  // Auto-initialize if enabled
  useEffect(() => {
    if (autoInitialize && !isInitialized && !isInitializing) {
      initialize();
    }
  }, [autoInitialize, isInitialized, isInitializing, initialize]);

  // Computed properties
  const canRequestPermission = permissionState.canRequestPermission && permissionState.isSupported;
  const isSupported = permissionState.isSupported;
  const isPWA = pushNotificationManager.isPWA();
  const deviceInfo = pushNotificationManager.detectDeviceInfo();
  const showIOSBanner = deviceInfo.os === 'IOS' && !isPWA && isSupported;

  return {
    // State
    isInitialized,
    isInitializing,
    subscriptionStatus,
    permissionState,
    error,
    
    // Actions
    initialize,
    requestPermission,
    subscribe,
    unsubscribe,
    setTags,
    loginUser,
    logoutUser,
    
    // Computed properties
    canRequestPermission,
    isSupported,
    isPWA,
    showIOSBanner,
  };
}

// Higher-order component for providing push notification context

interface PushNotificationContextType {
  pushNotification: UsePushNotificationReturn;
}

const PushNotificationContext = createContext<PushNotificationContextType | null>(null);

export interface PushNotificationProviderProps {
  children: ReactNode;
  options?: UsePushNotificationOptions;
}

export function PushNotificationProvider({ children, options }: PushNotificationProviderProps) {
  const pushNotification = usePushNotification(options);

  return (
    <PushNotificationContext.Provider value={{ pushNotification }}>
      {children}
    </PushNotificationContext.Provider>
  );
}

export function usePushNotificationContext(): UsePushNotificationReturn {
  const context = useContext(PushNotificationContext);
  
  if (!context) {
    throw new Error('usePushNotificationContext must be used within a PushNotificationProvider');
  }
  
  return context.pushNotification;
}