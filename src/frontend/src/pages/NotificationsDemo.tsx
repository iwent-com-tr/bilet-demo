import React from 'react';
import { NotificationSettings, TestNotificationButton } from '../components/notifications';
import './NotificationsDemo.css';

const NotificationsDemo: React.FC = () => {
  return (
    <div className="notifications-demo">
      <div className="notifications-demo__container">
        <header className="notifications-demo__header">
          <h1 className="notifications-demo__title">Push Notifications Demo</h1>
          <p className="notifications-demo__description">
            Test and manage push notifications for the Bilet Demo application.
          </p>
        </header>

        <div className="notifications-demo__content">
          <div className="notifications-demo__section">
            <h2 className="notifications-demo__section-title">Quick Test</h2>
            <p className="notifications-demo__section-description">
              Send a test notification to your browser immediately.
            </p>
            <TestNotificationButton className="notifications-demo__test-button" />
          </div>

          <div className="notifications-demo__section">
            <h2 className="notifications-demo__section-title">Notification Settings</h2>
            <p className="notifications-demo__section-description">
              Manage your push notification preferences and subscriptions.
            </p>
            <NotificationSettings
              userId="demo-user"
              onSettingsChange={(settings) => {
                console.log('Settings changed:', settings);
              }}
              onSubscriptionChange={(subscribed) => {
                console.log('Subscription changed:', subscribed);
              }}
            />
          </div>
        </div>

        <div className="notifications-demo__info">
          <h3>How to Test:</h3>
          <ol>
            <li>Make sure you're logged in to the application</li>
            <li>Enable push notifications using the settings above</li>
            <li>Click "Send Test Notification" to receive a test push notification</li>
            <li>Check your browser's notification area to see the notification</li>
          </ol>

          <div className="notifications-demo__note">
            <strong>Note:</strong> Push notifications require HTTPS and won't work on localhost
            unless you're using Chrome with special flags or a development server with SSL.
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationsDemo;