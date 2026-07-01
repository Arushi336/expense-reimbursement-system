import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

const AuthContext = createContext(null);

const ROLE_EMAILS = {
  employee: 'sarah.jenkins@corporate.com',
  hod: 'marcus.brody@corporate.com',
  finance: 'linda.vance@corporate.com',
  accounts: 'gary.cooper@corporate.com',
  admin: 'donald.knuth@corporate.com'
};

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
          }
        } catch (error) {
          console.error('Session restoration failed:', error.message);
          localStorage.removeItem('eers_token');
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

  const switchRole = async (roleKey) => {
    const email = ROLE_EMAILS[roleKey.toLowerCase()];
    if (email) {
      try {
        await login(email, 'password123');
      } catch (error) {
        console.error('Simulator role switch failed:', error.message);
      }
    } else {
      showToast(`Role shortcut ${roleKey} not registered in simulator`, 'error');
    }
  };

  const logout = () => {
    localStorage.removeItem('eers_token');
    setUser(null);
    showToast('Signed out of session console.', 'info');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, switchRole, logout, allRoles: Object.keys(ROLE_EMAILS) }}>
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
