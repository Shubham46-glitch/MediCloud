import React, { useState } from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import { Navbar } from '../components/common/Navbar';
import { Sidebar } from '../components/common/Sidebar';
import { ToastContainer } from '../components/common/ToastContainer';
import { useApp } from '../context/AppContext';
import { Menu, X, ChevronRight } from 'lucide-react';

export const DashboardLayout = () => {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const { currentRole, currentUser } = useApp();
  const location = useLocation();

  // Determine current section title
  const getPageTitle = () => {
    const path = location.pathname;
    if (path.includes('/patient/appointments')) return 'My Appointments';
    if (path.includes('/patient/profile')) return 'Patient Health Profile';
    if (path.includes('/doctor/schedule')) return 'Availability & Slots';
    if (path.includes('/doctor/patients')) return 'Patient Directory';
    if (path.includes('/admin/doctors')) return 'Manage Doctors & Specialties';
    if (path.includes('/admin/appointments')) return 'All Platform Appointments';
    return `${currentRole ? currentRole.charAt(0).toUpperCase() + currentRole.slice(1) : ''} Overview`;
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
      <Navbar />

      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block shrink-0">
          <Sidebar />
        </div>

        {/* Mobile Sidebar Modal/Overlay */}
        {mobileSidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            <div
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
              onClick={() => setMobileSidebarOpen(false)}
            />
            <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white z-10 shadow-2xl">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                <span className="text-sm font-bold text-slate-800">Navigation Menu</span>
                <button
                  onClick={() => setMobileSidebarOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto" onClick={() => setMobileSidebarOpen(false)}>
                <Sidebar />
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 flex flex-col p-4 sm:p-6 lg:p-8">
          {/* Top Bar with Mobile Menu Toggle & Title */}
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(true)}
                className="lg:hidden p-2 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs"
                aria-label="Open sidebar menu"
              >
                <Menu className="w-5 h-5" />
              </button>

              <div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-0.5">
                  <Link to="/" className="hover:text-teal-600 transition-colors">Portal</Link>
                  <ChevronRight className="w-3 h-3 text-slate-400" />
                  <span className="capitalize text-teal-700 font-semibold">{currentRole}</span>
                </div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{getPageTitle()}</h1>
              </div>
            </div>

            {/* Quick Demo Pill / Info */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-200/80">
                <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
                Active as: <span className="underline decoration-teal-400">{currentUser?.name}</span>
              </span>
            </div>
          </div>

          <Outlet />
        </main>
      </div>

      <ToastContainer />
    </div>
  );
};
