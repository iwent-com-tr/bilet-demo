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
  onesignalUserId?: string;
  subscriptionHash?: string;
  deviceInfo?: DeviceInfo;
  error?: string;
}

export interface NotificationPermissionState {
  permission: NotificationPermission;
  canRequestPermission: boolean;
  requiresUserAction: boolean;
  isSupported: boolean;
}

class PushNotificationManager {
  private oneSignal: any = null;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;
  private subscriptionCallbacks: Array<(status: SubscriptionStatus) => void> = [];
  private permissionCallbacks: Array<(state: NotificationPermissionState) => void> = [];

  constructor() {
    this.detectEnvironment();
  }

  /**
   * Initialize OneSignal SDK
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this._initialize();
    return this.initPromise;
  }

  private async _initialize(): Promise<void> {
    try {
      // Check if OneSignal is supported
      if (!this.isPushNotificationSupported()) {
        throw new Error('Push notifications are not supported in this browser');
      }

      // Only initialize in development or on specific domains
      if (!this.shouldInitializeOneSignal()) {
        console.log('[PushManager] OneSignal initialization skipped for this environment');
        return;
      }

      // Wait for OneSignal to be available
      await this.waitForOneSignal();

      // Initialize OneSignal
      await window.OneSignal.init({
        appId: this.getOneSignalAppId(),
        allowLocalhostAsSecureOrigin: process.env.NODE_ENV === 'development',
        requiresUserPrivacyConsent: true, // Always require consent
        notificationClickHandlerAction: 'focus',
        notificationClickHandlerMatch: 'origin',
      });

      this.oneSignal = window.OneSignal;
      this.isInitialized = true;

      // Set up event listeners
      this.setupEventListeners();

      console.log('[PushManager] OneSignal initialized successfully');
    } catch (error) {
      console.error('[PushManager] Failed to initialize OneSignal:', error);
      throw error;
    }
  }

  /**
   * Request notification permission and subscribe user
   */
  async requestPermissionAndSubscribe(): Promise<SubscriptionStatus> {
    try {
      await this.initialize();

      if (!this.oneSignal) {
        throw new Error('OneSignal not initialized');
      }

      // Check if user has given marketing consent
      const hasMarketingConsent = this.checkMarketingConsent();
      if (!hasMarketingConsent) {
        throw new Error('Marketing consent required for push notifications');
      }

      // Provide user consent to OneSignal
      await this.oneSignal.provideUserConsent(true);

      // Request permission
      const permissionResult = await this.oneSignal.slideDown({
        prompting: {
          slideDown: {
            enabled: true,
            acceptButtonText: 'Allow',
            cancelButtonText: 'No Thanks',
            siteNameInPrompt: true,
          },
        },
      });

      if (!permissionResult) {
        throw new Error('Permission denied by user');
      }

      // Get subscription status
      const subscriptionStatus = await this.getSubscriptionStatus();
      
      if (subscriptionStatus.isSubscribed && subscriptionStatus.onesignalUserId) {
        // Sync with backend
        await this.syncWithBackend(subscriptionStatus.onesignalUserId);
      }

      // Notify callbacks
      this.notifySubscriptionCallbacks(subscriptionStatus);

      return subscriptionStatus;
    } catch (error) {
      console.error('[PushManager] Failed to request permission:', error);
      const errorStatus: SubscriptionStatus = {
        isSubscribed: false,
        permissionGranted: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      
      this.notifySubscriptionCallbacks(errorStatus);
      return errorStatus;
    }
  }

  /**
   * Get current subscription status
   */
  async getSubscriptionStatus(): Promise<SubscriptionStatus> {
    try {
      if (!this.isInitialized || !this.oneSignal) {
        return {
          isSubscribed: false,
          permissionGranted: false,
          error: 'OneSignal not initialized',
        };
      }

      const [isSubscribed, onesignalUserId, permissionGranted] = await Promise.all([
        this.oneSignal.isPushNotificationsEnabled(),
        this.oneSignal.getUserId(),
        this.oneSignal.getNotificationPermission() === 'granted',
      ]);

      const deviceInfo = this.detectDeviceInfo();

      return {
        isSubscribed,
        permissionGranted,
        onesignalUserId: onesignalUserId || undefined,
        deviceInfo,
      };
    } catch (error) {
      console.error('[PushManager] Failed to get subscription status:', error);
      return {
        isSubscribed: false,
        permissionGranted: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribe(): Promise<boolean> {
    try {
      if (!this.isInitialized || !this.oneSignal) {
        throw new Error('OneSignal not initialized');
      }

      await this.oneSignal.setSubscription(false);
      
      // Notify backend
      try {
        await axios.delete('/api/v1/push/subscription');
      } catch (error) {
        console.warn('[PushManager] Failed to notify backend about unsubscription:', error);
      }

      // Notify callbacks
      this.notifySubscriptionCallbacks({
        isSubscribed: false,
        permissionGranted: false,
      });

      return true;
    } catch (error) {
      console.error('[PushManager] Failed to unsubscribe:', error);
      return false;
    }
  }

  /**
   * Set user tags for segmentation
   */
  async setUserTags(tags: Record<string, string>): Promise<boolean> {
    try {
      if (!this.isInitialized || !this.oneSignal) {
        throw new Error('OneSignal not initialized');
      }

      // Set tags in OneSignal
      await this.oneSignal.sendTags(tags);

      // Update backend
      try {
        await axios.post('/api/v1/push/tags', { tags });
      } catch (error) {
        console.warn('[PushManager] Failed to sync tags with backend:', error);
      }

      return true;
    } catch (error) {
      console.error('[PushManager] Failed to set user tags:', error);
      return false;
    }
  }

  /**
   * Login user with external ID
   */
  async loginUser(externalUserId: string): Promise<boolean> {
    try {
      if (!this.isInitialized || !this.oneSignal) {
        throw new Error('OneSignal not initialized');
      }

      await this.oneSignal.login(externalUserId);
      
      // Set default tags
      const deviceInfo = this.detectDeviceInfo();
      await this.setUserTags({
        env: process.env.NODE_ENV === 'production' ? 'prod' : 'dev',
        browser: deviceInfo.browser.toLowerCase(),
        os: deviceInfo.os.toLowerCase(),
        device_type: deviceInfo.deviceType.toLowerCase(),
        pwa: deviceInfo.pwa.toString(),
      });

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
      if (!this.isInitialized || !this.oneSignal) {
        return true; // Not initialized, nothing to logout
      }

      await this.oneSignal.logout();
      return true;
    } catch (error) {
      console.error('[PushManager] Failed to logout user:', error);
      return false;
    }
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
   * Check if push notifications are supported
   */
  isPushNotificationSupported(): boolean {
    return (
      'Notification' in window &&
      'serviceWorker' in navigator &&
      'PushManager' in window
    );
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

  /**
   * Detect device information
   */
  detectDeviceInfo(): DeviceInfo {
    const userAgent = navigator.userAgent.toLowerCase();
    
    // Detect browser
    let browser: DeviceInfo['browser'] = 'OTHER';
    if (userAgent.includes('chrome') && !userAgent.includes('edg')) {
      browser = 'CHROME';
    } else if (userAgent.includes('firefox')) {
      browser = 'FIREFOX';
    } else if (userAgent.includes('safari') && !userAgent.includes('chrome')) {
      browser = 'SAFARI';
    } else if (userAgent.includes('edg')) {
      browser = 'EDGE';
    } else if (userAgent.includes('opera') || userAgent.includes('opr')) {
      browser = 'OPERA';
    }

    // Detect OS
    let os: DeviceInfo['os'] = 'OTHER';
    if (userAgent.includes('windows')) {
      os = 'WINDOWS';
    } else if (userAgent.includes('mac') && !userAgent.includes('iphone') && !userAgent.includes('ipad')) {
      os = 'MACOS';
    } else if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
      os = 'IOS';
    } else if (userAgent.includes('android')) {
      os = 'ANDROID';
    } else if (userAgent.includes('linux')) {
      os = 'LINUX';
    } else if (userAgent.includes('cros')) {
      os = 'CHROME_OS';
    }

    // Detect device type
    let deviceType: DeviceInfo['deviceType'] = 'DESKTOP';
    if (userAgent.includes('mobile')) {
      deviceType = 'MOBILE';
    } else if (userAgent.includes('tablet') || userAgent.includes('ipad')) {
      deviceType = 'TABLET';
    }

    return {
      browser,
      os,
      deviceType,
      pwa: this.isPWA(),
      userAgent: navigator.userAgent,
    };
  }

  // Private methods

  private detectEnvironment(): void {
    const hostname = window.location.hostname;
    const isDevelopment = (
      hostname === 'localhost' ||
      hostname.startsWith('192.168.') ||
      hostname.includes('dev.')
    );
    
    console.log('[PushManager] Environment:', {
      hostname,
      isDevelopment,
      protocol: window.location.protocol,
      isPWA: this.isPWA(),
    });
  }

  private shouldInitializeOneSignal(): boolean {
    const hostname = window.location.hostname;
    
    // Only initialize on HTTPS or localhost
    if (window.location.protocol !== 'https:' && hostname !== 'localhost') {
      return false;
    }

    // Check if OneSignal should be initialized for this domain
    const isDevelopment = (
      hostname === 'localhost' ||
      hostname.startsWith('192.168.') ||
      hostname.includes('dev.')
    );

    // In development, only initialize if explicitly enabled
    if (isDevelopment) {
      return process.env.NODE_ENV === 'development' && 
             process.env.REACT_APP_ENABLE_PUSH_NOTIFICATIONS === 'true';
    }

    // In production, initialize based on domain
    return hostname.includes('iwent.com.tr') || hostname.includes('bilet-demo.');
  }

  private getOneSignalAppId(): string {
    // Use development app ID for dev environment
    if (process.env.NODE_ENV === 'development') {
      return process.env.REACT_APP_ONESIGNAL_DEV_APP_ID || '6fb68b33-a968-4288-b0dd-5003baec3ce7';
    }
    
    // Use production app ID for production
    return process.env.REACT_APP_ONESIGNAL_PROD_APP_ID || '6fb68b33-a968-4288-b0dd-5003baec3ce7';
  }

  private async waitForOneSignal(): Promise<void> {
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
          reject(new Error('OneSignal SDK failed to load'));
          return;
        }
        
        setTimeout(checkOneSignal, 100);
      };
      
      checkOneSignal();
    });
  }

  private setupEventListeners(): void {
    if (!this.oneSignal) return;

    // Listen for subscription changes
    this.oneSignal.on('subscriptionChange', (isSubscribed: boolean) => {
      console.log('[PushManager] Subscription changed:', isSubscribed);
      this.handleSubscriptionChange();
    });

    // Listen for permission changes
    this.oneSignal.on('permissionChange', (permissionState: string) => {
      console.log('[PushManager] Permission changed:', permissionState);
      this.handlePermissionChange();
    });
  }

  private async handleSubscriptionChange(): Promise<void> {
    const status = await this.getSubscriptionStatus();
    this.notifySubscriptionCallbacks(status);
  }

  private handlePermissionChange(): void {
    const state = this.getPermissionState();
    this.notifyPermissionCallbacks(state);
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

  private notifyPermissionCallbacks(state: NotificationPermissionState): void {
    this.permissionCallbacks.forEach(callback => {
      try {
        callback(state);
      } catch (error) {
        console.error('[PushManager] Permission callback error:', error);
      }
    });
  }

  private checkMarketingConsent(): boolean {
    // Check if user has given marketing consent
    // This should be integrated with your consent management platform
    const consent = localStorage.getItem('marketing-consent');
    return consent === 'true';
  }

  private async syncWithBackend(onesignalUserId: string): Promise<void> {
    try {
      const deviceInfo = this.detectDeviceInfo();
      
      await axios.post('/api/v1/push/sync', {
        onesignalUserId,
        browser: deviceInfo.browser,
        os: deviceInfo.os,
        deviceType: deviceInfo.deviceType,
        pwa: deviceInfo.pwa,
      });
      
      console.log('[PushManager] Synced with backend successfully');
    } catch (error) {
      console.error('[PushManager] Failed to sync with backend:', error);
      throw error;
    }
  }
}

// Singleton instance
export const pushNotificationManager = new PushNotificationManager();

// Global types are declared elsewhere to avoid conflicts