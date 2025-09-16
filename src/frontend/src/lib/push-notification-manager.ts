import axios from 'axios';

// Types compatible with PushSubscriptionManager
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

class PushNotificationManager {
  private vapidPublicKey: string | null = null;
  private serviceWorkerRegistration: ServiceWorkerRegistration | null = null;
  private readonly apiBaseUrl: string;

  constructor(apiBaseUrl: string = process.env.REACT_APP_API_URL || '/api/v1') {
    this.apiBaseUrl = apiBaseUrl;
  }

  /**
   * Check if push notifications are supported in the current browser
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

    const isSupported = hasServiceWorker && hasPushManager && hasNotifications && window.isSecureContext;

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
   */
  isSupported(): boolean {
    return this.getBrowserSupport().isSupported;
  }

  /**
   * Get the current notification permission status
   */
  getPermissionStatus(): NotificationPermission {
    if (!('Notification' in window)) {
      return 'denied';
    }
    return Notification.permission;
  }

  /**
   * Request notification permission from the user
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
   */
  async getVapidPublicKey(): Promise<string> {
    if (this.vapidPublicKey) {
      return this.vapidPublicKey;
    }

    try {
      const response = await axios.get(`${this.apiBaseUrl}/push/public-key`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
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
   * Subscribe to push notifications - main method that BildirimiDene.tsx expects
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
   */
  private async registerWithBackend(subscriptionData: PushSubscriptionData): Promise<SubscriptionResult> {
    try {
      const response = await axios.post(`${this.apiBaseUrl}/push/subscribe`, {
        subscription: subscriptionData,
        userAgent: navigator.userAgent,
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
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
   */
  private async unregisterFromBackend(endpoint: string): Promise<SubscriptionResult> {
    try {
      await axios.delete(`${this.apiBaseUrl}/push/unsubscribe`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
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
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
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
   * Get detailed information about the current subscription and browser support
   * Compatible with the BildirimiDene.tsx expectations
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

// Export a default instance compatible with the working system
export const pushNotificationManager = new PushNotificationManager();

// Also export the class for direct instantiation if needed
export { PushNotificationManager };