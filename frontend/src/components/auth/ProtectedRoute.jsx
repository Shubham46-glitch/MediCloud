import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useApp } from '../../context/AppContext';

export const ProtectedRoute = ({ roles }) => {
  const { currentUser, currentRole, authLoading } = useApp();
  if (authLoading) return <div className="min-h-screen grid place-items-center text-sm text-slate-600">Restoring your secure session…</div>;
  if (!currentUser) return <Navigate to="/login" replace />;
  if (!roles.includes(currentRole)) {
    const home = { patient: '/patient/dashboard', doctor: '/doctor/dashboard', admin: '/admin/dashboard' };
    return <Navigate to={home[currentRole] || '/'} replace />;
  }
  return <Outlet />;
};
