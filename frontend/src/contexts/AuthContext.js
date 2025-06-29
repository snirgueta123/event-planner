// src/contexts/AuthContext.js
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from './ToastContext';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth חייב לשמש בתוך AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();
  const { addToast } = useToast();
  const backendUrl = 'https://event-planner-backend-kssg.onrender.com/';

  const fetchUser = useCallback(async (initialLoad = false) => {
    if (!initialLoad && loading) {
      return;
    }

    setLoading(true);
    const token = localStorage.getItem('authToken');

    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${backendUrl}/api/users/me/`, {
        headers: {
          'Authorization': `Token ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data);
      } else {
        localStorage.removeItem('authToken');
        setUser(null);
        addToast("אימות משתמש נכשל או פג תוקף. אנא התחבר מחדש.", "error");
        navigate('/login');
      }
    } catch (error) {
      console.error("שגיאה באחזור פרטי משתמש (בעיית רשת או תקלה לא צפויה).", error);
      setUser(null);
      addToast("שגיאת רשת. נכשל באחזור פרטי משתמש.", "error");
    } finally {
      setLoading(false);
    }
  }, [loading, setUser, setLoading, addToast, navigate, backendUrl]);

  useEffect(() => {
    if (loading && user === null) {
      fetchUser(true);
    }
  }, [fetchUser, loading, user]);

  const login = useCallback((token, userData) => {
    localStorage.setItem('authToken', token);
    setUser(userData);
    addToast("התחברת בהצלחה!", "success");
    setLoading(false);
  }, [addToast]);

  const logout = useCallback(() => {
    localStorage.removeItem('authToken');
    setUser(null);
    addToast('התנתקת בהצלחה.', 'info');
    navigate('/login');
    setLoading(false);
  }, [addToast, navigate]);
  const checkAuthStatus = useCallback(() => {
    fetchUser();
  }, [fetchUser]);

  const authContextValue = {
    user,
    isAuthenticated: !!user,
    loading,
    login,
    logout,
    checkAuthStatus,
  };

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
};
