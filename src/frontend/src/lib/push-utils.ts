/**
 * Push notification utility functions and constants
 * 
 * This module provides utility functions for push notifications,
 * browser detection, and error handling.
 * 
 * Requirements: 7.1, 7.3
 */

export interface NotificationError {
  code: string;
  message: string;
  userMessage: string;
  retryable: boolean;
}

/**
 * Error codes and their user-friendly messages
 */
export const PUSH_ERROR_CODES = {
  NOT_SUPPORTED: {
    code: 'NOT_SUPPORTED',
    message: 'Push notifications are not supported in this browser',
    userMessage: 'Your browser doesn\'t support push notifications. Please try using Chrome, Firefox, or Edge.',
    retryable: false,
  },
  PERMISSION_DENIED: {
    code: 'PERMISSION_DENIED',
    message: 'Notification permission was denied',
    userMessage: 'Please allow notifications in your browser settings to receive updates.',
    retryable: true,
  },
  SERVICE_WORKER_ERROR: {
    code: 'SERVICE_WORKER_ERROR',
    message: 'Service Worker registration failed',
    userMessage: 'There was a problem setting up notifications. Please try refreshing the page.',
    retryable: true,
  },
  SUBSCRIPTION_ERROR: {
    code: 'SUBSCRIPTION_ERROR',
    message: 'Failed to subscribe to push notifications',
    userMessage: 'We couldn\'t set up notifications. Please try again.',
    retryable: true,
  },
  NETWORK_ERROR: {
    code: 'NETWORK_ERROR',
    message: 'Network error occurred',
    userMessage: 'Please check your internet connection and try again.',
    retryable: true,
  },
  BACKEND_ERROR: {
    code: 'BACKEND_ERROR',
    message: 'Server error occurred',
    userMessage: 'There was a problem with our servers. Please try again later.',
    retryable: true,
  },
  UNAUTHORIZED: {
    code: 'UNAUTHORIZED',
    message: 'Authentication required',
    userMessage: 'Please log in to enable notifications.',
    retryable: true,
  },
} as const;

/**
 * Get user-friendly error information from error code
 */
export function getErrorInfo(code: string): NotificationError {
  const errorInfo = PUSH_ERROR_CODES[code as keyof typeof PUSH_ERROR_CODES];
  
  if (errorInfo) {
    return errorInfo;
  }
  
  // Default error for unknown codes
  return {
    code: 'UNKNOWN_ERROR',
    message: 'An unknown error occurred',
    userMessage: 'Something went wrong. Please try again.',
    retryable: true,
  };
}

/**
 * Check if the current browser/platform combination supports push notifications
 * Requirements: 7.1, 7.3
 */
export function checkPushSupport(): {
  supported: boolean;
  reason?: string;
  browserInfo: {
    name: string;
    version?: string;
    platform: string;
  };
} {
  const userAgent = navigator.userAgent.toLowerCase();
  
  // Detect browser and version
  let browserName = 'unknown';
  let browserVersion: string | undefined;
  
  if (userAgent.includes('chrome') && !userAgent.includes('edg')) {
    browserName = 'chrome';
    const match = userAgent.match(/chrome\/(\d+)/);
    browserVersion = match ? match[1] : undefined;
  } else if (userAgent.includes('firefox')) {
    browserName = 'firefox';
    const match = userAgent.match(/firefox\/(\d+)/);
    browserVersion = match ? match[1] : undefined;
  } else if (userAgent.includes('safari') && !userAgent.includes('chrome')) {
    browserName = 'safari';
    const match = userAgent.match(/version\/(\d+)/);
    browserVersion = match ? match[1] : undefined;
  } else if (userAgent.includes('edg')) {
    browserName = 'edge';
    const match = userAgent.match(/edg\/(\d+)/);
    browserVersion = match ? match[1] : undefined;
  }
  
  // Detect platform
  let platform = 'unknown';
  if (userAgent.includes('windows')) {
    platform = 'windows';
  } else if (userAgent.includes('macintosh') || userAgent.includes('mac os x')) {
    platform = 'macos';
  } else if (userAgent.includes('linux')) {
    platform = 'linux';
  } else if (userAgent.includes('android')) {
    platform = 'android';
  } else if (userAgent.includes('iphone') || userAgent.includes('ipad') || userAgent.includes('ipod')) {
    platform = 'ios';
  }
  
  const browserInfo = {
    name: browserName,
    version: browserVersion,
    platform,
  };
  
  // Check basic API support
  if (!('serviceWorker' in navigator)) {
    return {
      supported: false,
      reason: 'Service Worker not supported',
      browserInfo,
    };
  }
  
  if (!('PushManager' in window)) {
    return {
      supported: false,
      reason: 'Push Manager not supported',
      browserInfo,
    };
  }
  
  if (!('Notification' in window)) {
    return {
      supported: false,
      reason: 'Notifications not supported',
      browserInfo,
    };
  }
  
  // Check browser-specific support
  if (browserName === 'safari') {
    // Safari on iOS requires PWA to be installed to home screen (iOS 16.4+)
    if (platform === 'ios') {
      const version = browserVersion ? parseInt(browserVersion, 10) : 0;
      if (version < 16) {
        return {
          supported: false,
          reason: 'Safari on iOS requires version 16.4+ and PWA installation',
          browserInfo,
        };
      }
      
      // Check if running as PWA
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                          (window.navigator as any).standalone === true;
      
      if (!isStandalone) {
        return {
          supported: false,
          reason: 'Safari on iOS requires PWA to be installed to home screen',
          browserInfo,
        };
      }
    }
  }
  
  return {
    supported: true,
    browserInfo,
  };
}

