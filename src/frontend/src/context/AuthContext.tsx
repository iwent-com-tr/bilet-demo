import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

interface User {
  id: string;
  isim: string;
  soyisim: string;
  email: string;
  phone: string;
  userType: 'USER' | 'ORGANIZER' | 'ADMIN';
  adminRole?: 'USER' | 'ADMIN' | 'SUPPORT' | 'READONLY';
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (identifier: string, sifre: string, tip: 'user' | 'organizer') => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  register: (userData: any) => Promise<void>;
  registerOrganizer: (organizerData: any) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isOrganizer: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
    }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Ensure a single, consistent API base including "/api"
  const API_BASE_URL = process.env.REACT_APP_API_URL;

  const mapApiUserToUiUser = (apiUser: any, defaultUserType?: 'USER' | 'ORGANIZER'): User => ({
    id: apiUser.id,
    isim: apiUser.firstName || apiUser.isim || '',
    soyisim: apiUser.lastName || apiUser.soyisim || '',
    email: apiUser.email,
    phone: apiUser.phone,
    userType: apiUser.userType || defaultUserType || 'USER',
    adminRole: apiUser.adminRole,
  });

  const persistUser = (uiUser: User, tokens?: { accessToken?: string; refreshToken?: string }) => {
    try {
      console.log('[Auth] Persisting user data:', uiUser);
      localStorage.setItem('user:id', uiUser.id);
      localStorage.setItem('user:email', uiUser.email);
      localStorage.setItem('user:firstName', uiUser.isim || '');
      localStorage.setItem('user:lastName', uiUser.soyisim || '');
      localStorage.setItem('user:type', uiUser.userType);
      if (uiUser.adminRole) localStorage.setItem('user:adminRole', uiUser.adminRole);
      if (tokens?.accessToken) localStorage.setItem('token', tokens.accessToken);
      if (tokens?.refreshToken) localStorage.setItem('refreshToken', tokens.refreshToken);
      console.log('[Auth] User data persisted successfully');
    } catch (error) {
      console.error('[Auth] Error persisting user data:', error);
    }
  };

  const verifyToken = async (token: string) => {
    try {
      console.log('[Auth] Verifying token:', token ? `${token.substring(0, 10)}...` : 'null');
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Use the unified /me endpoint that handles both users and organizers
      const response = await axios.get(`${API_BASE_URL}/auth/me`);
      console.log('[Auth] /auth/me response:', response.data);
      
      // Handle both user and organizer responses
      const apiUser = response.data?.user;
      const apiOrganizer = response.data?.organizer;
      
      if (apiUser) {
        const ui = mapApiUserToUiUser(apiUser);
        setUser(ui);
        persistUser(ui);
        console.log('[Auth] User verified and set:', ui);
        return true;
      } else if (apiOrganizer) {
        const ui = mapApiUserToUiUser(apiOrganizer, 'ORGANIZER');
        setUser(ui);
        persistUser(ui);
        console.log('[Auth] Organizer verified and set:', ui);
        return true;
      }
      
      console.log('[Auth] No user or organizer data in response');
      return false;
    } catch (error) {
      console.error('[Auth] Token verification failed:', error);
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      delete axios.defaults.headers.common['Authorization'];
      setUser(null);
      return false;
    }
  };

  // Helper function to decode base64 (browser compatible)
  const base64Decode = (str: string): string => {
    try {
      return decodeURIComponent(atob(str).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
    } catch (e) {
      console.error('Base64 decode error:', e);
      return '';
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      console.log('[Auth] Initializing authentication');
      console.log('[Auth] Current URL:', window.location.href);
      console.log('[Auth] Current hash:', window.location.hash);
      
      // Check if we have auth data in the URL hash (new Google OAuth flow)
      // With HashRouter, the URL will be something like: http://localhost:5173/#/auth/callback#auth=ENCODED_DATA
      const hash = window.location.hash;
      console.log('[Auth] Processing full hash:', hash);
      
      // Look for auth data in the hash
      if (hash.includes('#auth=')) {
        try {
          console.log('[Auth] Processing Google OAuth callback from URL hash');
          
          // Extract auth data from the hash
          // The hash will be something like: #/auth/callback#auth=ENCODED_DATA
          // We need to get the part after #auth=
          const hashParts = hash.split('#auth=');
          console.log('[Auth] Hash parts:', hashParts);
          
          if (hashParts.length > 1) {
            const authDataEncoded = decodeURIComponent(hashParts[1]);
            console.log('[Auth] Encoded auth data:', authDataEncoded.substring(0, 50) + '...');
            
            const authDataJson = base64Decode(authDataEncoded);
            console.log('[Auth] Decoded auth data JSON:', authDataJson.substring(0, 100) + '...');
            
            const authData = JSON.parse(authDataJson);
            console.log('[Auth] Parsed auth data:', authData);

            if (authData && authData.user) {
              console.log('[Auth] Valid auth data found, setting up user session');
              
              // Store tokens if provided
              if (authData.tokens) {
                console.log('[Auth] Storing tokens');
                localStorage.setItem('token', authData.tokens.accessToken);
                if (authData.tokens.refreshToken) {
                  localStorage.setItem('refreshToken', authData.tokens.refreshToken);
                }
              }

              // Set axios default authorization header
              if (authData.tokens?.accessToken) {
                console.log('[Auth] Setting axios authorization header');
                axios.defaults.headers.common['Authorization'] = `Bearer ${authData.tokens.accessToken}`;
              }

              // Map and set user
              const ui = mapApiUserToUiUser(authData.user);
              console.log('[Auth] Mapped user data:', ui);
              
              setUser(ui);
              persistUser(ui, authData.tokens);
              console.log('[Auth] User state set and persisted');

              // Clear the hash from URL - but keep the route
              console.log('[Auth] Clearing auth data from URL hash');
              const currentPath = window.location.hash.split('#auth=')[0];
              window.history.replaceState(null, '', window.location.pathname + window.location.search + currentPath);
              
              setLoading(false);
              console.log('[Auth] Authentication initialization completed');
              return;
            } else {
              console.log('[Auth] No valid user data in auth data');
            }
          }
        } catch (error) {
          console.error('[Auth] Error processing auth data from URL hash:', error);
        }
      } else {
        console.log('[Auth] No auth data in URL hash');
      }

      // Check for existing token in localStorage
      const token = localStorage.getItem('token');
      console.log('[Auth] Checking for existing token:', token ? `${token.substring(0, 10)}...` : 'null');
      
      if (token) {
        await verifyToken(token);
      }
      
      setLoading(false);
      console.log('[Auth] Authentication initialization completed');
    };

    initAuth();
  }, []);

  const login = async (identifier: string, sifre: string, tip: 'user' | 'organizer') => {
    try {
      console.log('[Auth] Logging in user:', identifier, tip);
      
      const endpoint = tip === 'organizer' ? `${API_BASE_URL}/auth/login-organizer` : `${API_BASE_URL}/auth/login`;
      const trimmed = (identifier || '').trim();
      const isEmail = /.+@.+\..+/.test(trimmed);
      const payload = tip === 'organizer'
        ? { email: trimmed, password: sifre }
        : (isEmail ? { email: trimmed, password: sifre } : { phone: trimmed, password: sifre });
      
      const response = await axios.post(endpoint, payload);
      console.log('[Auth] Login response:', response.data);

      const apiUser = response.data?.user || response.data?.organizer;
      const tokens = response.data?.tokens;
      const accessToken: string | undefined = tokens?.accessToken;
      const refreshToken: string | undefined = tokens?.refreshToken;

      if (accessToken) {
        localStorage.setItem('token', accessToken);
        axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
        console.log('[Auth] Access token set');
      }
      if (refreshToken) {
        localStorage.setItem('refreshToken', refreshToken);
        console.log('[Auth] Refresh token set');
      }

      if (apiUser) {
        const ui = mapApiUserToUiUser(apiUser);
        setUser(ui);
        persistUser(ui, { accessToken, refreshToken });
        console.log('[Auth] User set and persisted');
      } else if (accessToken) {
        await verifyToken(accessToken);
      }
    } catch (error) {
      console.error('[Auth] Login failed:', error);
      throw error;
    }
  };

  const loginWithGoogle = async () => {
    try {
      console.log('[Auth] Initiating Google login');
      
      // Start Google OAuth flow
      const response = await axios.post(`${API_BASE_URL}/auth/google/start`, {
        redirectUri: `${window.location.origin}/auth/callback`
      });
      console.log('[Auth] Google start response:', response.data);

      const { authUrl, state } = response.data;

      // Store state for CSRF protection
      sessionStorage.setItem('oauth_state', state);
      console.log('[Auth] OAuth state stored');

      // Redirect to Google OAuth
      window.location.href = authUrl;
      console.log('[Auth] Redirecting to Google OAuth');

    } catch (error) {
      console.error('[Auth] Google login failed:', error);
      throw error;
    }
  };

  const register = async (userData: any) => {
    try {
      console.log('[Auth] Registering user');
      
      const response = await axios.post(`${API_BASE_URL}/auth/register`, userData);
      console.log('[Auth] Registration response:', response.data);
      
      const apiUser = response.data?.user;
      const tokens = response.data?.tokens;
      const accessToken: string | undefined = tokens?.accessToken;
      const refreshToken: string | undefined = tokens?.refreshToken;

      if (accessToken) {
        localStorage.setItem('token', accessToken);
        axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
        console.log('[Auth] Access token set');
      }
      if (refreshToken) {
        localStorage.setItem('refreshToken', refreshToken);
        console.log('[Auth] Refresh token set');
      }

      if (apiUser) {
        const ui = mapApiUserToUiUser(apiUser);
        setUser(ui);
        persistUser(ui, { accessToken, refreshToken });
        console.log('[Auth] User set and persisted');
      } else if (accessToken) {
        await verifyToken(accessToken);
      }
    } catch (error) {
      console.error('[Auth] Registration failed:', error);
      throw error;
    }
  };

  const registerOrganizer = async (organizerData: any) => {
    try {
      console.log('[Auth] Registering organizer');
      
      const response = await axios.post(
        `${API_BASE_URL}/auth/register-organizer`,
        organizerData
      );
      console.log('[Auth] Organizer registration response:', response.data);
      
      const apiOrganizer = response.data?.organizer;
      const tokens = response.data?.tokens;
      const accessToken: string | undefined = tokens?.accessToken;
      const refreshToken: string | undefined = tokens?.refreshToken;

      if (accessToken) {
        localStorage.setItem('token', accessToken);
        axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
        console.log('[Auth] Access token set');
      }
      if (refreshToken) {
        localStorage.setItem('refreshToken', refreshToken);
        console.log('[Auth] Refresh token set');
      }

      if (apiOrganizer) {
        const ui = mapApiUserToUiUser(apiOrganizer, 'ORGANIZER');
        setUser(ui);
        persistUser(ui, { accessToken, refreshToken });
        console.log('[Auth] Organizer set and persisted');
      }
    } catch (error) {
      console.error('[Auth] Organizer registration failed:', error);
      throw error;
    }
  };

  const logout = () => {
    console.log('[Auth] Logging out');
    
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user:id');
    localStorage.removeItem('user:email');
    localStorage.removeItem('user:firstName');
    localStorage.removeItem('user:lastName');
    localStorage.removeItem('user:type');
    localStorage.removeItem('user:adminRole')
    localStorage.removeItem('login:userType');
    localStorage.removeItem('login:identifier');
    localStorage.removeItem('login:remember');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    
    console.log('[Auth] Logout completed');
  };

  const value = {
    user,
    loading,
    login,
    loginWithGoogle,
    register,
    registerOrganizer,
    logout,
    isAuthenticated: !!user,
    isOrganizer: user?.userType === 'ORGANIZER',
    isAdmin: user?.userType === 'ADMIN' || user?.adminRole === 'ADMIN'
  };

  console.log('[Auth] Provider value:', {
    user: user ? `${user.isim} ${user.soyisim}` : 'null',
    loading,
    isAuthenticated: !!user,
    isOrganizer: user?.userType === 'ORGANIZER',
    isAdmin: user?.userType === 'ADMIN' || user?.adminRole === 'ADMIN'
  });

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext; 