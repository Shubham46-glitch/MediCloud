import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiRequest, getAccessToken, setAccessToken } from '../utils/api';

const AppContext = createContext(null);
const normalizeDoctor = (doctor) => ({ ...doctor, id: doctor.doctorId || doctor.id });
const normalizeAppointment = (appointment) => ({ ...appointment, id: appointment.appointmentId || appointment.id });

export const AppProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentRole, setCurrentRole] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [pendingRegistrationProfile, setPendingRegistrationProfile] = useState(null);

  const showToast = (message, type = 'success') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((previous) => [...previous, { id, message, type }]);
    setTimeout(() => setToasts((previous) => previous.filter((toast) => toast.id !== id)), 4500);
  };
  const removeToast = (id) => setToasts((previous) => previous.filter((toast) => toast.id !== id));

  const clearSession = () => {
    setAccessToken(null);
    setCurrentUser(null);
    setCurrentRole(null);
    setAppointments([]);
    setDoctors([]);
    setSpecialties([]);
    setPendingRegistrationProfile(null);
  };

  useEffect(() => {
    const expire = () => {
      setAccessToken(null);
      setCurrentUser(null);
      setCurrentRole(null);
      setAppointments([]);
      setDoctors([]);
      setSpecialties([]);
    };
    window.addEventListener('medicloud:unauthorized', expire);
    return () => window.removeEventListener('medicloud:unauthorized', expire);
  }, []);

  useEffect(() => {
    let active = true;
    const restore = async () => {
      if (!getAccessToken()) {
        if (active) setAuthLoading(false);
        return;
      }
      try {
        const result = await apiRequest('/auth/me');
        if (!active) return;
        setCurrentUser(result.user);
        setCurrentRole(result.user.role);
      } catch {
        setAccessToken(null);
        if (active) {
          setCurrentUser(null);
          setCurrentRole(null);
          setAppointments([]);
        }
      } finally {
        if (active) setAuthLoading(false);
      }
    };
    restore();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setDataLoading(true);
      const [doctorResult, specialtyResult] = await Promise.allSettled([
        apiRequest('/doctors'),
        apiRequest('/doctors/specialties'),
      ]);
      if (!active) return;
      if (doctorResult.status === 'fulfilled') setDoctors((doctorResult.value.doctors || []).map(normalizeDoctor));
      else showToast(doctorResult.reason.message, 'error');
      if (specialtyResult.status === 'fulfilled') setSpecialties(specialtyResult.value.specialties || []);
      else showToast(specialtyResult.reason.message, 'error');

      if (currentUser) {
        let path = null;
        if (currentRole === 'patient') path = '/appointments/me';
        if (currentRole === 'doctor') path = `/appointments/doctor/${encodeURIComponent(currentUser.doctorId || currentUser.userId || currentUser.id)}`;
        if (currentRole === 'admin') path = '/admin/appointments';
        if (path) {
          try {
            const result = await apiRequest(path);
            if (active) setAppointments((result.appointments || []).map(normalizeAppointment));
          } catch (error) {
            if (active) showToast(error.message, 'error');
          }
        }
      }
      if (active) setDataLoading(false);
    };
    load();
    return () => { active = false; };
  }, [currentUser, currentRole]);

  const login = async (email, password) => {
    try {
      const result = await apiRequest('/auth/login', {
        method: 'POST',
        body: { email, password, ...(pendingRegistrationProfile || {}) },
      });
      setAccessToken(result.token);
      const profile = await apiRequest('/auth/me');
      setCurrentUser(profile.user);
      setCurrentRole(profile.user.role);
      setPendingRegistrationProfile(null);
      return profile.user;
    } catch (error) {
      setPendingRegistrationProfile(null);
      throw error;
    }
  };

  const registerPatient = async (form) => {
    const result = await apiRequest('/auth/register', {
      method: 'POST',
      body: {
        email: form.email,
        password: form.password,
        name: `${form.firstName} ${form.lastName}`.trim(),
        phone: form.phone,
        dateOfBirth: form.dob || undefined,
        gender: form.gender,
        bloodGroup: form.bloodGroup,
      },
    });
    if (result.token) {
      setAccessToken(result.token);
      setCurrentUser(result.user);
      setCurrentRole(result.user.role);
      setPendingRegistrationProfile(null);
    } else {
      setPendingRegistrationProfile({
        name: `${form.firstName} ${form.lastName}`.trim(),
        phone: form.phone,
        dateOfBirth: form.dob || undefined,
        gender: form.gender,
        bloodGroup: form.bloodGroup,
      });
    }
    return result;
  };

  const confirmRegistration = (email, code) => apiRequest('/auth/confirm', {
    method: 'POST',
    body: { email, code },
  });

  const resendRegistrationCode = (email) => apiRequest('/auth/resend-confirmation', {
    method: 'POST',
    body: { email },
  });

  const logout = async () => {
    try { if (getAccessToken()) await apiRequest('/auth/logout', { method: 'POST' }); }
    catch { /* Local session is cleared even when the service is unavailable. */ }
    clearSession();
  };

  const runMutation = async (path, method, body, successMessage) => {
    try {
      const result = await apiRequest(path, { method, body });
      if (successMessage) showToast(successMessage);
      return result;
    } catch (error) {
      showToast(error.message, 'error');
      return { success: false, error: error.message, status: error.status };
    }
  };

  const refreshAppointments = async () => {
    let path = currentRole === 'patient' ? '/appointments/me'
      : currentRole === 'doctor' ? `/appointments/doctor/${encodeURIComponent(currentUser?.doctorId || currentUser?.userId || currentUser?.id)}`
        : '/admin/appointments';
    const result = await apiRequest(path);
    setAppointments((result.appointments || []).map(normalizeAppointment));
  };

  const bookAppointment = async (input) => {
    const result = await runMutation('/appointments', 'POST', {
      doctorId: input.doctorId,
      date: input.date,
      time: input.time,
      type: input.type,
      reason: input.reason,
    }, 'Appointment booked successfully.');
    if (result.appointment) {
      await refreshAppointments();
      return { ...result, appointment: normalizeAppointment(result.appointment) };
    }
    return result;
  };
  const rescheduleAppointment = async (appointmentId, date, time) => {
    const result = await runMutation(`/appointments/${encodeURIComponent(appointmentId)}/reschedule`, 'PATCH', { date, time }, 'Appointment rescheduled.');
    if (result.appointment) await refreshAppointments();
    return result;
  };
  const cancelAppointment = async (appointmentId, reason = 'Cancelled by user') => {
    const result = await runMutation(`/appointments/${encodeURIComponent(appointmentId)}/cancel`, 'PATCH', { reason }, 'Appointment cancelled.');
    if (result.appointment) await refreshAppointments();
    return result;
  };
  const updateAppointmentStatus = async (id, status) => {
    const result = await runMutation(`/appointments/${encodeURIComponent(id)}/status`, 'PATCH', { status }, 'Appointment status updated.');
    if (result.appointment) await refreshAppointments();
    return result;
  };

  const toggleDoctorStatus = async (id) => {
    const doctor = doctors.find((item) => item.id === id);
    const result = await runMutation(`/doctors/${encodeURIComponent(id)}/status`, 'PATCH', { status: doctor?.status === 'active' ? 'inactive' : 'active' }, 'Doctor status updated.');
    if (result.doctor) setDoctors((previous) => previous.map((item) => item.id === id ? normalizeDoctor(result.doctor) : item));
    return result;
  };
  const addDoctor = async (doctor) => {
    const result = await runMutation('/doctors', 'POST', doctor, 'Doctor profile created.');
    if (result.doctor) setDoctors((previous) => [normalizeDoctor(result.doctor), ...previous]);
    return result.doctor;
  };
  const updateDoctor = async (id, updates) => {
    const result = await runMutation(`/doctors/${encodeURIComponent(id)}`, 'PUT', updates, 'Doctor profile updated.');
    if (result.doctor) setDoctors((previous) => previous.map((item) => item.id === id ? normalizeDoctor(result.doctor) : item));
    return result;
  };
  const updateDoctorSlots = async (id, availableSlots, availableDays) => {
    const result = await runMutation(`/doctors/${encodeURIComponent(id)}/slots`, 'PUT', { availableSlots, availableDays }, 'Availability updated.');
    if (result.doctor) setDoctors((previous) => previous.map((item) => item.id === id ? normalizeDoctor(result.doctor) : item));
    return result;
  };
  const addSpecialty = async (name, description, icon) => {
    const result = await runMutation('/doctors/specialties', 'POST', { name, description, icon }, 'Specialty created.');
    if (result.specialty) setSpecialties((previous) => [...previous, result.specialty]);
    return result;
  };
  const updateProfile = async (updates) => {
    const result = await runMutation('/auth/me', 'PUT', updates, 'Profile updated.');
    if (result.user) setCurrentUser(result.user);
    return result;
  };

  const value = {
    currentUser, currentRole, authLoading, dataLoading, login, registerPatient,
    confirmRegistration, resendRegistrationCode, logout,
    doctors, appointments, specialties, bookAppointment, rescheduleAppointment,
    cancelAppointment, updateAppointmentStatus, addDoctor, updateDoctor,
    toggleDoctorStatus, updateDoctorSlots, addSpecialty, updateProfile,
    toasts, showToast, removeToast,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

// eslint-disable-next-line react/only-export-components -- hook intentionally co-located with its context provider
export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
