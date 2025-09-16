/**
 * NotificationBanner Component
 * 
 * A lightweight banner component that can be shown at the top of pages
 * to prompt users to enable notifications without being intrusive.
 * 
 * Requirements: 3.1, 3.3
 */

import React, { useState, useEffect } from 'react';
import { pushSubscriptionManager } from '../../lib/push-subscription-manager';
import { checkPushSupport } from '../../lib/push-utils';
import './NotificationBanner.css';

interface NotificationBannerProps {
  onEnable?: () => void;
  onDismiss?: () => void;
  className?: string;
  autoHide?: boolean;
  showOnce?: boolean;
}

const NotificationBanner: React.FC<NotificationBannerProps> = ({
  onEnable,
  onDismiss,
  className = '',
  autoHide = true,
  showOnce = true,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    checkShouldShow();
  }, []);

  const checkShouldShow = async () => {
    // Check if user has dismissed this banner before
    if (showOnce && localStorage.getItem('notification-banner-dismissed') === 'true') {
      return;
    }

    // Check browser support
    const support = checkPushSupport();
    if (!support.supported) {
      return;
    }

    // Check current permission and subscription status
    const permission = pushSubscriptionManager.getPermissionStatus();
    if (permission === 'granted') {
      const subscription = await pushSubscriptionManager.getCurrentSubscription();
      if (subscription) {
        return; // Already subscribed
      }
    }

    if (permission === 'denied') {
      return; // User has denied, don't show banner
    }

    // Show banner for users who haven't been asked yet
    setIsVisible(true);
  };

  const handleEnable = async () => {
    setIsLoading(true);

    try {
      const result = await pushSubscriptionManager.subscribe();
      
      if (result.success) {
        setIsVisible(false);
        onEnable?.();
        
        if (showOnce) {
          localStorage.setItem('notification-banner-dismissed', 'true');
        }
      }
    } catch (error) {
      console.error('Error enabling notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
    onDismiss?.();
    
    if (showOnce) {
      localStorage.setItem('notification-banner-dismissed', 'true');
    }
  };

  // Auto-hide after 10 seconds if enabled
  useEffect(() => {
    if (isVisible && autoHide && !isDismissed) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, 10000);

      return () => clearTimeout(timer);
    }
  }, [isVisible, autoHide, isDismissed]);

  if (!isVisible) {
    return null;
  }

  return (
    <div className={`notification-banner ${className}`}>
      <div className="notification-banner__content">
        <div className="notification-banner__icon">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 6.66667A5 5 0 0 0 5 6.66667c0 5.83333-2.5 7.5-2.5 7.5h15s-2.5-1.66667-2.5-7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M11.44 17.5a1.67 1.67 0 0 1-2.88 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        
        <div className="notification-banner__text">
          <span className="notification-banner__title">
            Etkinlik güncellemelerini kaçırmayın
          </span>
          <span className="notification-banner__description">
            Bildirimler ile anında haberdar olun
          </span>
        </div>

        <div className="notification-banner__actions">
          <button
            className="notification-banner__button notification-banner__button--primary"
            onClick={handleEnable}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <svg className="notification-banner__spinner" width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M7 1.5v2M7 10.5v2M12.5 7h-2M3.5 7h-2M10.5 3.5l-1.5 1.5M5 9L3.5 10.5M10.5 10.5L9 9M5 5L3.5 3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
                Etkinleştiriliyor
              </>
            ) : (
              'Etkinleştir'
            )}
          </button>
          
          <button
            className="notification-banner__button notification-banner__button--dismiss"
            onClick={handleDismiss}
            aria-label="Kapat"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationBanner;