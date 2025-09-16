import { useState } from 'react';
import axios from 'axios';
import { Button } from '../ui/Button';
import { Bell } from '../icons/Bell';
import { Loader2 } from '../icons/Loader2';
import { toast } from '../../utils/toast';

interface TestNotificationButtonProps {
  className?: string;
}

export default function TestNotificationButton({ className }: TestNotificationButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const sendTestNotification = async () => {
    setIsLoading(true);

    try {
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/push/test`, {}, {
        headers: {
          'Content-Type': 'application/json',
        },
        withCredentials: true,
      });

      const data = response.data;

      toast.success(`Test notification sent! (${data.sent} sent, ${data.failed} failed)`);
    } catch (error) {
      console.error('Error sending test notification:', error);

      if (axios.isAxiosError(error)) {
        const errorMessage = error.response?.data?.error || error.message;
        
        if (errorMessage.includes('NO_SUBSCRIPTIONS')) {
          toast.error('No active push subscriptions found. Please enable notifications first.');
        } else if (errorMessage.includes('UNAUTHORIZED') || error.response?.status === 401) {
          toast.error('Please log in to send test notifications.');
        } else {
          toast.error(`Failed to send test notification: ${errorMessage}`);
        }
      } else if (error instanceof Error) {
        toast.error(`Failed to send test notification: ${error.message}`);
      } else {
        toast.error('Failed to send test notification');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={sendTestNotification}
      disabled={isLoading}
      variant="secondary"
      className={className}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <Bell className="h-4 w-4 mr-2" />
      )}
      {isLoading ? 'Sending...' : 'Send Test Notification'}
    </Button>
  );
}