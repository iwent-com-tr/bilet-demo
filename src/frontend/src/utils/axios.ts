import axios from 'axios';

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

// Add response interceptor with improved error handling
axios.interceptors.response.use(
  (response) => {
    // For successful responses, just return as-is
    return response;
  },
  (error) => {
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