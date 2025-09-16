/**
 * NotificationPermissionPrompt Component
 * 
 * A user-friendly component that prompts users to enable push notifications.
 * Includes clear messaging, browser compatibility checks, and retry mechanisms.
 * 
 * Requirements: 3.1, 3.3
 */

import React, { useState, useEffect } from 'react';
import { pushSubscriptionManager } from '../../lib/push-subscription-manager';
import { checkPushSupport, formatPermissionStatus, getErrorInfo } from '../../lib/push-utils';
import './NotificationPermissionPrompt.css';

interface NotificationPermissionPromptProps {
  onPermissionGranted?: () => void;
  onPermissionDenied?: () => void;
  onError?: (error: string, code: string) => void;
  showCloseButton?: boolean;
  onClose?: () => void;
  className?: string;
}

const NotificationPermissionPrompt: React.FC<NotificationPermissionPromptProps> = ({
  onPermissionGranted,
  onPermissionDenied,
  onError,
  showCloseButton = true,
  onClose,
  className = '',
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [browserSupport, setBrowserSupport] = useState<ReturnType<typeof checkPushSupport> | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    // Check browser support and current permission status
    const support = checkPushSupport();
    setBrowserSupport(support);
    
    if (support.supported) {
      const currentPermission = pushSubscriptionManager.getPermissionStatus();
      setPermission(currentPermission);
    }
  }, []);

  const handleEnableNotifications = async () => {
    if (!browserSupport?.supported) {
      const errorInfo = getErrorInfo('NOT_SUPPORTED');
      setError(errorInfo.userMessage);
      setErrorCode(errorInfo.code);
      onError?.(errorInfo.userMessage, errorInfo.code);
      return;
    }

    setIsLoading(true);
    setError(null);
    setErrorCode(null);

    try {
      // Request permission first
      const permissionResult = await pushSubscriptionManager.requestPermission();
      setPermission(permissionResult);

      if (permissionResult === 'granted') {
        // Try to subscribe
        const subscriptionResult = await pushSubscriptionManager.subscribe();
        
        if (subscriptionResult.success) {
          onPermissionGranted?.();
        } else {
          const errorInfo = getErrorInfo(subscriptionResult.code || 'SUBSCRIPTION_ERROR');
          setError(errorInfo.userMessage);
          setErrorCode(errorInfo.code);
          onError?.(errorInfo.userMessage, errorInfo.code);
        }
      } else if (permissionResult === 'denied') {
        const errorInfo = getErrorInfo('PERMISSION_DENIED');
        setError(errorInfo.userMessage);
        setErrorCode(errorInfo.code);
        onPermissionDenied?.();
        onError?.(errorInfo.userMessage, errorInfo.code);
      }
    } catch (err) {
      const errorInfo = getErrorInfo('SUBSCRIPTION_ERROR');
      setError(errorInfo.userMessage);
      setErrorCode(errorInfo.code);
      onError?.(errorInfo.userMessage, errorInfo.code);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    setError(null);
    setErrorCode(null);
    handleEnableNotifications();
  };

  const handleClose = () => {
    onClose?.();
  };

  // Don't show if permission is already granted
  if (permission === 'granted') {
    return null;
  }

  // Don't show if browser doesn't support push notifications
  if (browserSupport && !browserSupport.supported) {
    return (
      <div className={`notification-prompt notification-prompt--unsupported ${className}`}>
        <div className="notification-prompt__content">
          <div className="notification-prompt__icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="currentColor"/>
            </svg>
          </div>
          <div className="notification-prompt__text">
            <h3 className="notification-prompt__title">Bildirimler Desteklenmiyor</h3>
            <p className="notification-prompt__description">
              {browserSupport.reason}. Bildirimleri almak için Chrome, Firefox veya Edge kullanmayı deneyin.
            </p>
          </div>
          {showCloseButton && (
            <button 
              className="notification-prompt__close"
              onClick={handleClose}
              aria-label="Kapat"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M15 5L5 15M5 5l10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}
        </div>
      </div>
    );
  }

  const permissionInfo = formatPermissionStatus(permission);

  return (
    <div className={`notification-prompt ${className}`}>
      <div className="notification-prompt__content">
        <div className="notification-prompt__icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        
        <div className="notification-prompt__text">
          <h3 className="notification-prompt__title">
            {permission === 'denied' ? 'Bildirimler Engellendi' : 'Bildirimleri Etkinleştir'}
          </h3>
          <p className="notification-prompt__description">
            {permission === 'denied' 
              ? 'Etkinlik güncellemelerini kaçırmamak için tarayıcı ayarlarından bildirimleri etkinleştirin.'
              : 'Etkinlik saati değişiklikleri ve yeni etkinlikler hakkında anında bilgi alın.'
            }
          </p>
          
          {error && (
            <div className="notification-prompt__error">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM8 10a.75.75 0 0 1-.75-.75v-2.5a.75.75 0 0 1 1.5 0v2.5A.75.75 0 0 1 8 10zm0 2a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5z" fill="currentColor"/>
              </svg>
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="notification-prompt__actions">
          {permission === 'denied' ? (
            <div className="notification-prompt__help">
              <p className="notification-prompt__help-text">
                Tarayıcınızın adres çubuğundaki kilit simgesine tıklayın ve bildirimleri "İzin Ver" olarak ayarlayın.
              </p>
              {error && errorCode && getErrorInfo(errorCode).retryable && (
                <button
                  className="notification-prompt__button notification-prompt__button--secondary"
                  onClick={handleRetry}
                  disabled={isLoading}
                >
                  Tekrar Dene
                </button>
              )}
            </div>
          ) : (
            <>
              <button
                className="notification-prompt__button notification-prompt__button--primary"
                onClick={handleEnableNotifications}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <svg className="notification-prompt__spinner" width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M8 1.5v3M8 11.5v3M14.5 8h-3M4.5 8h-3M12.5 3.5l-2.12 2.12M5.62 10.38L3.5 12.5M12.5 12.5l-2.12-2.12M5.62 5.62L3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                    Etkinleştiriliyor...
                  </>
                ) : (
                  'Bildirimleri Etkinleştir'
                )}
              </button>
              
              {error && errorCode && getErrorInfo(errorCode).retryable && retryCount < 3 && (
                <button
                  className="notification-prompt__button notification-prompt__button--secondary"
                  onClick={handleRetry}
                  disabled={isLoading}
                >
                  Tekrar Dene ({retryCount + 1}/3)
                </button>
              )}
            </>
          )}
        </div>

        {showCloseButton && (
          <button 
            className="notification-prompt__close"
            onClick={handleClose}
            aria-label="Kapat"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15 5L5 15M5 5l10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}
      </div>

      {browserSupport && (
        <div className="notification-prompt__browser-info">
          <span className="notification-prompt__browser-info-text">
            {browserSupport.browserInfo.name} {browserSupport.browserInfo.version} • {browserSupport.browserInfo.platform}
          </span>
        </div>
      )}
    </div>
  );
};

export default NotificationPermissionPrompt;