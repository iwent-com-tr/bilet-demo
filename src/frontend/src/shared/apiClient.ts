import axios from 'axios';

const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api/v1';

export const api = axios.create({
  baseURL,
  withCredentials: true,
});

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

api.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers = config.headers || {};
      config.headers['Authorization'] = `Bearer ${token}`;
    }
  } catch {}
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        // If a refresh is in progress, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          original.headers['Authorization'] = `Bearer ${token}`;
          return api(original);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      original._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const userId = localStorage.getItem('user:id');
        
        if (!refreshToken || !userId) {
          throw new Error('No refresh token available');
        }

        const response = await axios.post(`${baseURL}/auth/refresh`, {
          refreshToken,
          userId
        });

        const { accessToken, refreshToken: newRefreshToken } = response.data;
        
        if (accessToken) {
          localStorage.setItem('token', accessToken);
          api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
        }
        
        if (newRefreshToken) {
          localStorage.setItem('refreshToken', newRefreshToken);
        }

        processQueue(null, accessToken);
        
        // Retry the original request with new token
        original.headers['Authorization'] = `Bearer ${accessToken}`;
        return api(original);
        
      } catch (refreshError) {
        // Refresh failed, clear tokens and redirect to login
        processQueue(refreshError, null);
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user:id');
        localStorage.removeItem('user:email');
        localStorage.removeItem('user:firstName');
        localStorage.removeItem('user:lastName');
        localStorage.removeItem('user:type');
        localStorage.removeItem('user:adminRole');
        delete api.defaults.headers.common['Authorization'];
        
        // Redirect to login page
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;

