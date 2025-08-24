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
      localStorage.setItem('user:id', uiUser.id);
      localStorage.setItem('user:email', uiUser.email);
      localStorage.setItem('user:firstName', uiUser.isim || '');
      localStorage.setItem('user:lastName', uiUser.soyisim || '');
      localStorage.setItem('user:type', uiUser.userType);
      if (uiUser.adminRole) localStorage.setItem('user:adminRole', uiUser.adminRole);
      if (tokens?.accessToken) localStorage.setItem('token', tokens.accessToken);
      if (tokens?.refreshToken) localStorage.setItem('refreshToken', tokens.refreshToken);
    } catch {}
  };

  const verifyToken = async (token: string) => {
    try {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Use the unified /me endpoint that handles both users and organizers
      const response = await axios.get(`${API_BASE_URL}/auth/me`);
      
      // Handle both user and organizer responses
      const apiUser = response.data?.user;
      const apiOrganizer = response.data?.organizer;
      
      if (apiUser) {
        const ui = mapApiUserToUiUser(apiUser);
        setUser(ui);
        persistUser(ui);
        return true;
      } else if (apiOrganizer) {
        const ui = mapApiUserToUiUser(apiOrganizer, 'ORGANIZER');
        setUser(ui);
        persistUser(ui);
        return true;
      }
      
      return false;
    } catch (_error) {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      delete axios.defaults.headers.common['Authorization'];
      setUser(null);
      return false;
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        await verifyToken(token);
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (identifier: string, sifre: string, tip: 'user' | 'organizer') => {
    try {
      const endpoint = tip === 'organizer' ? `${API_BASE_URL}/auth/login-organizer` : `${API_BASE_URL}/auth/login`;
      const trimmed = (identifier || '').trim();
      const isEmail = /.+@.+\..+/.test(trimmed);
      const payload = tip === 'organizer'
        ? { email: trimmed, password: sifre }
        : (isEmail ? { email: trimmed, password: sifre } : { phone: trimmed, password: sifre });
      const response = await axios.post(endpoint, payload);

      const apiUser = response.data?.user || response.data?.organizer;
      const tokens = response.data?.tokens;
      const accessToken: string | undefined = tokens?.accessToken;
      const refreshToken: string | undefined = tokens?.refreshToken;

      if (accessToken) {
        localStorage.setItem('token', accessToken);
        axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
      }
      if (refreshToken) {
        localStorage.setItem('refreshToken', refreshToken);
      }

      if (apiUser) {
        const ui = mapApiUserToUiUser(apiUser);
        setUser(ui);
        persistUser(ui, { accessToken, refreshToken });
      } else if (accessToken) {
        await verifyToken(accessToken);
      }
    } catch (error) {
      throw error;
    }
  };

  const register = async (userData: any) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/register`, userData);
      const apiUser = response.data?.user;
      const tokens = response.data?.tokens;
      const accessToken: string | undefined = tokens?.accessToken;
      const refreshToken: string | undefined = tokens?.refreshToken;

      if (accessToken) {
        localStorage.setItem('token', accessToken);
        axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
      }
      if (refreshToken) {
        localStorage.setItem('refreshToken', refreshToken);
      }

      if (apiUser) {
        const ui = mapApiUserToUiUser(apiUser);
        setUser(ui);
        persistUser(ui, { accessToken, refreshToken });
      } else if (accessToken) {
        await verifyToken(accessToken);
      }
    } catch (error) {
      throw error;
    }
  };

  const registerOrganizer = async (organizerData: any) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/auth/register-organizer`,
        organizerData
      );
      const apiOrganizer = response.data?.organizer;
      const tokens = response.data?.tokens;
      const accessToken: string | undefined = tokens?.accessToken;
      const refreshToken: string | undefined = tokens?.refreshToken;

      if (accessToken) {
        localStorage.setItem('token', accessToken);
        axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
      }
      if (refreshToken) {
        localStorage.setItem('refreshToken', refreshToken);
      }

      if (apiOrganizer) {
        const ui = mapApiUserToUiUser(apiOrganizer, 'ORGANIZER');
        setUser(ui);
        persistUser(ui, { accessToken, refreshToken });
      }
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
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
  };

  const value = {
    user,
    loading,
    login,
    register,
    registerOrganizer,
    logout,
    isAuthenticated: !!user,
    isOrganizer: user?.userType === 'ORGANIZER',
    isAdmin: user?.userType === 'ADMIN' || user?.adminRole === 'ADMIN'
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext; 