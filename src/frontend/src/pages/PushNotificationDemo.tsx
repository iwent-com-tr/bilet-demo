import * as React from 'react';
import { useState, useEffect } from 'react';
import { usePushNotification } from '../hooks/use-push-notification';
import { SubscriptionStatus } from '../lib/push-notification-manager';
import { OneSignalLoader, usePushNotificationFeatureFlag } from '../components/OneSignalLoader';

export function PushNotificationDemo() {
  const featureFlag = usePushNotificationFeatureFlag();
  const {
    isInitialized,
    isInitializing,
    subscriptionStatus,
    permissionState,
    error,
    requestPermission,
    unsubscribe,
    setTags,
    canRequestPermission,
    isSupported,
    isPWA,
    showIOSBanner,
  } = usePushNotification({
    autoInitialize: true,
    onSubscriptionChange: (status: SubscriptionStatus) => {
      console.log('[Demo] Subscription changed:', status);
    },
    onError: (err: Error) => {
      console.error('[Demo] Push notification error:', err);
    },
  });

  const [testTitle, setTestTitle] = useState('Demo Notification 🎆');
  const [testBody, setTestBody] = useState('This is a test push notification from bilet-demo! Your notifications are working perfectly.');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [hasShownInitialPrompt, setHasShownInitialPrompt] = useState(false);

  // Auto-trigger permission request after initialization if permission is default
  useEffect(() => {
    const tryAutoPermissionRequest = async () => {
      // Only run once and only if we haven't shown the prompt yet
      if (hasShownInitialPrompt || !isInitialized || !isSupported) {
        return;
      }

      // Check if we should auto-request permission
      const currentPermission = permissionState.permission;
      console.log('[Demo] Current permission state:', currentPermission, 'canRequest:', canRequestPermission);
      
      if (currentPermission === 'default' && canRequestPermission) {
        console.log('[Demo] Auto-requesting notification permission...');
        setHasShownInitialPrompt(true);
        
        // Give user a moment to read the page before showing permission prompt
        setTimeout(() => {
          requestPermission();
        }, 2000); // 2 second delay
      }
    };

    tryAutoPermissionRequest();
  }, [isInitialized, isSupported, permissionState.permission, canRequestPermission, requestPermission, hasShownInitialPrompt]);

  // Send test notification with default demo content
  const sendTestNotification = async () => {
    try {
      setIsSendingTest(true);
      setTestResult(null);
      
      // Use current values or fallback to defaults
      const finalTitle = testTitle.trim() || 'Demo Notification 🎆';
      const finalBody = testBody.trim() || 'This is a test push notification from bilet-demo! Your notifications are working perfectly.';
      
      const response = await fetch('/api/v1/admin/push/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          title: finalTitle,
          body: finalBody,
          testMode: true,
        }),
      });
      
      const result = await response.json();
      
      if (response.ok) {
        const notificationId = result.data?.id || result.id || 'demo-' + Date.now();
        setTestResult(`✅ Demo notification sent successfully! ID: ${notificationId}`);
      } else {
        setTestResult(`❌ Failed to send: ${result.error || 'Unknown error'}`);
      }
    } catch (err) {
      setTestResult(`❌ Network error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsSendingTest(false);
    }
  };

  // Send a quick demo notification with preset values
  const sendQuickDemo = async () => {
    // Set demo values
    setTestTitle('Demo Notification 🎆');
    setTestBody('This is a test push notification from bilet-demo! Your notifications are working perfectly.');
    
    // Send immediately
    await sendTestNotification();
  };

  // Set demo tags
  const setDemoTags = async () => {
    await setTags({
      demo_user: 'true',
      test_segment: 'push_demo',
      last_demo: new Date().toISOString(),
    });
  };

  if (!featureFlag.enabled) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-yellow-800 mb-2">
            🔔 Push Notifications Demo
          </h2>
          <p className="text-yellow-700 mb-2">
            Push notifications are disabled in this environment.
          </p>
          <p className="text-sm text-yellow-600">
            <strong>Reason:</strong> {featureFlag.reason}
          </p>
          {process.env.NODE_ENV === 'development' ? (
            <div className="mt-4 p-3 bg-yellow-100 rounded">
              <p className="text-sm font-medium">To enable in development:</p>
              <code className="text-xs bg-gray-800 text-green-400 p-1 rounded">
                REACT_APP_ONESIGNAL_APP_ID=your_app_id
              </code>
            </div>
          ) : (
            <div className="mt-4 p-3 bg-yellow-100 rounded">
              <p className="text-sm font-medium">To enable push notifications:</p>
              <p className="text-xs text-yellow-700 mt-1">
                Contact your system administrator to configure OneSignal App ID.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <OneSignalLoader>
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            🔔 Push Notifications Demo
          </h1>
          
          {/* Feature Flag Status */}
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="font-semibold text-green-800">Feature Status</h3>
            <p className="text-green-700">
              ✅ Push notifications enabled for this environment
            </p>
            {process.env.NODE_ENV === 'development' && (
              <p className="text-sm text-green-600 mt-1">
                App ID: {featureFlag.config?.appId}
              </p>
            )}
          </div>

          {/* Permission Request Banner - Show prominently when permission is needed */}
          {isSupported && canRequestPermission && !subscriptionStatus?.isSubscribed && (
            <div className="mb-6 p-6 bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-lg">
              <div className="flex items-center gap-4">
                <div className="text-4xl">🔔</div>
                <div className="flex-1">
                  <h3 className="font-bold text-blue-900 text-lg mb-2">
                    Enable Push Notifications
                  </h3>
                  <p className="text-blue-700 mb-3">
                    Click the button below to enable push notifications and receive demo notifications.
                    Your browser will ask for permission.
                  </p>
                  <button
                    onClick={requestPermission}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold shadow-lg"
                  >
                    🔔 Enable Notifications Now
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Permission Denied Banner */}
          {permissionState.permission === 'denied' && (
            <div className="mb-6 p-6 bg-red-50 border-2 border-red-200 rounded-lg">
              <div className="flex items-center gap-4">
                <div className="text-4xl">🚫</div>
                <div className="flex-1">
                  <h3 className="font-bold text-red-900 text-lg mb-2">
                    Notifications Blocked
                  </h3>
                  <p className="text-red-700 mb-3">
                    You have blocked notifications for this site. To enable them:
                  </p>
                  <ol className="text-sm text-red-600 ml-4 list-decimal">
                    <li>Click the lock icon in your browser's address bar</li>
                    <li>Change notifications from "Block" to "Allow"</li>
                    <li>Refresh this page</li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          {/* System Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-700">System Status</h3>
              <div className="space-y-1 text-sm">
                <div className={`flex items-center gap-2 ${
                  isSupported ? 'text-green-600' : 'text-red-600'
                }`}>
                  <span>{isSupported ? '✅' : '❌'}</span>
                  Push Notifications Supported
                </div>
                <div className={`flex items-center gap-2 ${
                  isInitialized ? 'text-green-600' : isInitializing ? 'text-yellow-600' : 'text-gray-600'
                }`}>
                  <span>{isInitialized ? '✅' : isInitializing ? '⏳' : '⏸️'}</span>
                  OneSignal {isInitialized ? 'Initialized' : isInitializing ? 'Initializing...' : 'Not Initialized'}
                </div>
                <div className={`flex items-center gap-2 ${
                  isPWA ? 'text-blue-600' : 'text-gray-600'
                }`}>
                  <span>{isPWA ? '📱' : '🌐'}</span>
                  {isPWA ? 'Running as PWA' : 'Running in Browser'}
                </div>
                <div className={`flex items-center gap-2 ${
                  permissionState.permission === 'granted' ? 'text-green-600' : 
                  permissionState.permission === 'denied' ? 'text-red-600' : 'text-yellow-600'
                }`}>
                  <span>
                    {permissionState.permission === 'granted' ? '✅' : 
                     permissionState.permission === 'denied' ? '❌' : '❓'}
                  </span>
                  Permission: {permissionState.permission}
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-700">Subscription Status</h3>
              <div className="space-y-1 text-sm">
                <div className={`flex items-center gap-2 ${
                  subscriptionStatus?.isSubscribed ? 'text-green-600' : 'text-gray-600'
                }`}>
                  <span>{subscriptionStatus?.isSubscribed ? '✅' : '❌'}</span>
                  {subscriptionStatus?.isSubscribed ? 'Subscribed' : 'Not Subscribed'}
                </div>
                {subscriptionStatus?.onesignalUserId && (
                  <div className="text-xs text-gray-500">
                    ID: {subscriptionStatus.onesignalUserId.substring(0, 16)}...
                  </div>
                )}
                {subscriptionStatus?.deviceInfo && (
                  <div className="text-xs text-gray-500">
                    {subscriptionStatus.deviceInfo.browser} on {subscriptionStatus.deviceInfo.os} ({subscriptionStatus.deviceInfo.deviceType})
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* iOS PWA Banner */}
          {showIOSBanner && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-semibold text-blue-800">📱 iOS Users</h3>
              <p className="text-blue-700 text-sm">
                To receive push notifications on iOS, you need to add this site to your home screen first.
                Tap the share button and select "Add to Home Screen".
              </p>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <h3 className="font-semibold text-red-800">Error</h3>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
              {canRequestPermission && !subscriptionStatus?.isSubscribed && (
                <button
                  onClick={requestPermission}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  🔔 Enable Notifications
                </button>
              )}
              
              {subscriptionStatus?.isSubscribed && (
                <>
                  <button
                    onClick={unsubscribe}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    🔕 Disable Notifications
                  </button>
                  
                  <button
                    onClick={setDemoTags}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    🏷️ Set Demo Tags
                  </button>
                  
                  <button
                    onClick={sendQuickDemo}
                    disabled={isSendingTest}
                    className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSendingTest ? '📤 Sending...' : '⚡ Quick Demo Notification'}
                  </button>
                </>
              )}
            </div>

            {/* Test Notification Section */}
            {subscriptionStatus?.isSubscribed && (
              <div className="border-t pt-4">
                <h3 className="font-semibold text-gray-700 mb-3">🧪 Custom Test Notification</h3>
                <div className="mb-3 text-sm text-gray-600">
                  Customize and send a test notification with your own content:
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Title
                    </label>
                    <input
                      type="text"
                      value={testTitle}
                      onChange={(e) => setTestTitle(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Notification title"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Message
                    </label>
                    <textarea
                      value={testBody}
                      onChange={(e) => setTestBody(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={3}
                      placeholder="Notification message"
                    />
                  </div>
                  
                  <button
                    onClick={sendTestNotification}
                    disabled={isSendingTest || !testTitle.trim() || !testBody.trim()}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSendingTest ? '📤 Sending Custom...' : '📤 Send Custom Notification'}
                  </button>
                  
                  {testResult && (
                    <div className={`p-3 rounded-lg text-sm ${
                      testResult.startsWith('✅') 
                        ? 'bg-green-50 text-green-700 border border-green-200' 
                        : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                      {testResult}
                    </div>
                  )}
                  
                  <div className="text-xs text-gray-500 mt-2">
                    📝 Available in both development and production environments
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Debug Info (Development Only) */}
          {process.env.NODE_ENV === 'development' && (
            <details className="mt-6">
              <summary className="cursor-pointer text-gray-600 hover:text-gray-800">
                🐛 Debug Information
              </summary>
              <div className="mt-2 p-4 bg-gray-50 rounded-lg">
                <pre className="text-xs text-gray-700 overflow-auto">
                  {JSON.stringify({
                    featureFlag,
                    isInitialized,
                    isInitializing,
                    subscriptionStatus,
                    permissionState,
                    error,
                    environment: {
                      NODE_ENV: process.env.NODE_ENV,
                      hostname: window.location.hostname,
                      protocol: window.location.protocol,
                      userAgent: navigator.userAgent,
                    },
                  }, null, 2)}
                </pre>
              </div>
            </details>
          )}
        </div>
      </div>
    </OneSignalLoader>
  );
}