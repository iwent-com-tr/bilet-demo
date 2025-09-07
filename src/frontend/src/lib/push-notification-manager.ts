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
  externalUserId?: string;        // External ID currently set
  isLoggedIn?: boolean;           // Whether user is logged into OneSignal
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
  private currentExternalUserId: string | null = null;
  private loginPromise: Promise<boolean> | null = null;

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
      console.log('[PushManager] Starting initialization...');
      
      // Check if OneSignal is supported
      const isSupported = this.isPushNotificationSupported();
      console.log('[PushManager] Push notification support check:', {
        isSupported,
        hasNotification: 'Notification' in window,
        hasServiceWorker: 'serviceWorker' in navigator,
        hasPushManager: 'PushManager' in window
      });
      
      if (!isSupported) {
        throw new Error('Push notifications are not supported in this browser');
      }

      // Check if we should initialize OneSignal for this environment
      const shouldInit = this.shouldInitializeOneSignal();
      console.log('[PushManager] Should initialize OneSignal:', shouldInit);
      
      if (!shouldInit) {
        console.log('[PushManager] OneSignal initialization skipped for this environment');
        // Mark as initialized but with limited functionality
        this.isInitialized = true;
        return;
      }

      // Wait for OneSignal to be available
      console.log('[PushManager] Waiting for OneSignal to be available...');
      await this.waitForOneSignal();
      console.log('[PushManager] OneSignal is available');

      // Initialize OneSignal
      const appId = this.getOneSignalAppId();
      console.log('[PushManager] Initializing OneSignal with App ID:', appId);
      
      await window.OneSignal.init({
        appId: appId,
        allowLocalhostAsSecureOrigin: true, // Allow localhost for testing
        requiresUserPrivacyConsent: false, // Changed to false for demo purposes
        notificationClickHandlerAction: 'focus',
        notificationClickHandlerMatch: 'origin',
        autoRegister: false, // We'll handle registration manually
        autoResubscribe: true,
        serviceWorkerPath: '/OneSignalSDKWorker.js',
        serviceWorkerUpdaterPath: '/OneSignalSDKUpdaterWorker.js',
        path: '/OneSignalSDKWorker.js'
      });

      this.oneSignal = window.OneSignal;
      this.isInitialized = true;

      // Set up event listeners
      this.setupEventListeners();

      console.log('[PushManager] OneSignal initialized successfully');
    } catch (error) {
      console.error('[PushManager] Failed to initialize OneSignal:', error);
      // Don't throw the error, just mark as failed initialization
      this.isInitialized = false;
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

      // For demo purposes, skip marketing consent check
      // const hasMarketingConsent = this.checkMarketingConsent();
      // if (!hasMarketingConsent) {
      //   throw new Error('Marketing consent required for push notifications');
      // }

      // Provide user consent to OneSignal (not needed if requiresUserPrivacyConsent is false)
      // await this.oneSignal.provideUserConsent(true);

      // Request permission using the simpler method
      const permissionResult = await this.oneSignal.requestPermission();

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
      if (!this.isInitialized) {
        console.log('[PushManager] OneSignal not initialized yet');
        return {
          isSubscribed: false,
          permissionGranted: false,
          externalUserId: this.currentExternalUserId || undefined,
          isLoggedIn: false,
          error: 'OneSignal not initialized',
        };
      }

      if (!this.oneSignal) {
        console.log('[PushManager] OneSignal instance not available');
        return {
          isSubscribed: false,
          permissionGranted: false,
          externalUserId: this.currentExternalUserId || undefined,
          isLoggedIn: false,
          error: 'OneSignal instance not available',
        };
      }

      const [isSubscribed, onesignalUserId, permissionGranted, externalUserId] = await Promise.all([
        this.oneSignal.isPushNotificationsEnabled(),
        this.oneSignal.getUserId(),
        this.oneSignal.getNotificationPermission() === 'granted',
        this.oneSignal.getExternalUserId(),
      ]);

      const deviceInfo = this.detectDeviceInfo();
      const isLoggedIn = !!externalUserId;

      // Update local state with the actual external user ID from OneSignal
      if (externalUserId && externalUserId !== this.currentExternalUserId) {
        this.currentExternalUserId = externalUserId;
      }

      return {
        isSubscribed,
        permissionGranted,
        onesignalUserId: onesignalUserId || undefined,
        deviceInfo,
        externalUserId: externalUserId || this.currentExternalUserId || undefined,
        isLoggedIn,
      };
    } catch (error) {
      console.error('[PushManager] Failed to get subscription status:', error);
      return {
        isSubscribed: false,
        permissionGranted: false,
        externalUserId: this.currentExternalUserId || undefined,
        isLoggedIn: false,
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
    // Prevent concurrent login attempts
    if (this.loginPromise) {
      console.log('[PushManager] Login already in progress, waiting...');
      return this.loginPromise;
    }

    // If already logged in with the same external ID, return success
    if (this.currentExternalUserId === externalUserId) {
      console.log('[PushManager] Already logged in with the same external ID');
      return true;
    }

    this.loginPromise = this._performLogin(externalUserId);
    const result = await this.loginPromise;
    this.loginPromise = null;
    return result;
  }

  /**
   * Perform the actual login operation
   */
  private async _performLogin(externalUserId: string): Promise<boolean> {
    try {
      if (!this.isInitialized) {
        console.log('[PushManager] Initializing OneSignal before login...');
        await this.initialize();
      }

      if (!this.oneSignal) {
        throw new Error('OneSignal not initialized');
      }

      console.log('[PushManager] Logging in user with external ID:', externalUserId);
      
      // Login with external ID
      await this.oneSignal.login(externalUserId);
      this.currentExternalUserId = externalUserId;
      
      // Set default user tags for segmentation
      const deviceInfo = this.detectDeviceInfo();
      await this.setUserTags({
        env: process.env.NODE_ENV === 'production' ? 'prod' : 'dev',
        browser: deviceInfo.browser.toLowerCase(),
        os: deviceInfo.os.toLowerCase(),
        device_type: deviceInfo.deviceType.toLowerCase(),
        pwa: deviceInfo.pwa.toString(),
        user_id: externalUserId,
        last_login: new Date().toISOString(),
      });

      // Sync with backend
      try {
        const subscriptionStatus = await this.getSubscriptionStatus();
        if (subscriptionStatus.isSubscribed && subscriptionStatus.onesignalUserId) {
          await this.syncWithBackend(subscriptionStatus.onesignalUserId, externalUserId);
        }
      } catch (syncError) {
        console.warn('[PushManager] Failed to sync with backend after login:', syncError);
        // Don't fail the login if backend sync fails
      }

      console.log('[PushManager] User logged in successfully with external ID:', externalUserId);
      return true;
    } catch (error) {
      console.error('[PushManager] Failed to login user:', error);
      this.currentExternalUserId = null;
      return false;
    }
  }

  /**
   * Logout user
   */
  async logoutUser(): Promise<boolean> {
    try {
      if (!this.isInitialized || !this.oneSignal) {
        console.log('[PushManager] OneSignal not initialized, clearing local state');
        this.currentExternalUserId = null;
        return true;
      }

      const previousExternalId = this.currentExternalUserId;
      console.log('[PushManager] Logging out user with external ID:', previousExternalId);
      
      // Logout from OneSignal
      await this.oneSignal.logout();
      this.currentExternalUserId = null;
      
      // Clear user-specific tags
      try {
        await this.oneSignal.sendTags({
          user_id: '',
          last_login: '',
        });
      } catch (tagError) {
        console.warn('[PushManager] Failed to clear user tags on logout:', tagError);
      }
      
      // Notify backend about logout
      try {
        await axios.post('/api/v1/push/logout');
      } catch (backendError) {
        console.warn('[PushManager] Failed to notify backend about logout:', backendError);
      }

      console.log('[PushManager] User logged out successfully');
      return true;
    } catch (error) {
      console.error('[PushManager] Failed to logout user:', error);
      // Clear local state even if OneSignal logout fails
      this.currentExternalUserId = null;
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
   * Check if user is currently logged in to OneSignal
   */
  isUserLoggedIn(): boolean {
    return !!this.currentExternalUserId;
  }

  /**
   * Get current external user ID
   */
  getCurrentExternalUserId(): string | null {
    return this.currentExternalUserId;
  }

  /**
   * Auto-login user if authenticated but not logged into OneSignal
   */
  async autoLoginIfAuthenticated(externalUserId: string): Promise<boolean> {
    try {
      // Only auto-login if not already logged in with the same ID
      if (this.currentExternalUserId === externalUserId) {
        return true;
      }

      // Auto-initialize if needed
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Only login if OneSignal is properly initialized
      if (this.isInitialized && this.oneSignal) {
        return await this.loginUser(externalUserId);
      }

      return false;
    } catch (error) {
      console.error('[PushManager] Auto-login failed:', error);
      return false;
    }
  }

  /**
   * Ensure user is logged in with correct external ID
   */
  async ensureUserLogin(externalUserId: string): Promise<boolean> {
    try {
      const currentStatus = await this.getSubscriptionStatus();
      
      // If already logged in with the correct external ID, nothing to do
      if (currentStatus.isLoggedIn && currentStatus.externalUserId === externalUserId) {
        return true;
      }

      // Login with the correct external ID
      return await this.loginUser(externalUserId);
    } catch (error) {
      console.error('[PushManager] Failed to ensure user login:', error);
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
    
    console.log('[PushManager] shouldInitializeOneSignal check:', {
      hostname,
      nodeEnv: process.env.NODE_ENV,
      appId: process.env.REACT_APP_ONESIGNAL_APP_ID,
      enablePushNotifications: process.env.REACT_APP_ENABLE_PUSH_NOTIFICATIONS
    });
    
    // Skip in development unless explicitly enabled
    if (process.env.NODE_ENV === 'development') {
      const isEnabled = process.env.REACT_APP_ENABLE_PUSH_NOTIFICATIONS === 'true';
      if (!isEnabled) {
        console.log('[PushManager] OneSignal disabled in development. Set REACT_APP_ENABLE_PUSH_NOTIFICATIONS=true to enable.');
        return false;
      }
    }

    // Always initialize if we have an App ID (for localhost testing in production builds)
    const hasAppId = !!process.env.REACT_APP_ONESIGNAL_APP_ID;
    if (hasAppId) {
      console.log('[PushManager] OneSignal enabled - App ID found');
      return true;
    }

    // In production, also check for production domains
    const isProductionDomain = hostname.includes('iwent.com.tr') || hostname.includes('bilet-demo.');
    
    return isProductionDomain;
  }

  private getOneSignalAppId(): string {
    // Use the standard environment variable
    return process.env.REACT_APP_ONESIGNAL_APP_ID || '6fb68b33-a968-4288-b0dd-5003baec3ce7';
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

  private async syncWithBackend(onesignalUserId: string, externalUserId?: string): Promise<void> {
    try {
      const deviceInfo = this.detectDeviceInfo();
      
      await axios.post('/api/v1/push/sync', {
        onesignalUserId,
        browser: deviceInfo.browser,
        os: deviceInfo.os,
        deviceType: deviceInfo.deviceType,
        pwa: deviceInfo.pwa,
        externalUserId: externalUserId || this.currentExternalUserId,
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