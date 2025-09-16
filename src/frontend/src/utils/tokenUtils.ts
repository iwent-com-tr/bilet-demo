import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api/v1';

interface TokenRefreshResult {
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  error?: string;
}

/**
 * Utility function to refresh JWT tokens
 * Can be used throughout the app for proactive token refresh
 */
export const refreshAuthTokens = async (): Promise<TokenRefreshResult> => {
  try {
    const storedRefreshToken = localStorage.getItem('refreshToken');
    const storedUserId = localStorage.getItem('user:id');
    
    if (!storedRefreshToken || !storedUserId) {
      return {
        success: false,
        error: 'No refresh token or user ID found'
      };
    }

    console.log('[TokenUtils] Attempting token refresh');
    
    const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
      refreshToken: storedRefreshToken,
      userId: storedUserId
    });

    const { accessToken, refreshToken: newRefreshToken } = response.data;
    
    if (accessToken) {
      localStorage.setItem('token', accessToken);
      axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
    }
    
    if (newRefreshToken) {
      localStorage.setItem('refreshToken', newRefreshToken);
    }
    
    console.log('[TokenUtils] Token refresh successful');
    
    return {
      success: true,
      accessToken,
      refreshToken: newRefreshToken
    };
  } catch (error: any) {
    console.error('[TokenUtils] Token refresh failed:', error);
    
    return {
      success: false,
      error: error.response?.data?.message || error.message || 'Token refresh failed'
    };
  }
};

/**
 * Check if a token is close to expiration
 * @param token JWT token to check
 * @param bufferMinutes Minutes before expiration to consider "close"
 */
export const isTokenNearExpiry = (token: string, bufferMinutes: number = 5): boolean => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const expirationTime = payload.exp * 1000; // Convert to milliseconds
    const currentTime = Date.now();
    const bufferTime = bufferMinutes * 60 * 1000; // Convert to milliseconds
    
    return (expirationTime - currentTime) <= bufferTime;
  } catch (error) {
    console.error('[TokenUtils] Error checking token expiry:', error);
    return true; // Assume expired if we can't parse
  }
};

/**
 * Proactively refresh token if it's close to expiry
 * Should be called before making important API requests
 */
export const ensureTokenValidity = async (): Promise<boolean> => {
  const token = localStorage.getItem('token');
  
  if (!token) {
    return false;
  }
  
  if (isTokenNearExpiry(token)) {
    console.log('[TokenUtils] Token is near expiry, refreshing...');
    const result = await refreshAuthTokens();
    return result.success;
  }
  
  return true; // Token is still valid
};

/**
 * Clear all authentication data from localStorage
 */
export const clearAuthData = (): void => {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user:id');
  localStorage.removeItem('user:email');
  localStorage.removeItem('user:firstName');
  localStorage.removeItem('user:lastName');
  localStorage.removeItem('user:type');
  localStorage.removeItem('user:adminRole');
  localStorage.removeItem('login:userType');
  localStorage.removeItem('login:identifier');
  localStorage.removeItem('login:remember');
  delete axios.defaults.headers.common['Authorization'];
};