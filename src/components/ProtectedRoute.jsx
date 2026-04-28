import React, { useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import useAuthStore from '../stores/useAuthStore';
import useToastStore from '../stores/useToastStore';

const ProtectedRoute = ({ children }) => {
  const { token, expiresAt, logout, isAuthenticated } = useAuthStore();
  const { showToast } = useToastStore();
  const navigate = useNavigate();

  useEffect(() => {
    // Token exists but has expired
    if (token && expiresAt && Date.now() >= expiresAt) {
      logout();
      showToast('Your session has expired. Please log in again.', 'info');
      navigate('/login', { replace: true });
    }
  }, [token, expiresAt, logout, showToast, navigate]);

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;