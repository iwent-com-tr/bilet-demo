/**
 * NotificationSettings Component
 * 
 * A comprehensive settings component for managing push notification preferences.
 * Includes permission status indicators, subscription management, and retry mechanisms.
 * 
 * Requirements: 3.1, 3.3
 */

import React, { useState, useEffect } from 'react';
import { pushSubscriptionManager } from '../../lib/push-subscription-manager';
import { formatPermissionStatus, getErrorInfo, checkPushSupport } from '../../lib/push-utils';
import './NotificationSettings.css';
import axios from 'axios';
interface NotificationPreferences {
    eventUpdates: boolean;
    newEvents: boolean;
    eventReminders: boolean;
    generalNotifications: boolean;
}

interface NotificationSettingsProps {
    userId: string;
    currentSettings?: NotificationPreferences;
    onSettingsChange?: (settings: NotificationPreferences) => void;
    onSubscriptionChange?: (subscribed: boolean) => void;
    className?: string;
}

interface SubscriptionInfo {
    id: string;
    endpoint: string;
    enabled: boolean;
    userAgent?: string;
    createdAt: string;
    lastSeenAt: string;
}

const NotificationSettings: React.FC<NotificationSettingsProps> = ({
    userId,
    currentSettings = {
        eventUpdates: true,
        newEvents: true,
        eventReminders: true,
        generalNotifications: false,
    },
    onSettingsChange,
    onSubscriptionChange,
    className = '',
}) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [permission, setPermission] = useState<NotificationPermission>('default');
    const [hasSubscription, setHasSubscription] = useState(false);
    const [subscriptions, setSubscriptions] = useState<SubscriptionInfo[]>([]);
    const [preferences, setPreferences] = useState<NotificationPreferences>(currentSettings);
    const [browserSupport, setBrowserSupport] = useState<ReturnType<typeof checkPushSupport> | null>(null);
    const [isTestingSubscription, setIsTestingSubscription] = useState(false);

    useEffect(() => {
        loadNotificationStatus();
    }, []);

    const loadNotificationStatus = async () => {
        setIsLoading(true);
        setError(null);

        try {
            // Check browser support
            const support = checkPushSupport();
            setBrowserSupport(support);

            if (!support.supported) {
                return;
            }

            // Get subscription info
            const info = await pushSubscriptionManager.getSubscriptionInfo();
            setPermission(info.permission);
            setHasSubscription(info.hasSubscription);

            if (info.backendSubscriptions) {
                setSubscriptions(info.backendSubscriptions);
            }
        } catch (err) {
            console.error('Error loading notification status:', err);
            setError('Bildirim ayarları yüklenemedi');
        } finally {
            setIsLoading(false);
        }
    };

    const handleEnableNotifications = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const result = await pushSubscriptionManager.subscribe();

            if (result.success) {
                setHasSubscription(true);
                setPermission('granted');
                onSubscriptionChange?.(true);
                await loadNotificationStatus(); // Refresh subscription list
            } else {
                const errorInfo = getErrorInfo(result.code || 'SUBSCRIPTION_ERROR');
                setError(errorInfo.userMessage);
            }
        } catch (err) {
            const errorInfo = getErrorInfo('SUBSCRIPTION_ERROR');
            setError(errorInfo.userMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDisableNotifications = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const result = await pushSubscriptionManager.unsubscribe();

            if (result.success) {
                setHasSubscription(false);
                onSubscriptionChange?.(false);
                await loadNotificationStatus(); // Refresh subscription list
            } else {
                const errorInfo = getErrorInfo(result.code || 'UNSUBSCRIBE_ERROR');
                setError(errorInfo.userMessage);
            }
        } catch (err) {
            const errorInfo = getErrorInfo('UNSUBSCRIBE_ERROR');
            setError(errorInfo.userMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const handlePreferenceChange = (key: keyof NotificationPreferences, value: boolean) => {
        const newPreferences = { ...preferences, [key]: value };
        setPreferences(newPreferences);
        onSettingsChange?.(newPreferences);
    };

    const handleTestSubscription = async () => {
        setIsTestingSubscription(true);
        setError(null);

        try {
            const result = await pushSubscriptionManager.testSubscription();

            if (result.success) {
                if (result.isValid) {
                    // Show success message or send test notification
                    alert('Bildirim aboneliği aktif ve çalışıyor!');
                } else {
                    setError('Bildirim aboneliği geçersiz. Lütfen tekrar etkinleştirin.');
                    setHasSubscription(false);
                }
            } else {
                setError(result.error || 'Abonelik testi başarısız');
            }
        } catch (err) {
            setError('Abonelik testi sırasında hata oluştu');
        } finally {
            setIsTestingSubscription(false);
        }
    };

    const handleSendTestNotification = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setError('Test bildirimi göndermek için giriş yapmanız gerekiyor.');
                return;
            }

            const response = await axios.post('/api/v1/admin/push/test', {
                title: 'Test Bildirimi 🔔',
                body: 'Bu bilet-demo uygulamasından gönderilen test bildirimidir!',
                testMode: true
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
            });

            const data = response.data;

            // Show success message with better formatting
            const notificationId = data.data?.id || data.id || 'demo-' + Date.now();
            alert(`✅ Test bildirimi başarıyla gönderildi!\nID: ${notificationId}\nDurum: ${data.message || 'Başarılı'}`);
        } catch (err) {
            console.error('Error sending test notification:', err);

            if (axios.isAxiosError(err)) {
                const errorMessage = err.response?.data?.error || err.message;
                if (errorMessage.includes('NO_SUBSCRIPTIONS') || errorMessage.includes('No active subscriptions')) {
                    setError('Aktif bildirim aboneliği bulunamadı. Lütfen önce bildirimleri etkinleştirin.');
                } else if (errorMessage.includes('UNAUTHORIZED') || err.response?.status === 401) {
                    setError('Test bildirimi göndermek için giriş yapmanız gerekiyor.');
                } else if (errorMessage.includes('FORBIDDEN') || err.response?.status === 403) {
                    setError('Test bildirimi göndermek için admin yetkisi gerekiyor.');
                } else {
                    setError(`Test bildirimi gönderilemedi: ${errorMessage}`);
                }
            } else {
                setError('Test bildirimi gönderilirken hata oluştu');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('tr-TR', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getDeviceInfo = (userAgent?: string) => {
        if (!userAgent) return 'Bilinmeyen Cihaz';

        if (userAgent.includes('Mobile') || userAgent.includes('Android')) {
            return 'Mobil Cihaz';
        } else if (userAgent.includes('iPad')) {
            return 'iPad';
        } else if (userAgent.includes('iPhone')) {
            return 'iPhone';
        } else {
            return 'Masaüstü';
        }
    };

    const permissionInfo = formatPermissionStatus(permission);

    if (!browserSupport?.supported) {
        return (
            <div className={`notification-settings notification-settings--unsupported ${className}`}>
                <div className="notification-settings__header">
                    <h3 className="notification-settings__title">Push Bildirimleri</h3>
                    <div className="notification-settings__status notification-settings__status--error">
                        Desteklenmiyor
                    </div>
                </div>
                <p className="notification-settings__description">
                    Tarayıcınız push bildirimleri desteklemiyor. Chrome, Firefox veya Edge kullanmayı deneyin.
                </p>
                <div className="notification-settings__browser-info">
                    <span>
                        {browserSupport?.browserInfo.name} {browserSupport?.browserInfo.version} • {browserSupport?.browserInfo.platform}
                    </span>
                </div>
            </div>
        );
    }

    return (
        <div className={`notification-settings ${className}`}>
            {/* Permission Status Section */}
            <div className="notification-settings__section">
                <div className="notification-settings__header">
                    <h3 className="notification-settings__title">Push Bildirimleri</h3>
                    <div className={`notification-settings__status notification-settings__status--${permission}`}>
                        {permissionInfo.label}
                    </div>
                </div>

                <p className="notification-settings__description">
                    {permissionInfo.description}
                </p>

                {error && (
                    <div className="notification-settings__error">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM8 10a.75.75 0 0 1-.75-.75v-2.5a.75.75 0 0 1 1.5 0v2.5A.75.75 0 0 1 8 10zm0 2a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5z" fill="currentColor" />
                        </svg>
                        <span>{error}</span>
                    </div>
                )}

                <div className="notification-settings__actions">
                    {permission === 'granted' ? (
                        <>
                            {hasSubscription ? (
                                <button
                                    className="notification-settings__button notification-settings__button--danger"
                                    onClick={handleDisableNotifications}
                                    disabled={isLoading}
                                >
                                    {isLoading ? 'Devre Dışı Bırakılıyor...' : 'Bildirimleri Devre Dışı Bırak'}
                                </button>
                            ) : (
                                <button
                                    className="notification-settings__button notification-settings__button--primary"
                                    onClick={handleEnableNotifications}
                                    disabled={isLoading}
                                >
                                    {isLoading ? 'Etkinleştiriliyor...' : 'Bildirimleri Etkinleştir'}
                                </button>
                            )}

                            {hasSubscription && (
                                <>
                                    <button
                                        className="notification-settings__button notification-settings__button--secondary"
                                        onClick={handleTestSubscription}
                                        disabled={isTestingSubscription}
                                    >
                                        {isTestingSubscription ? 'Test Ediliyor...' : 'Bağlantıyı Test Et'}
                                    </button>
                                    <button
                                        className="notification-settings__button notification-settings__button--accent"
                                        onClick={handleSendTestNotification}
                                        disabled={isLoading}
                                    >
                                        {isLoading ? 'Gönderiliyor...' : 'Test Bildirimi Gönder'}
                                    </button>
                                </>
                            )}
                        </>
                    ) : permission === 'denied' ? (
                        <div className="notification-settings__help">
                            <p>Bildirimleri etkinleştirmek için:</p>
                            <ol>
                                <li>Tarayıcınızın adres çubuğundaki kilit simgesine tıklayın</li>
                                <li>Bildirimler için "İzin Ver" seçeneğini seçin</li>
                                <li>Sayfayı yenileyin</li>
                            </ol>
                        </div>
                    ) : (
                        <button
                            className="notification-settings__button notification-settings__button--primary"
                            onClick={handleEnableNotifications}
                            disabled={isLoading}
                        >
                            {isLoading ? 'Etkinleştiriliyor...' : 'Bildirimleri Etkinleştir'}
                        </button>
                    )}
                </div>
            </div>

            {/* Notification Preferences */}
            {hasSubscription && permission === 'granted' && (
                <div className="notification-settings__section">
                    <h4 className="notification-settings__subtitle">Bildirim Tercihleri</h4>

                    <div className="notification-settings__preferences">
                        <div className="notification-settings__preference">
                            <div className="notification-settings__preference-info">
                                <span className="notification-settings__preference-title">Etkinlik Güncellemeleri</span>
                                <span className="notification-settings__preference-description">
                                    Biletiniz olan etkinliklerin saati değiştiğinde bildirim alın
                                </span>
                            </div>
                            <label className="notification-settings__toggle">
                                <input
                                    type="checkbox"
                                    checked={preferences.eventUpdates}
                                    onChange={(e) => handlePreferenceChange('eventUpdates', e.target.checked)}
                                />
                                <span className="notification-settings__toggle-slider"></span>
                            </label>
                        </div>

                        <div className="notification-settings__preference">
                            <div className="notification-settings__preference-info">
                                <span className="notification-settings__preference-title">Yeni Etkinlikler</span>
                                <span className="notification-settings__preference-description">
                                    Platform'a eklenen yeni etkinlikler hakkında bildirim alın
                                </span>
                            </div>
                            <label className="notification-settings__toggle">
                                <input
                                    type="checkbox"
                                    checked={preferences.newEvents}
                                    onChange={(e) => handlePreferenceChange('newEvents', e.target.checked)}
                                />
                                <span className="notification-settings__toggle-slider"></span>
                            </label>
                        </div>

                        <div className="notification-settings__preference">
                            <div className="notification-settings__preference-info">
                                <span className="notification-settings__preference-title">Etkinlik Hatırlatıcıları</span>
                                <span className="notification-settings__preference-description">
                                    Etkinlik başlamadan önce hatırlatıcı bildirimler alın
                                </span>
                            </div>
                            <label className="notification-settings__toggle">
                                <input
                                    type="checkbox"
                                    checked={preferences.eventReminders}
                                    onChange={(e) => handlePreferenceChange('eventReminders', e.target.checked)}
                                />
                                <span className="notification-settings__toggle-slider"></span>
                            </label>
                        </div>

                        <div className="notification-settings__preference">
                            <div className="notification-settings__preference-info">
                                <span className="notification-settings__preference-title">Genel Bildirimler</span>
                                <span className="notification-settings__preference-description">
                                    Platform güncellemeleri ve önemli duyurular
                                </span>
                            </div>
                            <label className="notification-settings__toggle">
                                <input
                                    type="checkbox"
                                    checked={preferences.generalNotifications}
                                    onChange={(e) => handlePreferenceChange('generalNotifications', e.target.checked)}
                                />
                                <span className="notification-settings__toggle-slider"></span>
                            </label>
                        </div>
                    </div>
                </div>
            )}

            {/* Active Subscriptions */}
            {subscriptions.length > 0 && (
                <div className="notification-settings__section">
                    <h4 className="notification-settings__subtitle">Aktif Cihazlar</h4>

                    <div className="notification-settings__subscriptions">
                        {subscriptions.map((subscription) => (
                            <div key={subscription.id} className="notification-settings__subscription">
                                <div className="notification-settings__subscription-info">
                                    <div className="notification-settings__subscription-device">
                                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M2 3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3z" stroke="currentColor" strokeWidth="1.5" />
                                            <path d="M6 14h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                        </svg>
                                        <span>{getDeviceInfo(subscription.userAgent)}</span>
                                    </div>
                                    <div className="notification-settings__subscription-dates">
                                        <span>Eklendi: {formatDate(subscription.createdAt)}</span>
                                        <span>Son görülme: {formatDate(subscription.lastSeenAt)}</span>
                                    </div>
                                </div>
                                <div className={`notification-settings__subscription-status ${subscription.enabled ? 'active' : 'inactive'}`}>
                                    {subscription.enabled ? 'Aktif' : 'Pasif'}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Browser Info */}
            {browserSupport && (
                <div className="notification-settings__browser-info">
                    <span>
                        {browserSupport.browserInfo.name} {browserSupport.browserInfo.version} • {browserSupport.browserInfo.platform}
                    </span>
                </div>
            )}
        </div>
    );
};

export default NotificationSettings;