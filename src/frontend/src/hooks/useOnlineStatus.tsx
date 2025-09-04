import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { io, Socket } from 'socket.io-client';

interface OnlineStatusHook {
  onlineStatus: Record<string, boolean>;
  loading: boolean;
  error: string | null;
  updateOnlineStatus: (userIds: string[]) => Promise<void>;
  isUserOnline: (userId: string) => boolean;
}

export const useOnlineStatus = (): OnlineStatusHook => {
  const [onlineStatus, setOnlineStatus] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  // Initialize socket connection for real-time updates
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    // Create socket connection
    const socket = io(`${process.env.REACT_APP_API_URL?.replace('/api/v1', '')}`, {
      path: '/chat',
      auth: { token },
      transports: ['websocket', 'polling']
    });

    socketRef.current = socket;

    // Listen for user status changes
    socket.on('user:status-change', (data: { userId: string; isOnline: boolean }) => {
      setOnlineStatus(prev => ({
        ...prev,
        [data.userId]: data.isOnline
      }));
    });

    socket.on('connect', () => {
      console.log('Connected to chat server for online status updates');
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from chat server');
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const updateOnlineStatus = useCallback(async (userIds: string[]) => {
    if (userIds.length === 0) return;

    try {
      setLoading(true);
      setError(null);

      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/users/online-status`,
        { userIds },
        {
          headers: { 
            Authorization: `Bearer ${localStorage.getItem('token')}` 
          }
        }
      );

      setOnlineStatus(prev => ({
        ...prev,
        ...response.data.onlineStatus
      }));
    } catch (err) {
      console.error('Failed to fetch online status:', err);
      setError('Online durumu alınamadı');
      
      // Set all users as offline on error
      const offlineStatus: Record<string, boolean> = {};
      userIds.forEach(id => {
        offlineStatus[id] = false;
      });
      
      setOnlineStatus(prev => ({
        ...prev,
        ...offlineStatus
      }));
    } finally {
      setLoading(false);
    }
  }, []);

  const isUserOnline = useCallback((userId: string): boolean => {
    return onlineStatus[userId] || false;
  }, [onlineStatus]);

  return {
    onlineStatus,
    loading,
    error,
    updateOnlineStatus,
    isUserOnline
  };
};

export default useOnlineStatus;

 