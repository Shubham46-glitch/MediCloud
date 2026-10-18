import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Clock,
  CheckCircle,
  Users,
  Settings
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { StatsCard } from '../../components/common/StatsCard';
import { AppointmentCard } from '../../components/common/AppointmentCard';
import { EmptyState } from '../../components/common/EmptyState';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { Badge } from '../../components/common/Badge';
import { formatDate } from '../../utils/formatters';

const actualToday = new Date().toISOString().slice(0, 10);

export const DoctorDashboard = () => {
  const navigate = useNavigate();
  const { currentUser, doctors, appointments, updateAppointmentStatus } = useApp();

  const [selectedPatientApt, setSelectedPatientApt] = useState(null);

  // Filter doctor's appointments
  const doctorId = currentUser?.doctorId || currentUser?.userId || currentUser?.id;
  const doctorProfile = doctors.find((doctor) => doctor.id === doctorId);
  const myAppointments = appointments.filter((apt) => apt.doctorId === doctorId);

  const isToday = (date) => date === actualToday;

  const todayAppointments = myAppointments.filter(
    (apt) => isToday(apt.date) && apt.status !== 'cancelled'
  );

  const upcomingAppointments = myAppointments.filter(
    (apt) => !isToday(apt.date) && apt.status !== 'cancelled'
  );

  const pendingAppointments = myAppointments.filter((apt) => apt.status === 'pending');

  const handleAccept = (appointmentId) => {
    updateAppointmentStatus(appointmentId, 'confirmed');
  };

  const handleReject = (appointmentId) => {
    updateAppointmentStatus(appointmentId, 'rejected');
  };

  const handleComplete = (appointmentId) => {
    updateAppointmentStatus(appointmentId, 'completed');
  };

  return (
    <div className="space-y-8">
      {/* Doctor Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4 sm:gap-5">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border-2 border-teal-500 bg-teal-50 text-teal-800 text-xl font-bold grid place-items-center" aria-hidden="true">{currentUser?.name?.slice(0, 1) || '?'}</div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 border border-teal-200">
                Attending Physician
              </span>
              {doctorProfile?.licenseNumber && <span className="text-2xs text-slate-400">License: {doctorProfile.licenseNumber}</span>}
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
              {currentUser?.name || 'Doctor'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              {[doctorProfile?.title, doctorProfile?.specialty, doctorProfile?.hospital].filter(Boolean).join(' • ') || 'Doctor profile details are not available.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            leftIcon={Settings}
            onClick={() => navigate('/doctor/schedule')}
          >
            Manage Slots
          </Button>
          <Button
            variant="primary"
            leftIcon={Calendar}
            onClick={() => navigate('/doctor/schedule')}
          >
            Schedule Overview
          </Button>
        </div>
      </div>

      {/* Doctor KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Today's Consultations"
          value={todayAppointments.length}
          subtitle="Patients in today's clinic queue"
          icon={Users}
        />
        <StatsCard
          title="Pending Approval"
          value={pendingAppointments.length}
          subtitle="Awaiting doctor confirmation"
          icon={Clock}
          trend={pendingAppointments.length > 0 ? `${pendingAppointments.length} action required` : 'No pending items'}
          trendPositive={null}
        />
        <StatsCard
          title="Upcoming Schedule"
          value={upcomingAppointments.length}
          subtitle="Confirmed future visits"
          icon={Calendar}
        />
        <StatsCard
          title="Patient Records"
          value={new Set(myAppointments.map((appointment) => appointment.patientId)).size}
          subtitle="Patients with appointments"
          icon={Users}
        />
      </div>

      {/* TODAY'S APPOINTMENTS SECTION */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Today's Appointments Queue</span>
              <span className="px-2 py-0.5 rounded-full text-2xs font-bold bg-teal-100 text-teal-800">
                {todayAppointments.length}
              </span>
            </h3>
            <p className="text-xs text-slate-500">Scheduled consultations for today ({formatDate(actualToday)})</p>
          </div>
        </div>

        {todayAppointments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {todayAppointments.map((apt) => (
              <AppointmentCard
                key={apt.id}
                appointment={apt}
                viewRole="doctor"
                onAccept={handleAccept}
                onReject={handleReject}
                onComplete={handleComplete}
                onViewDetails={(appointment) => setSelectedPatientApt(appointment)}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={CheckCircle}
            title="No appointments scheduled for today"
            description="Your clinic queue for today is complete or has no pending consults."
          />
        )}
      </div>

      {/* UPCOMING & PENDING REQUESTS SECTION */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">Upcoming Consultations & Requests</h3>
            <p className="text-xs text-slate-500">Future bookings requiring your preparation or approval</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/doctor/schedule')}
          >
            Full Calendar
          </Button>
        </div>

        {upcomingAppointments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {upcomingAppointments.map((apt) => (
              <AppointmentCard
                key={apt.id}
                appointment={apt}
                viewRole="doctor"
                onAccept={handleAccept}
                onReject={handleReject}
                onComplete={handleComplete}
                onViewDetails={(appointment) => setSelectedPatientApt(appointment)}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Calendar}
            title="No upcoming future visits"
            description="No upcoming appointments on the calendar beyond today."
          />
        )}
      </div>

      {/* Patient Details Modal */}
      {selectedPatientApt && (
        <Modal
          isOpen={!!selectedPatientApt}
          onClose={() => setSelectedPatientApt(null)}
          title={`Patient Case: ${selectedPatientApt.patientName}`}
          subtitle={`Appointment ID: ${selectedPatientApt.id} • ${formatDate(selectedPatientApt.date)}`}
          maxWidth="max-w-xl"
        >
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 block font-semibold text-2xs uppercase">Patient demographics</span>
                <span className="font-bold text-slate-800 mt-0.5 block">{selectedPatientApt.patientGender || 'Not provided'}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 block font-semibold text-2xs uppercase">Contact Phone</span>
                <span className="font-bold text-slate-800 mt-0.5 block">{selectedPatientApt.patientPhone || 'Not provided'}</span>
              </div>
            </div>

            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">Chief Consultation Reason</span>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs font-medium text-slate-800">
                {selectedPatientApt.reason}
              </div>
            </div>

            {selectedPatientApt.notes && (
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">Clinical Notes</span>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600 italic">
                  {selectedPatientApt.notes}
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <Badge status={selectedPatientApt.status} />

              <div className="flex items-center gap-2">
                {selectedPatientApt.status === 'pending' && (
                  <>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        handleReject(selectedPatientApt.id);
                        setSelectedPatientApt(null);
                      }}
                    >
                      Decline
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        handleAccept(selectedPatientApt.id);
                        setSelectedPatientApt(null);
                      }}
                    >
                      Accept
                    </Button>
                  </>
                )}
                {selectedPatientApt.status === 'confirmed' && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      handleComplete(selectedPatientApt.id);
                      setSelectedPatientApt(null);
                    }}
                  >
                    Mark Consult Completed
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
