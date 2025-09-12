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
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle 304 responses gracefully
axios.interceptors.response.use(
  (response) => {
    // Handle 304 Not Modified responses
    if (response.status === 304) {
      console.warn('Received 304 Not Modified for:', response.config.url);
      // For 304 responses, we should use cached data, but since we're trying to avoid cache,
      // we'll treat this as an empty success response
      return {
        ...response,
        data: { success: true, chats: [], messages: [] },
        status: 200
      };
    }
    return response;
  },
  (error) => {
    // Handle network errors and other issues
    if (error.response?.status === 304) {
      console.warn('304 error for:', error.config.url);
      return Promise.resolve({
        data: { success: true, chats: [], messages: [] },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: error.config
      });
    }
    return Promise.reject(error);
  }
);

export default axios; 