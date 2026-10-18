import React from 'react';
import { Link } from 'react-router-dom';
import { Activity, HeartPulse } from 'lucide-react';

const currentYear = new Date().getFullYear();

export const Footer = () => {
  return (
    <footer className="bg-slate-900 text-slate-300 pt-16 pb-12 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Emergency Medical Disclaimer Alert */}
        <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-4 mb-12 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center shrink-0">
              <HeartPulse className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Emergency Medical Notice</h4>
              <p className="text-xs text-slate-400">
                MediCloud is for scheduled non-emergency consultations. For a medical emergency, contact local emergency services.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-slate-800">
          {/* Brand Info */}
          <div className="lg:col-span-2 space-y-4">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-teal-500 text-white flex items-center justify-center shadow-xs">
                <Activity className="w-5 h-5" />
              </div>
              <span className="text-xl font-bold text-white tracking-tight">
                Medi<span className="text-teal-400">Cloud</span>
              </span>
            </Link>
            <p className="text-sm text-slate-400 max-w-sm leading-relaxed">
              MediCloud is a healthcare appointment scheduling platform for browsing doctor profiles, booking visits, and managing patient records.
            </p>
            <p className="text-xs text-slate-500 pt-2">Privacy and security depend on the deployment configuration.</p>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-200">Patient Services</h5>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>
                <Link to="/doctors" className="hover:text-teal-400 transition-colors">
                  Find Specialists
                </Link>
              </li>
              <li>
                <Link to="/patient/dashboard" className="hover:text-teal-400 transition-colors">
                  Patient Portal
                </Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-teal-400 transition-colors">
                  Register Patient Account
                </Link>
              </li>
              <li>
                <a href="#how-it-works" className="hover:text-teal-400 transition-colors">
                  How Booking Works
                </a>
              </li>
            </ul>
          </div>

          {/* Clinicians & Providers */}
          <div className="space-y-3">
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-200">For Clinicians</h5>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>
                <Link to="/doctor/dashboard" className="hover:text-teal-400 transition-colors">
                  Doctor Schedule Portal
                </Link>
              </li>
              <li>
                <Link to="/admin/dashboard" className="hover:text-teal-400 transition-colors">
                  Clinical Administration
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-teal-400 transition-colors">
                  Provider Login
                </Link>
              </li>
              <li>
                <span className="text-slate-500 text-xs">Telehealth Standards</span>
              </li>
            </ul>
          </div>

          {/* Contact & Support */}
          <div className="space-y-3">
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-200">Service information</h5>
            <p className="text-xs text-slate-400">Contact and clinical service details must be configured by the deploying organization.</p>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {currentYear} MediCloud Healthcare Platform.</p>
          <div className="flex items-center gap-6">
            <span className="hover:text-slate-400 transition-colors">Privacy Policy</span>
            <span className="hover:text-slate-400 transition-colors">Terms of Service</span>
            <span className="hover:text-slate-400 transition-colors">Compliance Verification</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
