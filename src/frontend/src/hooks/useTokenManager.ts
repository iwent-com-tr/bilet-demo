import { useCallback, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export const useTokenManager = () => {
  const { refreshToken, logout } = useAuth();

  const ensureValidToken = useCallback(async (): Promise<boolean> => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        console.log('[TokenManager] No token found');
        return false;
      }
      
      // Check if token is close to expiry (5 minutes buffer)
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expirationTime = payload.exp * 1000;
      const currentTime = Date.now();
      const bufferTime = 5 * 60 * 1000; // 5 minutes
      
      if ((expirationTime - currentTime) <= bufferTime) {
        console.log('[TokenManager] Token is near expiry, refreshing...');
        const success = await refreshToken();
        
        if (!success) {
          console.log('[TokenManager] Token refresh failed, logging out');
          logout();
          return false;
        }
        
        console.log('[TokenManager] Token refreshed successfully');
        return true;
      }
      
      return true;
    } catch (error) {
      console.error('[TokenManager] Error ensuring valid token:', error);
      return false;
    }
  }, [refreshToken, logout]);

  useEffect(() => {
    const interval = setInterval(async () => {
      const token = localStorage.getItem('token');
      if (token) {
        await ensureValidToken();
      }
    }, 10 * 60 * 1000); // Check every 10 minutes

    return () => clearInterval(interval);
  }, [ensureValidToken]);

  const isTokenExpiringSoon = useCallback((bufferMinutes: number = 5): boolean => {
    const token = localStorage.getItem('token');
    if (!token) return true;
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expirationTime = payload.exp * 1000;
      const currentTime = Date.now();
      const bufferTime = bufferMinutes * 60 * 1000;
      
      return (expirationTime - currentTime) <= bufferTime;
    } catch (error) {
      console.error('[TokenManager] Error checking token expiry:', error);
      return true;
    }
  }, []);

  return {
    ensureValidToken,
    isTokenExpiringSoon,
  };
};