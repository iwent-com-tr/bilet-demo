import axios from 'axios';

/**
 * PushSubscriptionManager - Utility class for managing Web Push subscriptions
 * 
 * This class handles:
 * - Browser compatibility checks and feature detection
 * - Push notification permission management
 * - Subscription registration and management with the backend
 * - VAPID key conversion utilities
 * 
 * Requirements: 3.1, 7.1, 7.3
 */
export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  expirationTime?: number | null;
}

export interface SubscriptionResult {
  success: boolean;
  subscription?: PushSubscriptionData;
  error?: string;
  code?: string;
}

export interface BrowserSupport {
  isSupported: boolean;
  hasServiceWorker: boolean;
  hasPushManager: boolean;
  hasNotifications: boolean;
  platform: 'desktop' | 'mobile' | 'unknown';
  browser: string;
  version?: string;
}

export class PushSubscriptionManager {
  private vapidPublicKey: string | null = null;
  private serviceWorkerRegistration: ServiceWorkerRegistration | null = null;
  private readonly apiBaseUrl: string;

  constructor(apiBaseUrl: string = '/api/v1') {
    this.apiBaseUrl = apiBaseUrl;
  }

  /**
   * Check if push notifications are supported in the current browser
   * Requirements: 7.1, 7.3
   */
  getBrowserSupport(): BrowserSupport {
    const hasServiceWorker = 'serviceWorker' in navigator;
    const hasPushManager = 'PushManager' in window;
    const hasNotifications = 'Notification' in window;
    
    // Detect platform
    const userAgent = navigator.userAgent.toLowerCase();
    let platform: 'desktop' | 'mobile' | 'unknown' = 'unknown';
    if (/mobile|android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent)) {
      platform = 'mobile';
    } else if (/windows|macintosh|linux/i.test(userAgent)) {
      platform = 'desktop';
    }

    // Detect browser
    let browser = 'unknown';
    let version: string | undefined;
    
    if (userAgent.includes('chrome') && !userAgent.includes('edg')) {
      browser = 'chrome';
      const match = userAgent.match(/chrome\/(\d+)/);
      version = match ? match[1] : undefined;
    } else if (userAgent.includes('firefox')) {
      browser = 'firefox';
      const match = userAgent.match(/firefox\/(\d+)/);
      version = match ? match[1] : undefined;
    } else if (userAgent.includes('safari') && !userAgent.includes('chrome')) {
      browser = 'safari';
      const match = userAgent.match(/version\/(\d+)/);
      version = match ? match[1] : undefined;
    } else if (userAgent.includes('edg')) {
      browser = 'edge';
      const match = userAgent.match(/edg\/(\d+)/);
      version = match ? match[1] : undefined;
    }

    const isSupported = hasServiceWorker && hasPushManager && hasNotifications;

