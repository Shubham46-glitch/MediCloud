import React, { createContext, useContext, useState, useEffect } from 'react';
import { mockDoctors } from '../data/mockDoctors';
import { mockAppointments } from '../data/mockAppointments';
import { mockSpecialties } from '../data/mockSpecialties';
import { mockUsers } from '../data/mockUsers';

const AppContext = createContext(null);

export const AppProvider = ({ children }) => {
  // Demo Auth State (Patient by default so user can test patient flow immediately)
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('medicloud_user');
    return saved ? JSON.parse(saved) : mockUsers.patient;
  });

  const [currentRole, setCurrentRole] = useState(() => {
    const saved = localStorage.getItem('medicloud_role');
    return saved || 'patient';
  });

  // Data States
  const [doctors, setDoctors] = useState(() => {
    const saved = localStorage.getItem('medicloud_doctors');
    return saved ? JSON.parse(saved) : mockDoctors;
  });

  const [appointments, setAppointments] = useState(() => {
    const saved = localStorage.getItem('medicloud_appointments');
    return saved ? JSON.parse(saved) : mockAppointments;
  });

  const [specialties, setSpecialties] = useState(() => {
    const saved = localStorage.getItem('medicloud_specialties');
    return saved ? JSON.parse(saved) : mockSpecialties;
  });

  // Toast Notifications
  const [toasts, setToasts] = useState([]);

  // Persist demo state
  useEffect(() => {
    localStorage.setItem('medicloud_user', JSON.stringify(currentUser));
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('medicloud_role', currentRole);
  }, [currentRole]);

  useEffect(() => {
    localStorage.setItem('medicloud_doctors', JSON.stringify(doctors));
  }, [doctors]);

  useEffect(() => {
    localStorage.setItem('medicloud_appointments', JSON.stringify(appointments));
  }, [appointments]);

  useEffect(() => {
    localStorage.setItem('medicloud_specialties', JSON.stringify(specialties));
  }, [specialties]);

  const showToast = (message, type = 'success') => {
    const id = Date.now() + Math.random().toString(36).substring(2, 5);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Auth Functions
  const login = (role, customUserData = null) => {
    const userToSet = customUserData || mockUsers[role] || mockUsers.patient;
    setCurrentUser(userToSet);
    setCurrentRole(role);
    showToast(`Logged in successfully as ${userToSet.name} (${role.toUpperCase()})`, 'success');
  };

  const registerPatient = (patientData) => {
    const newPatient = {
      id: `pat-${Date.now()}`,
      role: 'patient',
      name: `${patientData.firstName} ${patientData.lastName}`,
      email: patientData.email,
      phone: patientData.phone || '+1 (555) 000-0000',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300',
      bloodGroup: patientData.bloodGroup || 'A+',
      dateOfBirth: patientData.dob || '1995-01-01',
      gender: patientData.gender || 'Not Specified',
      address: patientData.address || 'New York, USA',
      emergencyContact: {
        name: patientData.emergencyContact || 'Emergency Contact',
        phone: patientData.emergencyPhone || '+1 (555) 111-2222'
      },
      allergies: ['None recorded in demo profile'],
      insuranceProvider: 'Standard Healthcare Network',
      policyNumber: `SHN-${Math.floor(10000 + Math.random() * 90000)}`,
      memberSince: 'October 2026'
    };
    setCurrentUser(newPatient);
    setCurrentRole('patient');
    showToast(`Account created! Welcome to MediCloud, ${newPatient.name}`, 'success');
    return newPatient;
  };

  const logout = () => {
    setCurrentUser(null);
    setCurrentRole(null);
    showToast('Logged out of demo session', 'info');
  };

  const switchRole = (newRole) => {
    if (mockUsers[newRole]) {
      setCurrentUser(mockUsers[newRole]);
      setCurrentRole(newRole);
      showToast(`Switched active view to ${mockUsers[newRole].name} (${newRole.toUpperCase()})`, 'info');
    }
  };

  // Appointments Actions
  const bookAppointment = ({
    doctorId,
    doctorName,
    doctorSpecialty,
    doctorImage,
    doctorHospital,
    date,
    time,
    type = 'In-Person Consultation',
    reason = 'General consultation',
    fee = 100,
    notes = '',
    patientName,
    patientPhone
  }) => {
    // Check for duplicate booking for same doctor and same time slot
    const hasDuplicate = appointments.some(
      (apt) =>
        apt.doctorId === doctorId &&
        apt.date === date &&
        apt.time === time &&
        apt.status !== 'cancelled' &&
        apt.status !== 'rejected'
    );

    if (hasDuplicate) {
      showToast(`Slot Unavailable: ${doctorName} is already booked on ${date} at ${time}. Please choose another time.`, 'error');
      return {
        success: false,
        error: `Slot unavailable: ${doctorName} already has an appointment booked on ${date} at ${time}.`
      };
    }

    const newApt = {
      id: `apt-${Date.now()}`,
      patientId: currentUser?.id || 'pat-1',
      patientName: patientName || currentUser?.name || 'Sarah Jenkins',
      patientEmail: currentUser?.email || 'sarah.jenkins@example.com',
      patientPhone: patientPhone || currentUser?.phone || '+1 (555) 234-5678',
      patientAge: 32,
      patientGender: currentUser?.gender || 'Female',
      doctorId,
      doctorName,
      doctorSpecialty,
      doctorImage,
      doctorHospital: doctorHospital || 'MediCloud Partner Clinic',
      date,
      time,
      type,
      status: 'confirmed',
      reason: reason || 'Routine Clinical Consultation',
      fee,
      notes: notes || 'Booked through MediCloud Patient Portal'
    };

    setAppointments((prev) => [newApt, ...prev]);
    showToast(`Appointment confirmed with ${doctorName} on ${date} at ${time}!`, 'success');
    return { success: true, appointment: newApt };
  };

  const rescheduleAppointment = (appointmentId, newDate, newTime) => {
    const existing = appointments.find((a) => a.id === appointmentId);
    if (!existing) return { success: false, error: 'Appointment not found' };

    // Check duplicate
    const hasDuplicate = appointments.some(
      (apt) =>
        apt.id !== appointmentId &&
        apt.doctorId === existing.doctorId &&
        apt.date === newDate &&
        apt.time === newTime &&
        apt.status !== 'cancelled' &&
        apt.status !== 'rejected'
    );

    if (hasDuplicate) {
      showToast(`Slot conflict: Selected time slot is already booked for this doctor.`, 'error');
      return { success: false, error: 'Slot conflict for this doctor and time.' };
    }

    setAppointments((prev) =>
      prev.map((apt) =>
        apt.id === appointmentId
          ? { ...apt, date: newDate, time: newTime, status: 'confirmed' }
          : apt
      )
    );
    showToast(`Appointment rescheduled to ${newDate} at ${newTime}`, 'success');
    return { success: true };
  };

  const cancelAppointment = (appointmentId, cancelReason = 'Cancelled by user') => {
    setAppointments((prev) =>
      prev.map((apt) =>
        apt.id === appointmentId
          ? { ...apt, status: 'cancelled', notes: `${apt.notes || ''} [Cancelled: ${cancelReason}]` }
          : apt
      )
    );
    showToast('Appointment successfully cancelled', 'info');
  };

  const updateAppointmentStatus = (appointmentId, newStatus) => {
    setAppointments((prev) =>
      prev.map((apt) =>
        apt.id === appointmentId ? { ...apt, status: newStatus } : apt
      )
    );
    showToast(`Appointment marked as ${newStatus}`, 'success');
  };

  // Doctor Management (Admin & Doctor)
  const addDoctor = (doctorData) => {
    const newDoc = {
      ...doctorData,
      id: `doc-${Date.now()}`,
      status: 'active',
      rating: 5.0,
      reviewCount: 1,
      image: doctorData.image || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=600',
      availableSlots: doctorData.availableSlots || ['09:00 AM', '11:00 AM', '02:00 PM', '04:00 PM'],
      availableDays: doctorData.availableDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    };
    setDoctors((prev) => [newDoc, ...prev]);
    showToast(`Doctor profile added for ${newDoc.name}`, 'success');
    return newDoc;
  };

  const updateDoctor = (doctorId, updatedData) => {
    setDoctors((prev) =>
      prev.map((doc) => (doc.id === doctorId ? { ...doc, ...updatedData } : doc))
    );
    showToast('Doctor profile updated successfully', 'success');
  };

  const toggleDoctorStatus = (doctorId) => {
    setDoctors((prev) =>
      prev.map((doc) => {
        if (doc.id === doctorId) {
          const nextStatus = doc.status === 'active' ? 'inactive' : 'active';
          showToast(`${doc.name} status updated to ${nextStatus}`, 'info');
          return { ...doc, status: nextStatus };
        }
        return doc;
      })
    );
  };

  const updateDoctorSlots = (doctorId, newSlots, newDays = null) => {
    setDoctors((prev) =>
      prev.map((doc) => {
        if (doc.id === doctorId) {
          return {
            ...doc,
            availableSlots: newSlots,
            ...(newDays ? { availableDays: newDays } : {})
          };
        }
        return doc;
      })
    );
    showToast('Availability schedule updated successfully', 'success');
  };

  // Specialty Management
  const addSpecialty = (name, description, icon = 'Activity') => {
    const newSpec = {
      id: `spec-${Date.now()}`,
      name,
      description,
      icon,
      count: 0
    };
    setSpecialties((prev) => [...prev, newSpec]);
    showToast(`Specialty "${name}" created`, 'success');
  };

  // Reset demo state back to defaults
  const resetDemoData = () => {
    setDoctors(mockDoctors);
    setAppointments(mockAppointments);
    setSpecialties(mockSpecialties);
    setCurrentUser(mockUsers.patient);
    setCurrentRole('patient');
    localStorage.clear();
    showToast('Demo data reset to initial values', 'info');
  };

  const value = {
    currentUser,
    currentRole,
    login,
    registerPatient,
    logout,
    switchRole,
    doctors,
    appointments,
    specialties,
    bookAppointment,
    rescheduleAppointment,
    cancelAppointment,
    updateAppointmentStatus,
    addDoctor,
    updateDoctor,
    toggleDoctorStatus,
    updateDoctorSlots,
    addSpecialty,
    resetDemoData,
    toasts,
    showToast,
    removeToast
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
