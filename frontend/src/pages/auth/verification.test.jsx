import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { RegisterPage } from './RegisterPage';
import { VerifyEmailPage } from './VerifyEmailPage';

const appContext = vi.hoisted(() => ({
  registerPatient: vi.fn(),
  confirmRegistration: vi.fn(),
  resendRegistrationCode: vi.fn(),
  showToast: vi.fn(),
}));

vi.mock('../../context/AppContext', () => ({ useApp: () => appContext }));

const NavigationResult = () => {
  const location = useLocation();
  return <output data-testid="navigation-result">{JSON.stringify({ pathname: location.pathname, state: location.state })}</output>;
};

const renderRoutes = (initialEntry, page) => render(
  <MemoryRouter initialEntries={[initialEntry]}>
    <Routes>
      <Route path="/register" element={page === 'register' ? <RegisterPage /> : <NavigationResult />} />
      <Route path="/verify-email" element={page === 'verify' ? <VerifyEmailPage /> : <NavigationResult />} />
      <Route path="/login" element={<NavigationResult />} />
      <Route path="/patient/dashboard" element={<NavigationResult />} />
    </Routes>
  </MemoryRouter>,
);

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('registration verification screens', () => {
  it('routes a pending registration to Verify Your Email without carrying the password', async () => {
    appContext.registerPatient.mockResolvedValue({
      needsConfirmation: true,
      deliveryDestination: 'p***@e***.test',
    });
    renderRoutes('/register', 'register');

    for (const [label, value] of [
      ['First Name', 'Ada'], ['Last Name', 'Patient'], ['Email Address', 'ada@example.test'],
      ['Phone Number', '+15555550123'], ['Password', 'synthetic-password'], ['Confirm Password', 'synthetic-password'],
    ]) fireEvent.change(screen.getByLabelText(new RegExp(`^${label}(?:\\s+\\*)?$`)), { target: { value } });

    fireEvent.submit(screen.getByRole('button', { name: /create account/i }).closest('form'));

    await waitFor(() => expect(screen.getByTestId('navigation-result').textContent).toContain('/verify-email'));
    const result = JSON.parse(screen.getByTestId('navigation-result').textContent);
    expect(result.state).toEqual({ email: 'ada@example.test', deliveryDestination: 'p***@e***.test' });
    expect(JSON.stringify(result)).not.toContain('synthetic-password');
  });

  it('confirms the entered code and navigates to sign in', async () => {
    appContext.confirmRegistration.mockResolvedValue({ confirmed: true });
    renderRoutes({ pathname: '/verify-email', state: { email: 'ada@example.test', deliveryDestination: 'p***@e***.test' } }, 'verify');

    expect(screen.getByText(/code Cognito sent to p\*\*\*@e\*\*\*\.test/i)).toBeTruthy();
    fireEvent.change(screen.getByLabelText(/^Confirmation Code/), { target: { value: '123456' } });
    fireEvent.submit(screen.getByRole('button', { name: /verify email/i }).closest('form'));

    await waitFor(() => expect(screen.getByTestId('navigation-result').textContent).toContain('/login'));
    expect(appContext.confirmRegistration).toHaveBeenCalledWith('ada@example.test', '123456');
  });

  it('shows a safe error and supports resending a code', async () => {
    appContext.confirmRegistration.mockRejectedValueOnce(Object.assign(new Error('That code is invalid. Try again.'), { code: 'INVALID_VERIFICATION_CODE' }));
    appContext.resendRegistrationCode.mockResolvedValue({ message: 'If the account can receive a code, one has been sent.' });
    renderRoutes({ pathname: '/verify-email', state: { email: 'ada@example.test' } }, 'verify');
    fireEvent.change(screen.getByLabelText(/^Confirmation Code/), { target: { value: '000000' } });
    fireEvent.submit(screen.getByRole('button', { name: /verify email/i }).closest('form'));
    expect((await screen.findByRole('alert')).textContent).toContain('That code is invalid. Try again.');

    fireEvent.click(screen.getByRole('button', { name: /resend code/i }));
    expect((await screen.findByRole('status')).textContent).toContain('one has been sent');
    expect(appContext.resendRegistrationCode).toHaveBeenCalledWith('ada@example.test');
  });
});
