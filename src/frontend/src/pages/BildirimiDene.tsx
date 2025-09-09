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
  }, []);

  const checkNotificationSupport = () => {
    const supported = 'Notification' in window && 
                     'serviceWorker' in navigator && 
                     'PushManager' in window &&
                     (window.isSecureContext || window.location.hostname === 'localhost');

    setStatus(prev => ({
      ...prev,
      supported,
      permission: supported ? Notification.permission : 'denied',
      error: supported ? undefined : 'Tarayıcınız push bildirimleri desteklemiyor'
    }));
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
      
      // Request permission using native browser API
      const permission = await Notification.requestPermission();
      console.log('[BildirimiDene] Permission result:', permission);

      if (permission === 'granted') {
        // Try to register service worker for push notifications
        await registerServiceWorker();
        
        setStatus(prev => ({ 
          ...prev, 
          permission, 
          subscribed: true 
        }));
        
        // Send a test notification immediately
        showTestNotification();
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

        // Register a simple service worker for push notifications
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        });
        
        console.log('[BildirimiDene] Service worker registered successfully');
        return registration;
      }
    } catch (error) {
      console.error('[BildirimiDene] Service worker registration failed:', error);
      throw error;
    }
  };

  const showTestNotification = () => {
    if (Notification.permission === 'granted') {
      console.log('[BildirimiDene] Showing test notification...');
      
      const notification = new Notification('🎉 Bildirimi Dene - Başarılı!', {
        body: 'Tebrikler! Push bildirimleri başarıyla çalışıyor. Bu test bildirimidir.',
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'bildirimi-dene-test',
        requireInteraction: false,
        silent: false
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      // Auto close after 5 seconds
      setTimeout(() => {
        notification.close();
      }, 5000);

      setTestResult('✅ Test bildirimi başarıyla gönderildi!');
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
    setStatus({
      supported: 'Notification' in window,
      permission: 'default',
      subscribed: false
    });
    setTestResult(null);
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
        </div>
      </div>
    </div>
  );
}

export default BildirimiDene;