/**
 * Format notification permission status for display
 */
export function formatPermissionStatus(permission: NotificationPermission): {
  status: NotificationPermission;
  label: string;
  description: string;
  canRequest: boolean;
} {
  switch (permission) {
    case 'granted':
      return {
        status: 'granted',
        label: 'Enabled',
        description: 'You will receive push notifications',
        canRequest: false,
      };
    case 'denied':
      return {
        status: 'denied',
        label: 'Blocked',
        description: 'Notifications are blocked. Enable them in browser settings.',
        canRequest: false,
      };
    case 'default':
      return {
        status: 'default',
        label: 'Not Set',
        description: 'Click to enable push notifications',
        canRequest: true,
      };
    default:
      return {
        status: 'default',
        label: 'Unknown',
        description: 'Permission status unknown',
        canRequest: true,
      };
  }
}

/**
 * Generate a unique identifier for the current browser/device
 * This can be used for analytics or debugging purposes
 */
export function generateDeviceId(): string {
  const userAgent = navigator.userAgent;
  const screen = `${window.screen.width}x${window.screen.height}`;
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const language = navigator.language;
  
  // Create a simple hash of device characteristics
  const deviceString = `${userAgent}-${screen}-${timezone}-${language}`;
  
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < deviceString.length; i++) {
    const char = deviceString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return Math.abs(hash).toString(36);
}

/**
 * Check if the current environment is localhost/development
 */
export function isDevelopment(): boolean {
  return (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.startsWith('192.168.') ||
    window.location.hostname.startsWith('10.') ||
    window.location.hostname.endsWith('.local')
  );
}

/**
 * Check if the current page is served over HTTPS
 * Push notifications require HTTPS (except for localhost)
 */
export function isSecureContext(): boolean {
  return window.isSecureContext || isDevelopment();
}

/**
 * Validate a push subscription object
 */
export function validatePushSubscription(subscription: any): boolean {
  if (!subscription || typeof subscription !== 'object') {
    return false;
  }
  
  if (!subscription.endpoint || typeof subscription.endpoint !== 'string') {
    return false;
  }
  
  if (!subscription.keys || typeof subscription.keys !== 'object') {
    return false;
  }
  
  if (!subscription.keys.p256dh || typeof subscription.keys.p256dh !== 'string') {
    return false;
  }
  
  if (!subscription.keys.auth || typeof subscription.keys.auth !== 'string') {
    return false;
  }
  
  return true;
}

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      // Exponential backoff with jitter
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

/**
 * Debounce function to prevent rapid successive calls
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Log push notification events for debugging
 */
export function logPushEvent(event: string, data?: any): void {
  if (isDevelopment()) {
    console.log(`[Push] ${event}`, data);
  }
  
  // In production, you might want to send this to an analytics service
  // or store it in localStorage for debugging
}