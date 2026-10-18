import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Activity, Mail, Lock, ArrowRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';

const dashboardFor = { patient: '/patient/dashboard', doctor: '/doctor/dashboard', admin: '/admin/dashboard' };

export const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, showToast } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (event) => {
    event.preventDefault();
    setError('');
    if (!email.trim() || !password) {
      setError('Enter your email address and password.');
      return;
    }
    setIsLoading(true);
    try {
      const user = await login(email.trim(), password);
      const destination = dashboardFor[user.role];
      if (!destination) throw new Error('This account does not have an enabled portal role.');
      navigate(location.state?.from || destination, { replace: true });
    } catch (failure) {
      setError(failure.message || 'Sign in failed. Please try again.');
      showToast(failure.message || 'Sign in failed.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link to="/" className="flex items-center justify-center gap-2.5 mb-6 group">
          <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-xs"><Activity className="w-6 h-6" /></div>
          <span className="text-2xl font-extrabold text-slate-900 tracking-tight">Medi<span className="text-teal-600">Cloud</span></span>
        </Link>
        <h2 className="text-center text-2xl font-extrabold text-slate-900 tracking-tight">Sign in to MediCloud</h2>
        <p className="mt-1 text-center text-xs text-slate-500">Your account determines which portal you can access.</p>
      </div>
      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4">
        {location.state?.registered && <div role="status" className="mb-4 rounded-xl border border-teal-200 bg-teal-50 p-3 text-sm text-teal-900">Account created. If email verification is enabled, verify your address before signing in.</div>}
        <div className="bg-white py-8 px-6 sm:px-8 rounded-2xl shadow-md border border-slate-200/90">
          <form onSubmit={handleLogin} className="space-y-4" noValidate>
            <Input label="Email Address" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@domain.com" icon={Mail} required />
            <Input label="Password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} icon={Lock} required />
            {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
            <Button type="submit" variant="primary" className="w-full justify-center py-2.5" isLoading={isLoading} rightIcon={ArrowRight}>Sign In</Button>
          </form>
          <div className="text-center text-xs text-slate-500 mt-6 pt-4 border-t border-slate-100">
            Need a patient account? <Link to="/register" className="font-semibold text-teal-700 hover:underline">Register here</Link>
          </div>
        </div>
      </div>
    </div>
  );
};
