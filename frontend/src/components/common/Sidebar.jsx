import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  CalendarCheck,
  Calendar,
  Users,
  Stethoscope,
  LogOut,
  ChevronRight,
  User
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const Sidebar = () => {
  const { currentUser, currentRole, switchRole, logout } = useApp();
  const navigate = useNavigate();

  const getNavLinks = () => {
    switch (currentRole) {
      case 'doctor':
        return [
          { label: 'Overview', path: '/doctor/dashboard', icon: LayoutDashboard },
          { label: 'Schedule & Slots', path: '/doctor/schedule', icon: Calendar },
          { label: 'Patients List', path: '/doctor/patients', icon: Users },
        ];
      case 'admin':
        return [
          { label: 'System Overview', path: '/admin/dashboard', icon: LayoutDashboard },
          { label: 'Manage Doctors', path: '/admin/doctors', icon: Stethoscope },
          { label: 'All Appointments', path: '/admin/appointments', icon: CalendarCheck },
        ];
      case 'patient':
      default:
        return [
          { label: 'Dashboard', path: '/patient/dashboard', icon: LayoutDashboard },
          { label: 'My Appointments', path: '/patient/appointments', icon: CalendarCheck },
          { label: 'Find Doctors', path: '/doctors', icon: Stethoscope },
          { label: 'Health Profile', path: '/patient/profile', icon: User },
        ];
    }
  };

  const navLinks = getNavLinks();

  return (
    <aside className="w-64 bg-white border-r border-slate-200/90 flex flex-col justify-between shrink-0 min-h-[calc(100vh-4.5rem)]">
      <div className="p-4 space-y-6">
        {/* User Mini Profile Card */}
        {currentUser && (
          <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80 flex items-center gap-3">
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0"
            />
            <div className="min-w-0 flex-1">
              <h5 className="text-xs font-bold text-slate-900 truncate">{currentUser.name}</h5>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-teal-500" />
                <span className="text-2xs font-semibold uppercase tracking-wider text-teal-700">
                  {currentRole}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Menu */}
        <nav className="space-y-1">
          <div className="px-3 pb-2 text-2xs font-bold uppercase tracking-wider text-slate-400">
            {currentRole} Navigation
          </div>
          {navLinks.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-teal-50 text-teal-700 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-40" />
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Bottom Switcher & Sign Out */}
      <div className="p-4 border-t border-slate-100 space-y-3 bg-slate-50/50">
        <div className="text-2xs font-bold uppercase tracking-wider text-slate-400">
          Demo Role Switcher
        </div>
        <div className="grid grid-cols-3 gap-1">
          <button
            type="button"
            onClick={() => {
              switchRole('patient');
              navigate('/patient/dashboard');
            }}
            className={`py-1.5 px-1 rounded-md text-2xs font-bold text-center border transition-colors ${
              currentRole === 'patient'
                ? 'bg-teal-600 text-white border-teal-600'
                : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200'
            }`}
          >
            Patient
          </button>
          <button
            type="button"
            onClick={() => {
              switchRole('doctor');
              navigate('/doctor/dashboard');
            }}
            className={`py-1.5 px-1 rounded-md text-2xs font-bold text-center border transition-colors ${
              currentRole === 'doctor'
                ? 'bg-teal-600 text-white border-teal-600'
                : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200'
            }`}
          >
            Doctor
          </button>
          <button
            type="button"
            onClick={() => {
              switchRole('admin');
              navigate('/admin/dashboard');
            }}
            className={`py-1.5 px-1 rounded-md text-2xs font-bold text-center border transition-colors ${
              currentRole === 'admin'
                ? 'bg-teal-600 text-white border-teal-600'
                : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200'
            }`}
          >
            Admin
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            logout();
            navigate('/login');
          }}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-100 cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Exit Demo Session</span>
        </button>
      </div>
    </aside>
  );
};
