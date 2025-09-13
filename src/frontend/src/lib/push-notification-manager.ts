import axios from 'axios';

// Types
export interface DeviceInfo {
  browser: 'CHROME' | 'SAFARI' | 'FIREFOX' | 'EDGE' | 'OPERA' | 'OTHER';
  os: 'IOS' | 'ANDROID' | 'MACOS' | 'WINDOWS' | 'LINUX' | 'CHROME_OS' | 'OTHER';
  deviceType: 'DESKTOP' | 'MOBILE' | 'TABLET';
  pwa: boolean;
  userAgent?: string;
}

export interface SubscriptionStatus {
  isSubscribed: boolean;
  permissionGranted: boolean;
  subscriptionEndpoint?: string;
  subscriptionHash?: string;
  deviceInfo?: DeviceInfo;
  externalUserId?: string;
  isLoggedIn?: boolean;
  error?: string;
}

export interface NotificationPermissionState {
  permission: NotificationPermission;
  canRequestPermission: boolean;
  requiresUserAction: boolean;
  isSupported: boolean;
}

class PushNotificationManager {
  private subscription: PushSubscription | null = null;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;
  private subscriptionCallbacks: Array<(status: SubscriptionStatus) => void> = [];
  private permissionCallbacks: Array<(state: NotificationPermissionState) => void> = [];
  private currentExternalUserId: string | null = null;
  private vapidPublicKey: string | null = null;

  constructor() {
    this.detectEnvironment();
  }

