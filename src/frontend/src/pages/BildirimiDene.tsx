import React, { useState, useEffect } from 'react';
import './BildirimiDene.css';
import { pushNotificationManager, type SubscriptionResult, type BrowserSupport } from '../lib/push-notification-manager';

interface NotificationStatus {
  supported: boolean;
  permission: NotificationPermission;
  subscribed: boolean;
  vapidSubscribed: boolean;
  error?: string;
  vapidEndpoint?: string;
  browserInfo?: BrowserSupport;
}

export function BildirimiDene() {
  const [status, setStatus] = useState<NotificationStatus>({
    supported: false,
    permission: 'default',
    subscribed: false,
    vapidSubscribed: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  // Using singleton push notification manager
  const pushManager = pushNotificationManager;

  // Check notification support and permission on component mount
  useEffect(() => {
    checkNotificationSupport();
    checkExistingVapidSubscription();
  }, []);

  const checkNotificationSupport = () => {
    const browserSupport = pushManager.getBrowserSupport();
    const permission = pushManager.getPermissionStatus();

    console.log('[BildirimiDene] Browser support check:', {
      browserSupport,
      permission,
      isAndroid: /Android/.test(navigator.userAgent)
    });

    setStatus(prev => ({
      ...prev,
      supported: browserSupport.isSupported,
      permission,
      browserInfo: browserSupport,
      error: browserSupport.isSupported ? undefined : 'Tarayıcınız VAPID push bildirimleri desteklemiyor'
    }));
  };

  const checkExistingVapidSubscription = async () => {
    try {
      console.log('[BildirimiDene] Checking existing VAPID subscription...');
      
      // Get current VAPID subscription status
      const subscriptionInfo = await pushManager.getSubscriptionInfo();
      
      console.log('[BildirimiDene] Subscription info:', {
        permission: subscriptionInfo.permission,
        hasSubscription: subscriptionInfo.hasSubscription,
        endpoint: subscriptionInfo.subscription?.endpoint,
        backendSubscriptions: subscriptionInfo.backendSubscriptions?.length || 0
      });
      
      setStatus(prev => ({
        ...prev,
        permission: subscriptionInfo.permission,
        subscribed: subscriptionInfo.permission === 'granted',
        vapidSubscribed: subscriptionInfo.hasSubscription,
        vapidEndpoint: subscriptionInfo.subscription?.endpoint,
        browserInfo: subscriptionInfo.browserSupport
      }));
      
    } catch (error) {
      console.error('[BildirimiDene] Error checking VAPID subscription:', error);
      setStatus(prev => ({ 
        ...prev, 
        error: 'VAPID abonelik kontrolü başarısız: ' + (error instanceof Error ? error.message : 'Bilinmeyen hata')
      }));
    }
  };

  const requestVapidSubscription = async () => {
    if (!status.supported) {
      setStatus(prev => ({ ...prev, error: 'VAPID push bildirimleri desteklenmiyor' }));
      return;
    }

    setIsLoading(true);
    setStatus(prev => ({ ...prev, error: undefined }));
    setTestResult(null);

    try {
      console.log('[BildirimiDene] Starting VAPID subscription process...');
      
      const isAndroid = /Android/.test(navigator.userAgent);
      console.log('[BildirimiDene] Platform detection:', { 
        isAndroid,
        userAgent: navigator.userAgent 
      });
      
      // Use pushNotificationManager for proper VAPID subscription
      const result: SubscriptionResult = await pushManager.subscribe();
      
      console.log('[BildirimiDene] VAPID subscription result:', result);

      if (result.success && result.subscription) {
        setStatus(prev => ({ 
          ...prev, 
          permission: 'granted',
          subscribed: true,
          vapidSubscribed: true,
          vapidEndpoint: result.subscription?.endpoint
        }));
        
        setTestResult('✅ VAPID push subscription başarılı! Android bildirimleri artık çalışmalı.');
        
        // Send a test push notification through backend
        setTimeout(() => {
          sendVapidTestNotification();
        }, 1000);
      } else {
        const errorMsg = result.error || 'VAPID abonelik başarısız';
        setStatus(prev => ({ 
          ...prev,
          error: errorMsg
        }));
        setTestResult(`❌ VAPID abonelik hatası: ${errorMsg}`);
      }
    } catch (error) {
      console.error('[BildirimiDene] VAPID subscription failed:', error);
      const errorMsg = 'VAPID abonelik başarısız: ' + (error instanceof Error ? error.message : 'Bilinmeyen hata');
      setStatus(prev => ({ 
        ...prev, 
        error: errorMsg
      }));
      setTestResult(`❌ ${errorMsg}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Service worker registration is now handled by PushSubscriptionManager

  const sendVapidTestNotification = async () => {
    setIsLoading(true);

    try {
      console.log('[BildirimiDene] Sending VAPID test notification through backend...');
      
      const response = await fetch('/api/v1/push/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          title: 'VAPID Test - Android Uyumlu 🤖',
          body: 'Bu VAPID push bildirimidir. Android cihazlarda çalışmalıdır!',
          url: '/bildirimi-dene'
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setTestResult(`✅ VAPID push bildirimi gönderildi! Android cihazlarda görünmelidir.`);
      } else {
        setTestResult(`❌ VAPID bildirim hatası: ${result.error || 'Bilinmeyen hata'}`);
      }
    } catch (error) {
      console.error('[BildirimiDene] VAPID notification failed:', error);
      setTestResult(`❌ VAPID bildirim ağ hatası: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const showBasicTestNotification = () => {
    if (Notification.permission !== 'granted') {
      console.warn('[BildirimiDene] Cannot show notification - permission not granted');
      setTestResult('❌ Bildirim izni verilmemiş');
      return;
    }

    try {
      console.log('[BildirimiDene] Showing basic test notification...');
      
      // Basic notification for browsers that don't support VAPID properly
      const notificationOptions = {
        body: 'Bu temel tarayıcı bildirimidir. Android cihazlarda VAPID push bildirimi kullanın.',
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'bildirimi-dene-basic',
        requireInteraction: false,
        silent: false,
        vibrate: [200, 100, 200],
        renotify: true
      };
      
      const notification = new Notification('📱 Temel Bildirim Testi', notificationOptions);

      notification.onclick = () => {
        console.log('[BildirimiDene] Basic notification clicked');
        window.focus();
        notification.close();
      };

      notification.onshow = () => {
        console.log('[BildirimiDene] Basic notification shown successfully');
        setTestResult('✅ Temel bildirim test başarılı (Android için VAPID kullanın)');
      };

      notification.onerror = (error) => {
        console.error('[BildirimiDene] Basic notification error:', error);
        setTestResult('❌ Temel bildirim hatası');
      };

      // Auto close after 5 seconds
      setTimeout(() => {
        if (notification) {
          notification.close();
        }
      }, 5000);

    } catch (error) {
      console.error('[BildirimiDene] Failed to show basic notification:', error);
      setTestResult('❌ Temel bildirim hatası: ' + (error instanceof Error ? error.message : 'Bilinmeyen hata'));
    }
  };

  const sendServerNotification = async () => {
    setIsLoading(true);
    setTestResult(null);

    try {
      console.log('[BildirimiDene] Sending server notification...');
      
      const response = await fetch('/api/v1/admin/push/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          title: 'Bildirimi Dene - Server Test 🚀',
          body: 'Bu sunucudan gönderilen test bildirimidir. Sistem çalışıyor!',
          testMode: true,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        const notificationId = result.data?.id || result.id || 'server-test-' + Date.now();
        setTestResult(`✅ Server bildirimi başarıyla gönderildi! ID: ${notificationId}`);
      } else {
        setTestResult(`❌ Server hatası: ${result.error || 'Bilinmeyen hata'}`);
      }
    } catch (error) {
      console.error('[BildirimiDene] Server notification failed:', error);
      setTestResult(`❌ Ağ hatası: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const resetNotifications = async () => {
    setIsLoading(true);
    setTestResult(null);
    
    try {
      console.log('[BildirimiDene] Resetting VAPID notifications...');
      
      // Unsubscribe from VAPID push notifications
      const unsubscribeResult = await pushManager.unsubscribe();
      
      console.log('[BildirimiDene] Unsubscribe result:', unsubscribeResult);
      
      // Clear stored subscription data
      localStorage.removeItem('iwent-push-subscription');
      
      // Reset status
      setStatus({
        supported: false,
        permission: 'default',
        subscribed: false,
        vapidSubscribed: false
      });
      
      // Re-check support
      checkNotificationSupport();
      await checkExistingVapidSubscription();
      
      setTestResult('🔄 VAPID bildirimleri sıfırlandı');
      
    } catch (error) {
      console.error('[BildirimiDene] Error resetting notifications:', error);
      setTestResult(`❌ Sıfırlama hatası: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bildirimi-dene">
      <div className="bildirimi-dene__container">
        <header className="bildirimi-dene__header">
          <h1 className="bildirimi-dene__title">🔔 Bildirimi Dene</h1>
          <p className="bildirimi-dene__description">
            Push bildirimlerini test edin ve çalışıp çalışmadığını kontrol edin.
          </p>
        </header>

        {/* System Status */}
        <div className="bildirimi-dene__status">
          <h2>Sistem Durumu</h2>
          <div className="bildirimi-dene__status-grid">
            <div className={`bildirimi-dene__status-item ${status.supported ? 'success' : 'error'}`}>
              <span className="bildirimi-dene__status-icon">
                {status.supported ? '✅' : '❌'}
              </span>
              <span>Push Bildirimleri {status.supported ? 'Destekleniyor' : 'Desteklenmiyor'}</span>
            </div>
            
            <div className={`bildirimi-dene__status-item ${
              status.permission === 'granted' ? 'success' : 
              status.permission === 'denied' ? 'error' : 'warning'
            }`}>
              <span className="bildirimi-dene__status-icon">
                {status.permission === 'granted' ? '✅' : 
                 status.permission === 'denied' ? '❌' : '❓'}
              </span>
              <span>İzin: {
                status.permission === 'granted' ? 'Verildi' :
                status.permission === 'denied' ? 'Reddedildi' : 'Bekliyor'
              }</span>
            </div>

            <div className={`bildirimi-dene__status-item ${status.subscribed ? 'success' : 'error'}`}>
              <span className="bildirimi-dene__status-icon">
                {status.subscribed ? '✅' : '❌'}
              </span>
              <span>{status.subscribed ? 'Temel İzin Verildi' : 'Temel İzin Verilmedi'}</span>
            </div>
            
            <div className={`bildirimi-dene__status-item ${status.vapidSubscribed ? 'success' : 'error'}`}>
              <span className="bildirimi-dene__status-icon">
                {status.vapidSubscribed ? '✅' : '❌'}
              </span>
              <span>{status.vapidSubscribed ? 'VAPID Abone (Android Uyumlu)' : 'VAPID Abone Değil'}</span>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {status.error && (
          <div className="bildirimi-dene__error">
            <h3>⚠️ Hata</h3>
            <p>{status.error}</p>
            
            {status.permission === 'denied' && (
              <div className="bildirimi-dene__help">
                <p><strong>Bildirimleri etkinleştirmek için:</strong></p>
                <ol>
                  <li>Tarayıcınızın adres çubuğundaki kilit simgesine tıklayın</li>
                  <li>Bildirimler için "İzin Ver" seçeneğini seçin</li>
                  <li>"Sıfırla" butonuna tıklayın</li>
                </ol>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="bildirimi-dene__actions">
          {(!status.vapidSubscribed && status.supported) && (
            <button
              onClick={requestVapidSubscription}
              disabled={isLoading}
              className="bildirimi-dene__button bildirimi-dene__button--primary"
            >
              {isLoading ? '⏳ VAPID Abonelik...' : '🤖 Android VAPID Push Etkinleştir'}
            </button>
          )}

          {status.vapidSubscribed && (
            <div className="bildirimi-dene__test-actions">
              <button
                onClick={sendVapidTestNotification}
                disabled={isLoading}
                className="bildirimi-dene__button bildirimi-dene__button--success"
              >
                {isLoading ? '📤 VAPID Gönderiliyor...' : '🤖 VAPID Push Test (Android)'}
              </button>
              
              <button
                onClick={showBasicTestNotification}
                className="bildirimi-dene__button bildirimi-dene__button--accent"
              >
                📱 Temel Bildirim Testi
              </button>
            </div>
          )}

          <button
            onClick={resetNotifications}
            className="bildirimi-dene__button bildirimi-dene__button--secondary"
          >
            🔄 Sıfırla
          </button>
        </div>

        {/* Test Result */}
        {testResult && (
          <div className={`bildirimi-dene__result ${
            testResult.startsWith('✅') ? 'success' : 'error'
          }`}>
            <h3>Test Sonucu</h3>
            <p>{testResult}</p>
          </div>
        )}

        {/* Instructions */}
        <div className="bildirimi-dene__instructions">
          <h3>Nasıl Test Edilir:</h3>
          <ol>
            <li>"Bildirimleri Etkinleştir" butonuna tıklayın</li>
            <li>Tarayıcı izin istediğinde "İzin Ver" seçeneğini seçin</li>
            <li>"Yerel Test Bildirimi" ile tarayıcı bildirimi test edin</li>
            <li>"Server Test Bildirimi" ile backend entegrasyonunu test edin</li>
          </ol>
          
          <div className="bildirimi-dene__note">
            <strong>Not:</strong> Bu test bileşeni OneSignal kullanmadan doğrudan browser API'leri ile çalışır.
            HTTPS bağlantı veya localhost gereklidir.
          </div>

          {/* Platform-specific information */}
          <div className="bildirimi-dene__platform-info">
            <h4>Platform Bilgileri:</h4>
            <div className="bildirimi-dene__debug-info">
              <div><strong>User Agent:</strong> {navigator.userAgent}</div>
              <div><strong>Platform:</strong> {navigator.platform}</div>
              <div><strong>Is iOS:</strong> {/iPad|iPhone|iPod/.test(navigator.userAgent) ? 'Yes' : 'No'}</div>
              <div><strong>Is Safari:</strong> {/^((?!chrome|android).)*safari/i.test(navigator.userAgent) ? 'Yes' : 'No'}</div>
              <div><strong>Is PWA:</strong> {window.matchMedia('(display-mode: standalone)').matches ? 'Yes' : 'No'}</div>
              <div><strong>Service Worker Support:</strong> {'serviceWorker' in navigator ? 'Yes' : 'No'}</div>
              <div><strong>Notification Support:</strong> {'Notification' in window ? 'Yes' : 'No'}</div>
              <div><strong>Push Manager Support:</strong> {'PushManager' in window ? 'Yes' : 'No'}</div>
              <div><strong>Secure Context:</strong> {window.isSecureContext ? 'Yes' : 'No'}</div>
              <div><strong>Stored Subscription:</strong> {localStorage.getItem('iwent-push-subscription') ? 'Yes' : 'No'}</div>
            </div>
          </div>
        </div>

        {/* Platform-specific troubleshooting */}
        {(() => {
          const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
          const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
          const isAndroid = /Android/.test(navigator.userAgent);
          const isPWA = window.matchMedia('(display-mode: standalone)').matches;
          
          if (isIOS && !isPWA) {
            return (
              <div className="bildirimi-dene__troubleshooting bildirimi-dene__troubleshooting--ios">
                <h3>📱 iOS Kullanıcıları İçin</h3>
                <p>iOS'ta push bildirimlerin çalışması için:</p>
                <ol>
                  <li>Bu sayfayı Ana Ekran'a ekleyin (Safari {'>'}  Paylaş {'>'} Ana Ekrana Ekle)</li>
                  <li>PWA olarak açılan uygulamada bildirimleri etkinleştirin</li>
                  <li>Safari'de doğrudan çalışmayabilir</li>
                </ol>
              </div>
            );
          }
          
          if (isSafari && !isIOS) {
            return (
              <div className="bildirimi-dene__troubleshooting bildirimi-dene__troubleshooting--safari">
                <h3>🦀 Safari Kullanıcıları İçin</h3>
                <p>Safari'de sorun yaşıyorsanız:</p>
                <ol>
                  <li>Safari {'>'} Tercihler {'>'} Web Siteleri {'>'} Bildirimler'i kontrol edin</li>
                  <li>Chrome veya Firefox ile deneyin</li>
                  <li>Sayfa yüklenme sorunu varsa, sayfa kaynağını görüntüleyin</li>
                </ol>
              </div>
            );
          }
          
          if (isAndroid) {
            return (
              <div className="bildirimi-dene__troubleshooting bildirimi-dene__troubleshooting--android">
                <h3>🤖 Android Kullanıcıları İçin</h3>
                <p>Android'de bildirimler çalışmıyorsa:</p>
                <ol>
                  <li>Tarayıcı ayarlarından bildirim izinlerini kontrol edin</li>
                  <li>Android sistem ayarlarından tarayıcı bildirimlerini etkinleştirin</li>
                  <li>Chrome tarayıcısı kullanmayı deneyin</li>
                  <li>Cihazın sesini ve titroşimi kontrol edin</li>
                </ol>
              </div>
            );
          }
          
          return null;
        })()}
      </div>
    </div>
  );
}

export default BildirimiDene;