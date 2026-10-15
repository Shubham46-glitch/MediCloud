import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Activity, Mail, Lock, User, Stethoscope, Shield, ArrowRight, Info } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { mockUsers } from '../../data/mockUsers';

export const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useApp();

  const [selectedRole, setSelectedRole] = useState('patient');
  const [email, setEmail] = useState('sarah.jenkins@example.com');
  const [password, setPassword] = useState('DemoPassword123!');
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  // Switch form defaults when role changes
  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    setErrors({});
    if (role === 'patient') {
      setEmail('sarah.jenkins@example.com');
    } else if (role === 'doctor') {
      setEmail('marcus.vance@medicloud.demo');
    } else if (role === 'admin') {
      setEmail('admin@medicloud.demo');
    }
  };

  const validate = () => {
    const errs = {};
    if (!email) {
      errs.email = 'Email address is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errs.email = 'Please provide a valid email format';
    }

    if (!password) {
      errs.password = 'Password is required';
    } else if (password.length < 6) {
      errs.password = 'Password must be at least 6 characters';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      login(selectedRole, {
        ...mockUsers[selectedRole],
        email: email
      });

      if (selectedRole === 'doctor') navigate('/doctor/dashboard');
      else if (selectedRole === 'admin') navigate('/admin/dashboard');
      else navigate('/patient/dashboard');
    }, 400);
  };

  const handleInstantDemoLogin = (role) => {
    login(role, mockUsers[role]);
    if (role === 'doctor') navigate('/doctor/dashboard');
    else if (role === 'admin') navigate('/admin/dashboard');
    else navigate('/patient/dashboard');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Logo */}
        <Link to="/" className="flex items-center justify-center gap-2.5 mb-6 group">
          <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-xs">
            <Activity className="w-6 h-6" />
          </div>
          <span className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Medi<span className="text-teal-600">Cloud</span>
          </span>
        </Link>

        <h2 className="text-center text-2xl font-extrabold text-slate-900 tracking-tight">
          Sign In to Healthcare Portal
        </h2>
        <p className="mt-1 text-center text-xs text-slate-500">
          Select your platform role to access appointment management
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4">
        {/* Demo Notice Banner */}
        <div className="mb-5 bg-sky-50 border border-sky-200 rounded-xl p-3 text-xs text-sky-900 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-bold">Demo Environment:</span> No backend authentication is required. You can sign in using any mock credentials or use the 1-click quick logins below.
          </div>
        </div>

        {/* Card */}
        <div className="bg-white py-8 px-6 sm:px-8 rounded-2xl shadow-md border border-slate-200/90 space-y-6">
          {/* Role Selection Tabs */}
          <div>
            <label className="text-2xs font-bold uppercase tracking-wider text-slate-500 block mb-2">
              Select Your Access Role
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleRoleSelect('patient')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                  selectedRole === 'patient'
                    ? 'border-teal-600 bg-teal-50/70 text-teal-800 ring-1 ring-teal-600'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <User className="w-4 h-4 text-teal-600" />
                <span>Patient</span>
              </button>

              <button
                type="button"
                onClick={() => handleRoleSelect('doctor')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                  selectedRole === 'doctor'
                    ? 'border-teal-600 bg-teal-50/70 text-teal-800 ring-1 ring-teal-600'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Stethoscope className="w-4 h-4 text-teal-600" />
                <span>Doctor</span>
              </button>

              <button
                type="button"
                onClick={() => handleRoleSelect('admin')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                  selectedRole === 'admin'
                    ? 'border-teal-600 bg-teal-50/70 text-teal-800 ring-1 ring-teal-600'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Shield className="w-4 h-4 text-teal-600" />
                <span>Admin</span>
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@domain.com"
              icon={Mail}
              error={errors.email}
              required
            />

            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              icon={Lock}
              error={errors.password}
              required
            />

            <Button
              type="submit"
              variant="primary"
              className="w-full justify-center py-2.5"
              isLoading={isLoading}
              rightIcon={ArrowRight}
            >
              Sign In as {selectedRole.toUpperCase()}
            </Button>
          </form>

          {/* Quick 1-Click Demo Login Shortcuts */}
          <div className="pt-4 border-t border-slate-100">
            <span className="text-2xs font-bold uppercase tracking-wider text-slate-400 block mb-2 text-center">
              Quick 1-Click Demo Logins
            </span>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleInstantDemoLogin('patient')}
                className="w-full text-xs font-medium py-2 px-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-teal-50 hover:border-teal-300 text-slate-700 flex items-center justify-between transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-teal-600" />
                  <span>Log in as Patient (Sarah Jenkins)</span>
                </div>
                <span className="text-2xs text-teal-700 font-bold">Fast Access →</span>
              </button>

              <button
                type="button"
                onClick={() => handleInstantDemoLogin('doctor')}
                className="w-full text-xs font-medium py-2 px-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-teal-50 hover:border-teal-300 text-slate-700 flex items-center justify-between transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Stethoscope className="w-3.5 h-3.5 text-teal-600" />
                  <span>Log in as Doctor (Dr. Marcus Vance)</span>
                </div>
                <span className="text-2xs text-teal-700 font-bold">Fast Access →</span>
              </button>

              <button
                type="button"
                onClick={() => handleInstantDemoLogin('admin')}
                className="w-full text-xs font-medium py-2 px-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-teal-50 hover:border-teal-300 text-slate-700 flex items-center justify-between transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-teal-600" />
                  <span>Log in as Administrator (Eleanor Vance)</span>
                </div>
                <span className="text-2xs text-teal-700 font-bold">Fast Access →</span>
              </button>
            </div>
          </div>

          {/* Bottom link */}
          <div className="text-center text-xs text-slate-500 pt-2 border-t border-slate-100">
            Don't have a patient account?{' '}
            <Link to="/register" className="font-semibold text-teal-700 hover:underline">
              Register as New Patient
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
