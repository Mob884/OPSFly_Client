"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import api, { invalidateNotesCache, invalidateTasksCache } from '@/src/services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Set up request interceptor for Axios instance so it always includes token
  useEffect(() => {
    const requestInterceptor = api.interceptors.request.use(
      (config) => {
        const storedToken = localStorage.getItem('opsfly_token');
        if (storedToken) {
          config.headers.Authorization = `Bearer ${storedToken}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Also handle automatic logout on 401 response interceptor
    const responseInterceptor = api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Automatic logout on unauthorized session
          logout();
        }
        return Promise.reject(error);
      }
    );

    return () => {
      api.interceptors.request.eject(requestInterceptor);
      api.interceptors.response.eject(responseInterceptor);
    };
  }, []);

  // Initialize auth state from local storage on mount
  useEffect(() => {
    async function loadStoredAuth() {
      try {
        const storedToken = localStorage.getItem('opsfly_token');
        const storedUser = localStorage.getItem('opsfly_user');

        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
          
          // Verify session integrity with server
          const response = await axios.get('/api/auth/me', {
            headers: { Authorization: `Bearer ${storedToken}` }
          });
          
          if (response.data?.user) {
            setUser(response.data.user);
            localStorage.setItem('opsfly_user', JSON.stringify(response.data.user));
          }
        }
      } catch (err) {
        console.warn('[Auth Initialization] Token expired or invalid, logging out.', err.message);
        logout();
      } finally {
        setLoading(false);
      }
    }
    loadStoredAuth();
  }, []);

  const login = async (email, password) => {
    try {
      const response = await axios.post('/api/auth/login', { email, password });
      const { token: receivedToken, user: receivedUser } = response.data;

      localStorage.setItem('opsfly_token', receivedToken);
      localStorage.setItem('opsfly_user', JSON.stringify(receivedUser));

      setToken(receivedToken);
      setUser(receivedUser);

      // Invalidate store caches to prevent cross-account leaks
      invalidateNotesCache();
      invalidateTasksCache();
      
      return response.data;
    } catch (error) {
      const message = error.response?.data?.error || error.message || 'Login failed';
      throw new Error(message);
    }
  };

  const register = async (name, email, password, role) => {
    try {
      const response = await axios.post('/api/auth/register', { name, email, password, role });
      const { token: receivedToken, user: receivedUser } = response.data;

      localStorage.setItem('opsfly_token', receivedToken);
      localStorage.setItem('opsfly_user', JSON.stringify(receivedUser));

      setToken(receivedToken);
      setUser(receivedUser);

      invalidateNotesCache();
      invalidateTasksCache();

      return response.data;
    } catch (error) {
      const message = error.response?.data?.error || error.message || 'Registration failed';
      throw new Error(message);
    }
  };

  const logout = () => {
    localStorage.removeItem('opsfly_token');
    localStorage.removeItem('opsfly_user');
    setToken(null);
    setUser(null);

    invalidateNotesCache();
    invalidateTasksCache();
  };

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
