import React from 'react';
import { Navigate } from 'react-router-dom';
import useAuthStore from '../stores/useAuthStore';
import SessionLoader from './SessionLoader';

const PublicRoute = ({ children }) => {
  const { status, isAuthenticated } = useAuthStore();

  if (status === 'checking') {
    return <SessionLoader />;
  }

  if (isAuthenticated()) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default PublicRoute;