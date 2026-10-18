import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Activity, ArrowRight, Mail } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';

const maskEmail = (email = '') => {
  const [local, domain] = email.split('@');
  if (!local || !domain) return '';
  const [host, ...suffix] = domain.split('.');
  return `${local.slice(0, 1)}***@${host.slice(0, 1)}***${suffix.length ? `.${suffix.join('.')}` : ''}`;
};

export const VerifyEmailPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { confirmRegistration, resendRegistrationCode, showToast } = useApp();
  const [email, setEmail] = useState(location.state?.email || '');
  const [destination, setDestination] = useState(location.state?.deliveryDestination || maskEmail(location.state?.email));
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [alreadyConfirmed, setAlreadyConfirmed] = useState(false);

  const handleVerify = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');
    setAlreadyConfirmed(false);
    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError('Enter the email address used to create your account.');
      return;
    }
    if (!code.trim()) {
      setError('Enter the confirmation code from your email.');
      return;
    }

    setIsVerifying(true);
    try {
      await confirmRegistration(email.trim(), code.trim());
      navigate('/login', { replace: true, state: { email: email.trim(), registered: true, confirmed: true } });
    } catch (failure) {
      setError(failure.message || 'We could not confirm the account. Please try again.');
      setAlreadyConfirmed(failure.code === 'ACCOUNT_ALREADY_CONFIRMED');
      showToast(failure.message || 'We could not confirm the account.', 'error');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setNotice('');
    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError('Enter the email address used to create your account.');
      return;
    }
    setIsResending(true);
    try {
      const result = await resendRegistrationCode(email.trim());
      if (result.deliveryDestination) setDestination(result.deliveryDestination);
      setNotice(result.message || 'If this account can receive a confirmation code, one has been sent.');
    } catch (failure) {
      setError(failure.message || 'We could not send a code. Please try again later.');
      showToast(failure.message || 'We could not send a code.', 'error');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link to="/" className="flex items-center justify-center gap-2.5 mb-6 group">
          <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-xs"><Activity className="w-6 h-6" /></div>
          <span className="text-2xl font-extrabold text-slate-900 tracking-tight">Medi<span className="text-teal-600">Cloud</span></span>
        </Link>
        <h1 className="text-center text-2xl font-extrabold text-slate-900 tracking-tight">Verify Your Email</h1>
        <p className="mt-2 text-center text-sm text-slate-600">
          Enter the code Cognito sent to {destination || 'your email address'}.
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 sm:px-8 rounded-2xl shadow-md border border-slate-200/90">
          <form onSubmit={handleVerify} className="space-y-4" noValidate>
            {!location.state?.email && (
              <Input label="Email Address" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@domain.com" icon={Mail} required />
            )}
            <Input
              label="Confirmation Code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="Enter the code from your email"
              autoComplete="one-time-code"
              inputMode="numeric"
              maxLength={128}
              required
            />
            {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
            {notice && <p role="status" className="text-sm text-teal-800">{notice}</p>}
            {alreadyConfirmed && <Link to="/login" state={{ email }} className="block text-sm font-semibold text-teal-700 hover:underline">Go to sign in</Link>}
            <Button type="submit" variant="primary" className="w-full justify-center py-2.5" isLoading={isVerifying} rightIcon={ArrowRight}>Verify Email</Button>
          </form>
          <div className="flex flex-col items-center gap-3 mt-5">
            <Button type="button" variant="secondary" className="w-full justify-center" isLoading={isResending} disabled={isVerifying} onClick={handleResend}>Resend Code</Button>
            <Link to="/login" state={{ email }} className="text-sm font-semibold text-teal-700 hover:underline">Back to sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
};
