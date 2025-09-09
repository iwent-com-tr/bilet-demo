import React, { useState, useEffect } from 'react';
import './BildirimiDene.css';

interface NotificationStatus {
  supported: boolean;
  permission: NotificationPermission;
  subscribed: boolean;
  error?: string;
}

export function BildirimiDene() {
  const [status, setStatus] = useState<NotificationStatus>({
    supported: false,
    permission: 'default',
    subscribed: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  // Check notification support and permission on component mount
  useEffect(() => {
    checkNotificationSupport();
    checkExistingSubscription();
  }, []);

  const checkNotificationSupport = () => {
    const supported = 'Notification' in window && 
                     'serviceWorker' in navigator && 
                     'PushManager' in window &&
                     (window.isSecureContext || window.location.hostname === 'localhost');

    console.log('[BildirimiDene] Checking support:', {
      hasNotification: 'Notification' in window,
      hasServiceWorker: 'serviceWorker' in navigator,
      hasPushManager: 'PushManager' in window,
      isSecureContext: window.isSecureContext,
      permission: supported ? Notification.permission : 'denied'
    });

    setStatus(prev => ({
      ...prev,
      supported,
      permission: supported ? Notification.permission : 'denied',
      error: supported ? undefined : 'Tarayıcınız push bildirimleri desteklemiyor'
    }));
  };

  const checkExistingSubscription = async () => {
    try {
      // Check if we have a stored subscription state
      const storedSubscription = localStorage.getItem('bildirimi-dene-subscription');
      if (storedSubscription) {
        const subscriptionData = JSON.parse(storedSubscription);
        console.log('[BildirimiDene] Found stored subscription:', subscriptionData);
        
        // Verify the subscription is still valid
        if (Notification.permission === 'granted') {
          const registration = await navigator.serviceWorker.getRegistration();
          if (registration) {
            setStatus(prev => ({
              ...prev,
              subscribed: true,
              permission: 'granted'
            }));
            return;
          }
        }
        
        // Clear invalid stored subscription
        localStorage.removeItem('bildirimi-dene-subscription');
      }
      
      // Check current permission state
      if (Notification.permission === 'granted') {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          setStatus(prev => ({
            ...prev,
            subscribed: true,
            permission: 'granted'
          }));
        }
      }
    } catch (error) {
      console.error('[BildirimiDene] Error checking existing subscription:', error);
    }
  };

  const requestNotificationPermission = async () => {
    if (!status.supported) {
      setStatus(prev => ({ ...prev, error: 'Bildirimler desteklenmiyor' }));
      return;
    }

    setIsLoading(true);
    setStatus(prev => ({ ...prev, error: undefined }));

    try {
      console.log('[BildirimiDene] Requesting notification permission...');
      
      // For Safari/iOS, we need to be more careful with service worker registration
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
      
      console.log('[BildirimiDene] Platform detection:', { isIOS, isSafari });
      
      // Request permission using native browser API
      const permission = await Notification.requestPermission();
      console.log('[BildirimiDene] Permission result:', permission);

      if (permission === 'granted') {
        // Try to register service worker for push notifications
        let registration;
        try {
          registration = await registerServiceWorker();
        } catch (swError) {
          console.warn('[BildirimiDene] Service worker registration failed, continuing with basic notifications:', swError);
          // For Safari/iOS, we can still show basic notifications without service worker
          if (isIOS || isSafari) {
            console.log('[BildirimiDene] Using basic notifications for Safari/iOS');
            registration = null;
          } else {
            throw swError;
          }
        }
        
        const subscriptionData = {
          granted: true,
          timestamp: Date.now(),
          platform: isIOS ? 'ios' : isSafari ? 'safari' : 'other',
          hasServiceWorker: !!registration
        };
        
        // Store subscription state for persistence
        localStorage.setItem('bildirimi-dene-subscription', JSON.stringify(subscriptionData));
        
        setStatus(prev => ({ 
          ...prev, 
          permission, 
          subscribed: true 
        }));
        
        // Send a test notification immediately
        setTimeout(() => {
          showTestNotification();
        }, 500);
      } else {
        setStatus(prev => ({ 
          ...prev, 
          permission,
          error: permission === 'denied' ? 'Bildirim izni reddedildi' : 'Bildirim izni verilmedi'
        }));
      }
    } catch (error) {
      console.error('[BildirimiDene] Permission request failed:', error);
      setStatus(prev => ({ 
        ...prev, 
        error: 'İzin isteme başarısız: ' + (error instanceof Error ? error.message : 'Bilinmeyen hata')
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const registerServiceWorker = async () => {
    try {
      if ('serviceWorker' in navigator) {
        console.log('[BildirimiDene] Registering service worker...');
        
        // Check if we already have a service worker
        const existingRegistration = await navigator.serviceWorker.getRegistration();
        if (existingRegistration) {
          console.log('[BildirimiDene] Service worker already registered');
          return existingRegistration;
        }

        // For Safari, try a more conservative approach
        const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
        
        if (isSafari) {
          console.log('[BildirimiDene] Safari detected, using conservative SW registration');
          // Safari is stricter about service worker paths and timing
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Register a simple service worker for push notifications
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        });
        
        // Wait for the service worker to be ready
        await navigator.serviceWorker.ready;
        
        console.log('[BildirimiDene] Service worker registered successfully');
        return registration;
      } else {
        console.warn('[BildirimiDene] Service Worker not supported');
        return null;
      }
    } catch (error) {
      console.error('[BildirimiDene] Service worker registration failed:', error);
      // Don't throw the error for Safari/iOS - they can work without SW for basic notifications
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      
      if (isSafari || isIOS) {
        console.log('[BildirimiDene] Continuing without service worker for Safari/iOS');
        return null;
      }
      
      throw error;
    }
  };

  const showTestNotification = () => {
    if (Notification.permission !== 'granted') {
      console.warn('[BildirimiDene] Cannot show notification - permission not granted');
      setTestResult('❌ Bildirim izni verilmemiş');
      return;
    }

    try {
      console.log('[BildirimiDene] Showing test notification...');
      
      // Enhanced notification options for better cross-platform support
      const notificationOptions = {
        body: 'Tebrikler! Push bildirimleri başarıyla çalışıyor. Bu test bildirimidir.',
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'bildirimi-dene-test',
        requireInteraction: false,
        silent: false,
        vibrate: [200, 100, 200], // For Android
        renotify: true // Ensure notification shows even if tag exists
      };
      
      const notification = new Notification('🎉 Bildirimi Dene - Başarılı!', notificationOptions);

      notification.onclick = () => {
        console.log('[BildirimiDene] Notification clicked');
        window.focus();
        notification.close();
      };

      notification.onerror = (error) => {
        console.error('[BildirimiDene] Notification error:', error);
        setTestResult('❌ Bildirim gösterilirken hata oluştu');
      };

      notification.onshow = () => {
        console.log('[BildirimiDene] Notification shown successfully');
        setTestResult('✅ Test bildirimi başarıyla gönderildi!');
      };

      // Auto close after 5 seconds
      setTimeout(() => {
        if (notification) {
          notification.close();
        }
      }, 5000);

    } catch (error) {
      console.error('[BildirimiDene] Failed to show notification:', error);
      setTestResult('❌ Bildirim gösterilirken hata: ' + (error instanceof Error ? error.message : 'Bilinmeyen hata'));
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

  const resetNotifications = () => {
    // Clear stored subscription data
    localStorage.removeItem('bildirimi-dene-subscription');
    
    setStatus({
      supported: 'Notification' in window,
      permission: 'default',
      subscribed: false
    });
    setTestResult(null);
    
    // Unregister service worker if it exists
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(registration => {
          console.log('[BildirimiDene] Unregistering service worker');
          registration.unregister();
        });
      }).catch(error => {
        console.warn('[BildirimiDene] Error unregistering service workers:', error);
      });
    }
    
    checkNotificationSupport();
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
              <span>{status.subscribed ? 'Abone Olundu' : 'Abone Olunmadı'}</span>
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
          {status.permission === 'default' && status.supported && (
            <button
              onClick={requestNotificationPermission}
              disabled={isLoading}
              className="bildirimi-dene__button bildirimi-dene__button--primary"
            >
              {isLoading ? '⏳ İşleniyor...' : '🔔 Bildirimleri Etkinleştir'}
            </button>
          )}

          {status.subscribed && (
            <div className="bildirimi-dene__test-actions">
              <button
                onClick={showTestNotification}
                className="bildirimi-dene__button bildirimi-dene__button--success"
              >
                📱 Yerel Test Bildirimi
              </button>
              
              <button
                onClick={sendServerNotification}
                disabled={isLoading}
                className="bildirimi-dene__button bildirimi-dene__button--accent"
              >
                {isLoading ? '📤 Gönderiliyor...' : '🚀 Server Test Bildirimi'}
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
              <div><strong>Stored Subscription:</strong> {localStorage.getItem('bildirimi-dene-subscription') ? 'Yes' : 'No'}</div>
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