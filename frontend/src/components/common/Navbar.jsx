import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Activity, Menu, X, Shield, User, Stethoscope, ChevronDown, LogOut, LayoutDashboard } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Button } from './Button';

export const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const { currentUser, currentRole, switchRole, logout } = useApp();

  const navLinks = [
    { label: 'Home', path: '/' },
    { label: 'Find Doctors', path: '/doctors' },
    { label: 'How It Works', path: '/#how-it-works' },
    { label: 'About', path: '/#about' }
  ];

  const handleRoleSwitch = (role) => {
    switchRole(role);
    setRoleDropdownOpen(false);
    if (role === 'patient') navigate('/patient/dashboard');
    else if (role === 'doctor') navigate('/doctor/dashboard');
    else if (role === 'admin') navigate('/admin/dashboard');
  };

  const getDashboardPath = () => {
    if (currentRole === 'doctor') return '/doctor/dashboard';
    if (currentRole === 'admin') return '/admin/dashboard';
    return '/patient/dashboard';
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 transition-all">
      {/* Demo Notification Bar */}
      <div className="bg-teal-900 text-teal-100 text-2xs py-1 px-4 text-center flex items-center justify-center gap-2">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
        <span>MediCloud Demo Environment • Live Interactive Simulation (No real medical data collected)</span>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-xs group-hover:bg-teal-700 transition-colors">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-1">
                Medi<span className="text-teal-600">Cloud</span>
              </span>
              <span className="text-2xs text-slate-400 block -mt-1 font-medium">Healthcare SaaS</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.label}
                  to={link.path}
                  className={`text-sm font-semibold transition-colors ${
                    isActive ? 'text-teal-600' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Right Header Actions */}
          <div className="hidden md:flex items-center gap-3">
            {/* Quick Demo Role Switcher */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200/70 text-slate-700 transition-colors border border-slate-200"
              >
                <span className="text-slate-400 uppercase text-2xs">Role:</span>
                <span className="capitalize text-teal-700">{currentRole || 'Guest'}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {roleDropdownOpen && (
                <div
                  className="absolute right-0 mt-1.5 w-52 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95"
                  onMouseLeave={() => setRoleDropdownOpen(false)}
                >
                  <div className="px-3 py-1.5 text-2xs uppercase tracking-wider font-bold text-slate-400 border-b border-slate-100">
                    Switch Active Demo Role
                  </div>
                  <button
                    onClick={() => handleRoleSwitch('patient')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-left hover:bg-teal-50/60 ${
                      currentRole === 'patient' ? 'text-teal-700 bg-teal-50 font-bold' : 'text-slate-700'
                    }`}
                  >
                    <User className="w-4 h-4 text-teal-600" />
                    <div>
                      <span>Patient View</span>
                      <span className="text-2xs text-slate-400 block font-normal">Sarah Jenkins</span>
                    </div>
                  </button>
                  <button
                    onClick={() => handleRoleSwitch('doctor')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-left hover:bg-teal-50/60 ${
                      currentRole === 'doctor' ? 'text-teal-700 bg-teal-50 font-bold' : 'text-slate-700'
                    }`}
                  >
                    <Stethoscope className="w-4 h-4 text-teal-600" />
                    <div>
                      <span>Doctor View</span>
                      <span className="text-2xs text-slate-400 block font-normal">Dr. Marcus Vance</span>
                    </div>
                  </button>
                  <button
                    onClick={() => handleRoleSwitch('admin')}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-left hover:bg-teal-50/60 ${
                      currentRole === 'admin' ? 'text-teal-700 bg-teal-50 font-bold' : 'text-slate-700'
                    }`}
                  >
                    <Shield className="w-4 h-4 text-teal-600" />
                    <div>
                      <span>Admin View</span>
                      <span className="text-2xs text-slate-400 block font-normal">Eleanor Vance</span>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* Auth / Dashboard Buttons */}
            {currentUser ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={LayoutDashboard}
                  onClick={() => navigate(getDashboardPath())}
                >
                  Dashboard
                </Button>
                <button
                  onClick={() => {
                    logout();
                    navigate('/login');
                  }}
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>
                  Login
                </Button>
                <Button variant="primary" size="sm" onClick={() => navigate('/register')}>
                  Get Started
                </Button>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center md:hidden gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              aria-label="Toggle mobile menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6 text-slate-800" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-4">
          <nav className="flex flex-col space-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:text-teal-600"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="pt-3 border-t border-slate-100 space-y-3">
            <div className="text-2xs font-bold uppercase tracking-wider text-slate-400 px-3">
              Switch Role View
            </div>
            <div className="grid grid-cols-3 gap-1.5 px-2">
              <button
                onClick={() => {
                  handleRoleSwitch('patient');
                  setMobileMenuOpen(false);
                }}
                className={`py-1.5 px-2 rounded text-xs font-semibold text-center border ${
                  currentRole === 'patient' ? 'bg-teal-50 border-teal-300 text-teal-800' : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                Patient
              </button>
              <button
                onClick={() => {
                  handleRoleSwitch('doctor');
                  setMobileMenuOpen(false);
                }}
                className={`py-1.5 px-2 rounded text-xs font-semibold text-center border ${
                  currentRole === 'doctor' ? 'bg-teal-50 border-teal-300 text-teal-800' : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                Doctor
              </button>
              <button
                onClick={() => {
                  handleRoleSwitch('admin');
                  setMobileMenuOpen(false);
                }}
                className={`py-1.5 px-2 rounded text-xs font-semibold text-center border ${
                  currentRole === 'admin' ? 'bg-teal-50 border-teal-300 text-teal-800' : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                Admin
              </button>
            </div>

            {currentUser ? (
              <div className="pt-2 flex flex-col gap-2">
                <Button
                  variant="primary"
                  className="w-full justify-center"
                  onClick={() => {
                    navigate(getDashboardPath());
                    setMobileMenuOpen(false);
                  }}
                >
                  Go to {currentRole?.toUpperCase()} Dashboard
                </Button>
                <Button
                  variant="secondary"
                  className="w-full justify-center text-rose-600"
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                    navigate('/login');
                  }}
                >
                  Logout
                </Button>
              </div>
            ) : (
              <div className="pt-2 grid grid-cols-2 gap-2">
                <Button
                  variant="secondary"
                  className="w-full justify-center"
                  onClick={() => {
                    navigate('/login');
                    setMobileMenuOpen(false);
                  }}
                >
                  Login
                </Button>
                <Button
                  variant="primary"
                  className="w-full justify-center"
                  onClick={() => {
                    navigate('/register');
                    setMobileMenuOpen(false);
                  }}
                >
                  Get Started
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
