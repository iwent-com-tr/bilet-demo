import axios from 'axios';
import { refreshAuthTokens } from './tokenUtils';

// List of endpoints that should not be cached (user-specific data)
const NO_CACHE_ENDPOINTS = [
  '/chat/',
  '/users/me',
  '/users/favorites',
  '/users/points',
  '/friendships/',
  '/tickets/my-tickets',
  '/tickets/attended',
  '/auth/me'
];

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: any) => void;
  reject: (error: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });
  
  failedQueue = [];
};

// Add request interceptor to add cache-busting headers for user-specific endpoints
axios.interceptors.request.use(
  (config) => {
    const url = config.url || '';
    
    // Check if this is a user-specific endpoint that shouldn't be cached
    const shouldNotCache = NO_CACHE_ENDPOINTS.some(endpoint => url.includes(endpoint));
    
    if (shouldNotCache) {
      config.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
      config.headers['Pragma'] = 'no-cache';
      config.headers['Expires'] = '0';
      // Add timestamp to prevent browser caching
      if (!config.params) config.params = {};
      config.params._t = Date.now();
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Enhanced response interceptor with automatic token refresh
axios.interceptors.response.use(
  (response) => {
    // For successful responses, just return as-is
    return response;
  },
  async (error) => {
    const original = error.config;

    // Handle 304 Not Modified properly - this indicates cached data is still valid
    if (error.response?.status === 304) {
      // 304 means "Not Modified" - the cached version is still valid
      // We should not create fake empty data, instead let the browser use its cache
      // For development logging only
      if (process.env.NODE_ENV === 'development') {
        console.warn('Received 304 Not Modified for:', error.config?.url);
      }
      // Re-throw the error to let calling code handle 304 appropriately
      return Promise.reject(error);
    }
    
    // Handle 401 errors with automatic token refresh
    if (error.response?.status === 401 && !original._retry && !original.url?.includes('/auth/refresh')) {
      if (isRefreshing) {
        // If a refresh is in progress, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          if (token) {
            original.headers['Authorization'] = `Bearer ${token}`;
          }
          return axios(original);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      original._retry = true;
      isRefreshing = true;

      try {
        console.log('[Axios] Attempting automatic token refresh due to 401');
        const result = await refreshAuthTokens();
        
        if (result.success && result.accessToken) {
          processQueue(null, result.accessToken);
          
          // Retry the original request with new token
          original.headers['Authorization'] = `Bearer ${result.accessToken}`;
          return axios(original);
        } else {
          throw new Error(result.error || 'Token refresh failed');
        }
        
      } catch (refreshError) {
        // Refresh failed, process queue with error
        processQueue(refreshError, null);
        
        // Clear authentication data
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user:id');
        localStorage.removeItem('user:email');
        localStorage.removeItem('user:firstName');
        localStorage.removeItem('user:lastName');
        localStorage.removeItem('user:type');
        localStorage.removeItem('user:adminRole');
        delete axios.defaults.headers.common['Authorization'];
        
        // Redirect to login if we're not already there
        if (!window.location.pathname.includes('/login')) {
          console.log('[Axios] Redirecting to login due to failed token refresh');
          window.location.href = '/login';
        }
        
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    
    // Handle network connectivity issues
    if (!error.response && error.request) {
      error.message = 'Network error - please check your internet connection';
    }
    
    // Log errors in development only
    if (process.env.NODE_ENV === 'development') {
      console.error('Axios error:', {
        url: error.config?.url,
        method: error.config?.method,
        status: error.response?.status,
        message: error.message
      });
    }
    
    return Promise.reject(error);
  }
);

export default axios; 