import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  // Restore session from localStorage on mount
  useEffect(() => {
    const checkLoggedIn = async () => {
      const token = localStorage.getItem('eers_token');
      if (token) {
        try {
          const res = await api.get('/auth/profile');
          if (res.data.success) {
            setUser(res.data);
          } else {
            localStorage.removeItem('eers_token');
            localStorage.removeItem('eers_refresh_token');
          }
        } catch (error) {
          console.error('Session restoration failed:', error.message);
          localStorage.removeItem('eers_token');
          localStorage.removeItem('eers_refresh_token');
        }
      }
      setLoading(false);
    };
    checkLoggedIn();
  }, []);

  const login = async (email, password) => {
    try {
      setLoading(true);
      const res = await api.post('/auth/login', { email, password });
      if (res.data.success) {
        localStorage.setItem('eers_token', res.data.token);
        if (res.data.refreshToken) {
          localStorage.setItem('eers_refresh_token', res.data.refreshToken);
        }
        setUser(res.data);
        showToast(`Successfully logged in as ${res.data.name}`, 'success');
        return res.data;
      }
    } catch (error) {
      const msg = error.response?.data?.message || 'Login failed. Please check your credentials.';
      showToast(msg, 'error');
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem('eers_refresh_token');
      await api.post('/auth/logout', { refreshToken }).catch(() => {});
    } catch (e) {
      // Logout should always succeed client-side
    }
    localStorage.removeItem('eers_token');
    localStorage.removeItem('eers_refresh_token');
    setUser(null);
    showToast('Signed out of session console.', 'info');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
export default useAuth;
