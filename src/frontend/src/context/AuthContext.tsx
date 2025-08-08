import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

interface User {
  id: string;
  isim: string;
  soyisim: string;
  email: string;
  tip: 'user' | 'organizer';
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, sifre: string, tip: 'user' | 'organizer') => Promise<void>;
  register: (userData: any) => Promise<void>;
  registerOrganizer: (organizerData: any) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isOrganizer: boolean;
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

  const verifyToken = async (token: string) => {
    try {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      const response = await axios.get(`${API_BASE_URL}/auth/verify`);
      setUser(response.data.user);
      return true;
    } catch (error) {
      localStorage.removeItem('token');
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

  const login = async (email: string, sifre: string, tip: 'user' | 'organizer') => {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        email,
        sifre,
        tip
      });

      const { token, user: responseUser } = response.data;
      localStorage.setItem('token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      // Prefer response user if available, otherwise verify
      if (responseUser) {
        setUser(responseUser);
      } else {
        await verifyToken(token);
      }
    } catch (error) {
      throw error;
    }
  };

  const register = async (userData: any) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/register`, userData);
      const { token, user: responseUser } = response.data;
      localStorage.setItem('token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      if (responseUser) {
        setUser(responseUser);
      } else {
        await verifyToken(token);
      }
    } catch (error) {
      throw error;
    }
  };

  const registerOrganizer = async (organizerData: any) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/auth/register/organizer`,
        organizerData
      );
      const { token, user: responseUser } = response.data;
      localStorage.setItem('token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      if (responseUser) {
        setUser(responseUser);
      } else {
        await verifyToken(token);
      }
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
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
    isOrganizer: user?.tip === 'organizer'
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext; 