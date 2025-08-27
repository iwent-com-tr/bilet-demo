import React, { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { pushNotificationManager } from '../lib/push-notification-manager';

export interface AuthPushNotificationIntegrationProps {
  /**
   * Whether to automatically login user to OneSignal when authenticated
   * @default true
   */
  autoLogin?: boolean;
  
  /**
   * Whether to automatically logout user from OneSignal when logged out
   * @default true
   */
  autoLogout?: boolean;
  
  /**
   * Delay in milliseconds before attempting OneSignal login after authentication
   * @default 1000
   */
  loginDelay?: number;
  
  /**
   * Maximum number of retry attempts for OneSignal login
   * @default 3
   */
  maxRetries?: number;
  
  /**
   * Callback called when OneSignal login succeeds
   */
  onLoginSuccess?: (userId: string) => void;
  
  /**
   * Callback called when OneSignal login fails
   */
  onLoginFailure?: (userId: string, error: Error) => void;
  
  /**
   * Callback called when OneSignal logout succeeds
   */
  onLogoutSuccess?: () => void;
  
  /**
   * Callback called when OneSignal logout fails
   */
  onLogoutFailure?: (error: Error) => void;
  
  /**
   * Whether to show debug logs
   * @default false
   */
  debug?: boolean;
}

/**
 * Component that automatically manages OneSignal External ID based on authentication state
 * 
 * This component:
 * 1. Monitors user authentication state
 * 2. Automatically logs user into OneSignal with External ID when authenticated
 * 3. Automatically logs user out of OneSignal when they log out
 * 4. Handles retry logic for failed operations
 * 5. Provides callbacks for success/failure events
 */
export function AuthPushNotificationIntegration({
  autoLogin = true,
  autoLogout = true,
  loginDelay = 1000,
  maxRetries = 3,
  onLoginSuccess,
  onLoginFailure,
  onLogoutSuccess,
  onLogoutFailure,
  debug = false,
}: AuthPushNotificationIntegrationProps): JSX.Element | null {
  const { user, isAuthenticated } = useAuth();
  const previousAuthStateRef = useRef<boolean>(false);
  const retryCountRef = useRef<number>(0);
  const loginTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isProcessingRef = useRef<boolean>(false);

  const log = (message: string, ...args: any[]) => {
    if (debug) {
      console.log(`[AuthPushIntegration] ${message}`, ...args);
    }
  };

  const error = (message: string, ...args: any[]) => {
    console.error(`[AuthPushIntegration] ${message}`, ...args);
  };

  // Clear any pending timeouts
  const clearLoginTimeout = () => {
    if (loginTimeoutRef.current) {
      clearTimeout(loginTimeoutRef.current);
      loginTimeoutRef.current = null;
    }
  };

  // Handle OneSignal login with retry logic
  const handleOneSignalLogin = async (userId: string, attempt: number = 1): Promise<void> => {
    if (isProcessingRef.current) {
      log('Login already in progress, skipping');
      return;
    }

    try {
      isProcessingRef.current = true;
      log(`Attempting OneSignal login (attempt ${attempt}/${maxRetries}) for user:`, userId);
      
      const success = await pushNotificationManager.autoLoginIfAuthenticated(userId);
      
      if (success) {
        log('OneSignal login successful for user:', userId);
        retryCountRef.current = 0;
        onLoginSuccess?.(userId);
      } else {
        throw new Error('OneSignal login returned false');
      }
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error('Unknown login error');
      error(`OneSignal login failed (attempt ${attempt}/${maxRetries}):`, errorObj.message);
      
      if (attempt < maxRetries) {
        // Retry with exponential backoff
        const retryDelay = loginDelay * Math.pow(2, attempt - 1);
        log(`Retrying OneSignal login in ${retryDelay}ms...`);
        
        loginTimeoutRef.current = setTimeout(() => {
          handleOneSignalLogin(userId, attempt + 1);
        }, retryDelay);
      } else {
        error('Max retry attempts reached for OneSignal login');
        retryCountRef.current = 0;
        onLoginFailure?.(userId, errorObj);
      }
    } finally {
      isProcessingRef.current = false;
    }
  };

  // Handle OneSignal logout
  const handleOneSignalLogout = async (): Promise<void> => {
    if (isProcessingRef.current) {
      log('Logout already in progress, skipping');
      return;
    }

    try {
      isProcessingRef.current = true;
      log('Attempting OneSignal logout');
      
      const success = await pushNotificationManager.logoutUser();
      
      if (success) {
        log('OneSignal logout successful');
        onLogoutSuccess?.();
      } else {
        throw new Error('OneSignal logout returned false');
      }
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error('Unknown logout error');
      error('OneSignal logout failed:', errorObj.message);
      onLogoutFailure?.(errorObj);
    } finally {
      isProcessingRef.current = false;
    }
  };

  // Handle authentication state changes
  useEffect(() => {
    const wasAuthenticated = previousAuthStateRef.current;
    const isNowAuthenticated = isAuthenticated;
    
    log('Auth state change detected:', {
      wasAuthenticated,
      isNowAuthenticated,
      userId: user?.id,
      autoLogin,
      autoLogout,
    });

    // User just logged in
    if (!wasAuthenticated && isNowAuthenticated && user?.id && autoLogin) {
      clearLoginTimeout();
      
      // Delay the login attempt to ensure OneSignal is ready
      loginTimeoutRef.current = setTimeout(() => {
        handleOneSignalLogin(user.id);
      }, loginDelay);
    }
    
    // User just logged out
    else if (wasAuthenticated && !isNowAuthenticated && autoLogout) {
      clearLoginTimeout();
      handleOneSignalLogout();
    }
    
    // Update previous state
    previousAuthStateRef.current = isNowAuthenticated;
  }, [isAuthenticated, user?.id, autoLogin, autoLogout, loginDelay]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearLoginTimeout();
      isProcessingRef.current = false;
    };
  }, []);

  // This component renders nothing - it only handles side effects
  return null;
}

/**
 * Higher-order component that wraps your app with authentication-aware push notification management
 * 
 * Usage:
 * ```tsx
 * function App() {
 *   return (
 *     <AuthProvider>
 *       <withAuthPushNotificationIntegration>
 *         <YourAppComponents />
 *       </withAuthPushNotificationIntegration>
 *     </AuthProvider>
 *   );
 * }
 * ```
 */
export function withAuthPushNotificationIntegration<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  integrationProps?: Partial<AuthPushNotificationIntegrationProps>
) {
  return function AuthPushNotificationIntegratedComponent(props: P) {
    return (
      <>
        <AuthPushNotificationIntegration {...integrationProps} />
        <WrappedComponent {...props} />
      </>
    );
  };
}

export default AuthPushNotificationIntegration;