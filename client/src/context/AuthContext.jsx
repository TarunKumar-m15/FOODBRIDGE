import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check login status on page mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (token) {
          // Verify user session by calling refresh-token or custom check
          const res = await api.post('/auth/refresh-token');
          const { accessToken } = res.data;
          localStorage.setItem('accessToken', accessToken);
          
          // Fetch current user details or extract payload
          // For simplicity, decode JWT or fetch base details. We'll decode JWT payload.
          const base64Url = accessToken.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const payload = JSON.parse(window.atob(base64));
          
          setUser({ id: payload.id, _id: payload.id, role: payload.role });
        }
      } catch (err) {
        console.error('Session restoration failed:', err.message);
        localStorage.removeItem('accessToken');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    initializeAuth();
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      const { accessToken, data } = res.data;
      localStorage.setItem('accessToken', accessToken);
      setUser({ ...data.user, id: data.user._id });
      return { success: true };
    } catch (error) {
      localStorage.removeItem('accessToken');
      setUser(null);
      return {
        success: false,
        error: error.response?.data?.message || 'Login failed. Please check credentials.',
      };
    } finally {
      setLoading(false);
    }
  };

  const register = async (formData) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/register', formData);
      const { accessToken, data } = res.data;
      localStorage.setItem('accessToken', accessToken);
      setUser({ ...data.user, id: data.user._id });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Registration failed. Try again.',
      };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.error('Logout error:', err.message);
    } finally {
      localStorage.removeItem('accessToken');
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