  /**
   * Initialize VAPID-based push notifications
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this._initialize();
    return this.initPromise;
  }

  private async _initialize(): Promise<void> {
    try {
      console.log('[PushManager] Starting VAPID initialization...');
      
      // Check if push notifications are supported
      const isSupported = this.isPushNotificationSupported();
      console.log('[PushManager] Push notification support check:', {
        isSupported,
        hasNotification: 'Notification' in window,
        hasServiceWorker: 'serviceWorker' in navigator,
        hasPushManager: 'PushManager' in window,
        userAgent: navigator.userAgent,
        isMobile: /Mobile|Android|iPhone|iPad/.test(navigator.userAgent),
        isSecureContext: window.isSecureContext,
        protocol: window.location.protocol,
        hostname: window.location.hostname
      });
      
      if (!isSupported) {
        throw new Error('Push notifications are not supported in this browser');
      }

      // Get VAPID public key from backend
      await this.loadVapidPublicKey();
      
      // Register service worker
      await this.registerServiceWorker();
      
      // Check existing subscription
      await this.checkExistingSubscription();
      
      this.isInitialized = true;
      console.log('[PushManager] VAPID push notifications initialized successfully');
      
    } catch (error) {
      console.error('[PushManager] Failed to initialize VAPID push notifications:', error);
      this.isInitialized = false;
      throw error;
    }
  }

  /**
   * Load VAPID public key from backend
   */
  private async loadVapidPublicKey(): Promise<void> {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/push/vapid-public-key`);
      this.vapidPublicKey = response.data.publicKey;
      console.log('[PushManager] VAPID public key loaded');
    } catch (error) {
      console.error('[PushManager] Failed to load VAPID public key:', error);
      throw new Error('Failed to load VAPID configuration');
    }
  }

  /**
   * Register service worker for push notifications
   */
  private async registerServiceWorker(): Promise<ServiceWorkerRegistration> {
    if (!('serviceWorker' in navigator)) {
      throw new Error('Service Worker not supported');
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('[PushManager] Service worker registered successfully');
      return registration;
    } catch (error) {
      console.error('[PushManager] Service worker registration failed:', error);
      throw error;
    }
  }

  /**
   * Check for existing push subscription
   */
  private async checkExistingSubscription(): Promise<void> {
    try {
      const registration = await navigator.serviceWorker.ready;
      this.subscription = await registration.pushManager.getSubscription();
      
      if (this.subscription) {
        console.log('[PushManager] Found existing subscription');
        // Sync with backend
        await this.syncSubscriptionWithBackend();
      }
    } catch (error) {
      console.error('[PushManager] Error checking existing subscription:', error);
    }
  }

  /**
   * Request notification permission and subscribe user
   */
  async requestPermissionAndSubscribe(): Promise<SubscriptionStatus> {
    try {
      console.log('[PushManager] Starting permission request and subscription process...');
      
      await this.initialize();

      // Check if browser supports push notifications
      if (!this.isPushNotificationSupported()) {
        throw new Error('Push notifications are not supported on this device/browser');
      }

      // Check current permission state
      const currentPermission = Notification.permission;
      console.log('[PushManager] Current permission state:', currentPermission);

      if (currentPermission === 'denied') {
        throw new Error('Notification permission was denied. Please enable notifications in your browser settings.');
      }

      // Request permission if not granted
      let permission: NotificationPermission = currentPermission;
      if (permission === 'default') {
        permission = await Notification.requestPermission();
      }

      if (permission !== 'granted') {
        throw new Error('Notification permission not granted');
      }

      // Subscribe to push notifications
      await this.subscribeToPushNotifications();
      
      const status = await this.getSubscriptionStatus();
      this.notifySubscriptionCallbacks(status);
      
      return status;
      
    } catch (error) {
      console.error('[PushManager] Permission request failed:', error);
      const errorStatus: SubscriptionStatus = {
        isSubscribed: false,
        permissionGranted: false,
        error: error instanceof Error ? error.message : 'Permission request failed'
      };
      
      this.notifySubscriptionCallbacks(errorStatus);
      return errorStatus;
    }
  }

  /**
   * Subscribe to push notifications using VAPID
   */
  private async subscribeToPushNotifications(): Promise<void> {
    if (!this.vapidPublicKey) {
      throw new Error('VAPID public key not available');
    }

    const registration = await navigator.serviceWorker.ready;
    
    const subscribeOptions = {
      userVisibleOnly: true,
      applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey)
    };

    this.subscription = await registration.pushManager.subscribe(subscribeOptions);
    console.log('[PushManager] Successfully subscribed to push notifications');
    
    // Sync with backend
    await this.syncSubscriptionWithBackend();
  }

  /**
   * Sync subscription with backend
   */
  private async syncSubscriptionWithBackend(): Promise<void> {
    if (!this.subscription) {
      throw new Error('No active subscription to sync');
    }

    try {
      const deviceInfo = this.detectDeviceInfo();
      const subscriptionData = {
        subscription: this.subscription.toJSON(),
        userAgent: navigator.userAgent,
        deviceInfo
      };

      await axios.post(`${process.env.REACT_APP_API_URL}/push/subscribe`, subscriptionData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      console.log('[PushManager] Synced subscription with backend successfully');
    } catch (error) {
      console.error('[PushManager] Failed to sync subscription with backend:', error);
      throw error;
    }
  }

  /**
   * Convert VAPID key from base64 to Uint8Array
   */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
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
   * Get current subscription status
   */
  async getSubscriptionStatus(): Promise<SubscriptionStatus> {
    const permission = Notification.permission;
    const isSubscribed = !!this.subscription;
    
    return {
      isSubscribed,
      permissionGranted: permission === 'granted',
      subscriptionEndpoint: this.subscription?.endpoint,
      deviceInfo: this.detectDeviceInfo(),
      externalUserId: this.currentExternalUserId || undefined,
      isLoggedIn: !!this.currentExternalUserId
    };
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribe(): Promise<boolean> {
    try {
      if (this.subscription) {
        // Unsubscribe from browser
        await this.subscription.unsubscribe();
        
        // Remove from backend
        await axios.post(`${process.env.REACT_APP_API_URL}/push/unsubscribe`, {
          endpoint: this.subscription.endpoint
        }, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        this.subscription = null;
        console.log('[PushManager] Successfully unsubscribed from push notifications');
      }
      
      const status = await this.getSubscriptionStatus();
      this.notifySubscriptionCallbacks(status);
      
      return true;
    } catch (error) {
      console.error('[PushManager] Failed to unsubscribe:', error);
      return false;
    }
  }

  /**
   * Login user (associate external user ID)
   */
  async loginUser(userId: string): Promise<boolean> {
    try {
      this.currentExternalUserId = userId;
      
      // If subscribed, update backend with user association
      if (this.subscription) {
        await this.syncSubscriptionWithBackend();
      }
      
      console.log('[PushManager] User logged in:', userId);
      return true;
    } catch (error) {
      console.error('[PushManager] Failed to login user:', error);
      return false;
    }
  }

  /**
   * Logout user
   */
  async logoutUser(): Promise<boolean> {
    try {
      this.currentExternalUserId = null;
      console.log('[PushManager] User logged out');
      return true;
    } catch (error) {
      console.error('[PushManager] Failed to logout user:', error);
      return false;
    }
  }

  /**
   * Set user tags (for segmentation)
   */
  async setTags(tags: Record<string, string>): Promise<boolean> {
    try {
      await axios.post(`${process.env.REACT_APP_API_URL}/push/tags`, {
        tags
      }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      console.log('[PushManager] Tags updated successfully');
      return true;
    } catch (error) {
      console.error('[PushManager] Failed to set tags:', error);
      return false;
    }
  }

  /**
   * Check if push notifications are supported
   */
  isPushNotificationSupported(): boolean {
    return (
      'Notification' in window &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      window.isSecureContext
    );
  }

  /**
   * Detect device and browser information
   */
  detectDeviceInfo(): DeviceInfo {
    const userAgent = navigator.userAgent;
    
    // Detect browser
    let browser: DeviceInfo['browser'] = 'OTHER';
    if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) browser = 'CHROME';
    else if (userAgent.includes('Firefox')) browser = 'FIREFOX';
    else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) browser = 'SAFARI';
    else if (userAgent.includes('Edg')) browser = 'EDGE';
    else if (userAgent.includes('Opera')) browser = 'OPERA';
    
    // Detect OS
    let os: DeviceInfo['os'] = 'OTHER';
    if (userAgent.includes('Win')) os = 'WINDOWS';
    else if (userAgent.includes('Mac')) os = 'MACOS';
    else if (userAgent.includes('Linux')) os = 'LINUX';
    else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) os = 'IOS';
    else if (userAgent.includes('Android')) os = 'ANDROID';
    else if (userAgent.includes('CrOS')) os = 'CHROME_OS';
    
    // Detect device type
    let deviceType: DeviceInfo['deviceType'] = 'DESKTOP';
    if (/Mobile|Android|iPhone/.test(userAgent)) deviceType = 'MOBILE';
    else if (/iPad|Tablet/.test(userAgent)) deviceType = 'TABLET';
    
    // Detect PWA
    const pwa = window.matchMedia('(display-mode: standalone)').matches ||
                (window.navigator as any).standalone === true;
    
    return {
      browser,
      os,
      deviceType,
      pwa,
      userAgent
    };
  }

  /**
   * Detect environment for debugging
   */
  private detectEnvironment(): void {
    const hostname = window.location.hostname;
    const isDevelopment = process.env.NODE_ENV === 'development';
    const isProduction = process.env.NODE_ENV === 'production';
    
    console.log('[PushManager] Environment detection:', {
      hostname,
      isDevelopment,
      isProduction,
      protocol: window.location.protocol,
      isSecureContext: window.isSecureContext
    });
  }

  // Helper methods for external user ID
  getCurrentExternalUserId(): string | null {
    return this.currentExternalUserId;
  }

  isUserLoggedIn(): boolean {
    return !!this.currentExternalUserId;
  }

  async ensureUserLogin(userId: string): Promise<boolean> {
    return this.loginUser(userId);
  }

  async autoLoginIfAuthenticated(userId: string): Promise<boolean> {
    return this.loginUser(userId);
  }

  // Subscription callbacks
  addSubscriptionCallback(callback: (status: SubscriptionStatus) => void): void {
    this.subscriptionCallbacks.push(callback);
  }

  removeSubscriptionCallback(callback: (status: SubscriptionStatus) => void): void {
    const index = this.subscriptionCallbacks.indexOf(callback);
    if (index > -1) {
      this.subscriptionCallbacks.splice(index, 1);
    }
  }

  private notifySubscriptionCallbacks(status: SubscriptionStatus): void {
    this.subscriptionCallbacks.forEach(callback => {
      try {
        callback(status);
      } catch (error) {
        console.error('[PushManager] Subscription callback error:', error);
      }
    });
  }

  // Permission callbacks
  addPermissionCallback(callback: (state: NotificationPermissionState) => void): void {
    this.permissionCallbacks.push(callback);
  }

  removePermissionCallback(callback: (state: NotificationPermissionState) => void): void {
    const index = this.permissionCallbacks.indexOf(callback);
    if (index > -1) {
      this.permissionCallbacks.splice(index, 1);
    }
  }

  private notifyPermissionCallbacks(state: NotificationPermissionState): void {
    this.permissionCallbacks.forEach(callback => {
      try {
        callback(state);
      } catch (error) {
        console.error('[PushManager] Permission callback error:', error);
      }
    });
  }

  /**
   * Get notification permission state
   */
  getPermissionState(): NotificationPermissionState {
    const isSupported = this.isPushNotificationSupported();
    const permission = isSupported ? Notification.permission : 'denied';
    const isIOS = this.detectDeviceInfo().os === 'IOS';
    const isPWA = this.isPWA();
    
    return {
      permission: permission as NotificationPermission,
      canRequestPermission: permission === 'default',
      requiresUserAction: true, // Always require user action for GDPR compliance
      isSupported: isSupported && (!isIOS || isPWA), // iOS only supports push in PWA
    };
  }

  /**
   * Subscribe to subscription status changes
   */
  onSubscriptionChange(callback: (status: SubscriptionStatus) => void): () => void {
    this.subscriptionCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.subscriptionCallbacks.indexOf(callback);
      if (index > -1) {
        this.subscriptionCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Subscribe to permission state changes
   */
  onPermissionChange(callback: (state: NotificationPermissionState) => void): () => void {
    this.permissionCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.permissionCallbacks.indexOf(callback);
      if (index > -1) {
        this.permissionCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Check if running as PWA
   */
  isPWA(): boolean {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches ||
      // @ts-ignore
      window.navigator.standalone === true
    );
  }
}

// Singleton instance
export const pushNotificationManager = new PushNotificationManager();