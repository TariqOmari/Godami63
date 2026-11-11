import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

export default function RouteProtector({ children }) {
  const location = useLocation();
  const token = sessionStorage.getItem('auth_token');

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}