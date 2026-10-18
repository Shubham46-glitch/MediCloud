import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';

// Layouts
import { MainLayout } from './layouts/MainLayout';
import { DashboardLayout } from './layouts/DashboardLayout';

// Public Pages
import { LandingPage } from './pages/landing/LandingPage';
import { DoctorsDirectoryPage } from './pages/doctors/DoctorsDirectoryPage';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { VerifyEmailPage } from './pages/auth/VerifyEmailPage';

// Patient Pages
import { PatientDashboard } from './pages/patient/PatientDashboard';
import { PatientAppointments } from './pages/patient/PatientAppointments';
import { PatientProfile } from './pages/patient/PatientProfile';
import { PatientDocuments } from './pages/patient/PatientDocuments';

// Doctor Pages
import { DoctorDashboard } from './pages/doctor/DoctorDashboard';
import { DoctorSchedule } from './pages/doctor/DoctorSchedule';
import { DoctorPatients } from './pages/doctor/DoctorPatients';

// Admin Pages
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminDoctors } from './pages/admin/AdminDoctors';
import { AdminAppointments } from './pages/admin/AdminAppointments';
import { ProtectedRoute } from './components/auth/ProtectedRoute';

function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Website Routes */}
          <Route element={<MainLayout />}>
            <Route path="/" element={<LandingPage />} />
            <Route path="/doctors" element={<DoctorsDirectoryPage />} />
          </Route>

          {/* Authentication Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />

          {/* Patient Portal */}
          <Route element={<ProtectedRoute roles={['patient']} />}>
          <Route element={<DashboardLayout />}>
            <Route path="/patient/dashboard" element={<PatientDashboard />} />
            <Route path="/patient/appointments" element={<PatientAppointments />} />
            <Route path="/patient/profile" element={<PatientProfile />} />
            <Route path="/patient/documents" element={<PatientDocuments />} />
          </Route>
          </Route>

            {/* Doctor Portal */}
          <Route element={<ProtectedRoute roles={['doctor']} />}>
          <Route element={<DashboardLayout />}>
            <Route path="/doctor/dashboard" element={<DoctorDashboard />} />
            <Route path="/doctor/schedule" element={<DoctorSchedule />} />
            <Route path="/doctor/patients" element={<DoctorPatients />} />
          </Route>
          </Route>

            {/* Admin Portal */}
          <Route element={<ProtectedRoute roles={['admin']} />}>
          <Route element={<DashboardLayout />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/doctors" element={<AdminDoctors />} />
            <Route path="/admin/appointments" element={<AdminAppointments />} />
          </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;