    return {
      isSupported,
      hasServiceWorker,
      hasPushManager,
      hasNotifications,
      platform,
      browser,
      version,
    };
  }

  /**
   * Check if push notifications are supported
   * Requirements: 7.1, 7.3
   */
  isSupported(): boolean {
    return this.getBrowserSupport().isSupported;
  }

  /**
   * Get the current notification permission status
   * Requirements: 3.1
   */
  getPermissionStatus(): NotificationPermission {
    if (!('Notification' in window)) {
      return 'denied';
    }
    return Notification.permission;
  }

  /**
   * Request notification permission from the user
   * Requirements: 3.1
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      throw new Error('Notifications not supported');
    }

    if (Notification.permission === 'granted') {
      return 'granted';
    }

    if (Notification.permission === 'denied') {
      return 'denied';
    }

    // Request permission
    const permission = await Notification.requestPermission();
    return permission;
  }

  /**
   * Initialize the service worker registration
   * Requirements: 7.1
   */
  async initializeServiceWorker(): Promise<ServiceWorkerRegistration> {
    if (!('serviceWorker' in navigator)) {
      throw new Error('Service Worker not supported');
    }

    if (this.serviceWorkerRegistration) {
      return this.serviceWorkerRegistration;
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      
      // Wait for the service worker to be ready
      await navigator.serviceWorker.ready;
      
      this.serviceWorkerRegistration = registration;
      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      throw new Error('Failed to register Service Worker');
    }
  }

  /**
   * Fetch the VAPID public key from the server
   * Requirements: 3.1
   */
  async getVapidPublicKey(): Promise<string> {
    if (this.vapidPublicKey) {
      return this.vapidPublicKey;
    }

    try {
      const response = await axios.get(`${this.apiBaseUrl}/push/public-key`, {
        withCredentials: true,
      });
      
      if (!response.data.publicKey) {
        throw new Error('Invalid VAPID public key response');
      }

      this.vapidPublicKey = response.data.publicKey;
      return response.data.publicKey;
    } catch (error) {
      console.error('Error fetching VAPID public key:', error);
      
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to fetch VAPID public key: ${error.response?.status || error.message}`);
      }
      
      throw new Error('Failed to get VAPID public key');
    }
  }

  /**
   * Convert VAPID public key from base64 to Uint8Array
   * Requirements: 7.1
   */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  /**
   * Get the current push subscription
   * Requirements: 3.1
   */
  async getCurrentSubscription(): Promise<PushSubscription | null> {
    if (!this.isSupported()) {
      return null;
    }

    try {
      const registration = await this.initializeServiceWorker();
      return await registration.pushManager.getSubscription();
    } catch (error) {
      console.error('Error getting current subscription:', error);
      return null;
    }
  }

  /**
   * Subscribe to push notifications
   * Requirements: 3.1, 7.1
   */
  async subscribe(): Promise<SubscriptionResult> {
    try {
      // Check browser support
      if (!this.isSupported()) {
        return {
          success: false,
          error: 'Push notifications not supported in this browser',
          code: 'NOT_SUPPORTED',
        };
      }

      // Check permission
      const permission = await this.requestPermission();
      if (permission !== 'granted') {
        return {
          success: false,
          error: 'Notification permission denied',
          code: 'PERMISSION_DENIED',
        };
      }

      // Initialize service worker
      const registration = await this.initializeServiceWorker();

      // Check if already subscribed
      const existingSubscription = await registration.pushManager.getSubscription();
      if (existingSubscription) {
        const subscriptionData = this.convertSubscriptionToData(existingSubscription);
        
        // Register with backend
        const registerResult = await this.registerWithBackend(subscriptionData);
        if (registerResult.success) {
          return {
            success: true,
            subscription: subscriptionData,
          };
        } else {
          return registerResult;
        }
      }

      // Get VAPID public key
      const vapidPublicKey = await this.getVapidPublicKey();
      const applicationServerKey = this.urlBase64ToUint8Array(vapidPublicKey);

      // Subscribe to push manager
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });

      const subscriptionData = this.convertSubscriptionToData(subscription);

      // Register with backend
      const registerResult = await this.registerWithBackend(subscriptionData);
      if (registerResult.success) {
        return {
          success: true,
          subscription: subscriptionData,
        };
      } else {
        // If backend registration fails, unsubscribe from push manager
        try {
          await subscription.unsubscribe();
        } catch (unsubError) {
          console.error('Error unsubscribing after backend failure:', unsubError);
        }
        return registerResult;
      }
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        code: 'SUBSCRIPTION_ERROR',
      };
    }
  }

  /**
   * Unsubscribe from push notifications
   * Requirements: 3.1
   */
  async unsubscribe(): Promise<SubscriptionResult> {
    try {
      if (!this.isSupported()) {
        return {
          success: false,
          error: 'Push notifications not supported',
          code: 'NOT_SUPPORTED',
        };
      }

      const registration = await this.initializeServiceWorker();
      const subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        return {
          success: true, // Already unsubscribed
        };
      }

      const subscriptionData = this.convertSubscriptionToData(subscription);

      // Unsubscribe from push manager
      const unsubscribed = await subscription.unsubscribe();
      
      if (!unsubscribed) {
        return {
          success: false,
          error: 'Failed to unsubscribe from push manager',
          code: 'UNSUBSCRIBE_ERROR',
        };
      }

      // Unregister from backend
      const unregisterResult = await this.unregisterFromBackend(subscriptionData.endpoint);
      
      return unregisterResult;
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        code: 'UNSUBSCRIBE_ERROR',
      };
    }
  }

  /**
   * Convert PushSubscription to PushSubscriptionData
   * Requirements: 7.1
   */
  private convertSubscriptionToData(subscription: PushSubscription): PushSubscriptionData {
    const p256dhKey = subscription.getKey('p256dh');
    const authKey = subscription.getKey('auth');
    
    if (!p256dhKey || !authKey) {
      throw new Error('Invalid subscription keys');
    }

    return {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: this.arrayBufferToBase64(p256dhKey),
        auth: this.arrayBufferToBase64(authKey),
      },
      expirationTime: subscription.expirationTime,
    };
  }

  /**
   * Convert ArrayBuffer to base64 string
   * Requirements: 7.1
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  /**
   * Register subscription with backend
   * Requirements: 3.1
   */
  private async registerWithBackend(subscriptionData: PushSubscriptionData): Promise<SubscriptionResult> {
    try {
      const response = await axios.post(`${this.apiBaseUrl}/push/subscribe`, {
        subscription: subscriptionData,
        userAgent: navigator.userAgent,
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
        withCredentials: true, // Include cookies for authentication
      });

      return {
        success: true,
        subscription: subscriptionData,
      };
    } catch (error) {
      console.error('Error registering with backend:', error);
      
      if (axios.isAxiosError(error)) {
        const errorData = error.response?.data || {};
        return {
          success: false,
          error: errorData.error || `HTTP ${error.response?.status}`,
          code: errorData.code || 'BACKEND_ERROR',
        };
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
        code: 'NETWORK_ERROR',
      };
    }
  }

  /**
   * Unregister subscription from backend
   * Requirements: 3.1
   */
  private async unregisterFromBackend(endpoint: string): Promise<SubscriptionResult> {
    try {
      await axios.delete(`${this.apiBaseUrl}/push/unsubscribe`, {
        headers: {
          'Content-Type': 'application/json',
        },
        withCredentials: true, // Include cookies for authentication
        data: {
          endpoint,
        },
      });

      return {
        success: true,
      };
    } catch (error) {
      console.error('Error unregistering from backend:', error);
      
      if (axios.isAxiosError(error)) {
        const errorData = error.response?.data || {};
        return {
          success: false,
          error: errorData.error || `HTTP ${error.response?.status}`,
          code: errorData.code || 'BACKEND_ERROR',
        };
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
        code: 'NETWORK_ERROR',
      };
    }
  }

  /**
   * Get user's push subscriptions from backend
   * Requirements: 3.1
   */
  async getUserSubscriptions(): Promise<{
    success: boolean;
    subscriptions?: Array<{
      id: string;
      endpoint: string;
      enabled: boolean;
      userAgent?: string;
      createdAt: string;
      lastSeenAt: string;
    }>;
    error?: string;
    code?: string;
  }> {
    try {
      const response = await axios.get(`${this.apiBaseUrl}/push/subscriptions`, {
        withCredentials: true, // Include cookies for authentication
      });

      return {
        success: true,
        subscriptions: response.data.subscriptions,
      };
    } catch (error) {
      console.error('Error getting user subscriptions:', error);
      
      if (axios.isAxiosError(error)) {
        const errorData = error.response?.data || {};
        return {
          success: false,
          error: errorData.error || `HTTP ${error.response?.status}`,
          code: errorData.code || 'BACKEND_ERROR',
        };
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
        code: 'NETWORK_ERROR',
      };
    }
  }

  /**
   * Test if the current subscription is still valid
   * Requirements: 3.1
   */
  async testSubscription(): Promise<{
    success: boolean;
    isValid?: boolean;
    error?: string;
  }> {
    try {
      const subscription = await this.getCurrentSubscription();
      
      if (!subscription) {
        return {
          success: true,
          isValid: false,
        };
      }

      // Try to get user subscriptions to test if backend connection works
      const result = await this.getUserSubscriptions();
      
      if (!result.success) {
        return {
          success: false,
          error: result.error,
        };
      }

      // Check if current subscription exists in backend
      const currentEndpoint = subscription.endpoint;
      const isValid = result.subscriptions?.some(sub => sub.endpoint === currentEndpoint && sub.enabled) || false;

      return {
        success: true,
        isValid,
      };
    } catch (error) {
      console.error('Error testing subscription:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get detailed information about the current subscription and browser support
   * Requirements: 7.1, 7.3
   */
  async getSubscriptionInfo(): Promise<{
    browserSupport: BrowserSupport;
    permission: NotificationPermission;
    hasSubscription: boolean;
    subscription?: PushSubscriptionData;
    backendSubscriptions?: Array<{
      id: string;
      endpoint: string;
      enabled: boolean;
      userAgent?: string;
      createdAt: string;
      lastSeenAt: string;
    }>;
  }> {
    const browserSupport = this.getBrowserSupport();
    const permission = this.getPermissionStatus();
    
    let hasSubscription = false;
    let subscription: PushSubscriptionData | undefined;
    let backendSubscriptions: any[] | undefined;

    if (browserSupport.isSupported && permission === 'granted') {
      const currentSub = await this.getCurrentSubscription();
      if (currentSub) {
        hasSubscription = true;
        subscription = this.convertSubscriptionToData(currentSub);
      }

      // Get backend subscriptions
      const backendResult = await this.getUserSubscriptions();
      if (backendResult.success) {
        backendSubscriptions = backendResult.subscriptions;
      }
    }

    return {
      browserSupport,
      permission,
      hasSubscription,
      subscription,
      backendSubscriptions,
    };
  }
}

// Export a default instance
export const pushSubscriptionManager = new PushSubscriptionManager(process.env.REACT_APP_API_URL || '/api/v1');