import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Plus,
  AlertCircle,
  ChevronRight,
  ShieldCheck,
  Heart,
  CalendarCheck
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { AppointmentCard } from '../../components/common/AppointmentCard';
import { DoctorCard } from '../../components/common/DoctorCard';
import { StatsCard } from '../../components/common/StatsCard';
import { EmptyState } from '../../components/common/EmptyState';
import { Button } from '../../components/common/Button';
import { BookingModal } from '../../components/booking/BookingModal';
import { RescheduleModal } from '../../components/booking/RescheduleModal';
import { Modal } from '../../components/common/Modal';

export const PatientDashboard = () => {
  const navigate = useNavigate();
  const { currentUser, appointments, doctors, specialties, cancelAppointment } = useApp();

  const [bookingDoctor, setBookingDoctor] = useState(null);
  const [reschedulingApt, setReschedulingApt] = useState(null);
  const [cancelingApt, setCancelingApt] = useState(null);
  const [specialtyFilter, setSpecialtyFilter] = useState('');

  // Filter patient's appointments
  const myAppointments = appointments.filter(
    (apt) => !currentUser || apt.patientId === currentUser.id || apt.patientEmail === currentUser.email
  );

  const upcomingAppointments = myAppointments.filter(
    (apt) => apt.status === 'confirmed' || apt.status === 'pending'
  );

  const historyAppointments = myAppointments.filter(
    (apt) => apt.status === 'completed' || apt.status === 'cancelled'
  );

  // Filtered doctors for quick booking widget
  const availableDoctors = doctors.filter(
    (doc) => !specialtyFilter || doc.specialty.toLowerCase() === specialtyFilter.toLowerCase()
  ).slice(0, 3);

  const handleConfirmCancel = () => {
    if (cancelingApt) {
      cancelAppointment(cancelingApt.id, 'Cancelled via Patient Dashboard');
      setCancelingApt(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4 sm:gap-5">
          <img
            src={currentUser?.avatar || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=300'}
            alt={currentUser?.name}
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-teal-500/30 shadow-xs"
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 border border-teal-200">
                Patient Member
              </span>
              <span className="text-2xs text-slate-400">ID: {currentUser?.id || 'pat-1'}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
              Welcome back, {currentUser?.name?.split(' ')[0] || 'Sarah'}!
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Manage your healthcare consultations, browse specialist slots, and view records.
            </p>
          </div>
        </div>

        {/* Quick Action Button */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button
            variant="primary"
            size="lg"
            leftIcon={Plus}
            onClick={() => navigate('/doctors')}
            className="w-full sm:w-auto shadow-sm"
          >
            Book New Appointment
          </Button>
        </div>
      </div>

      {/* Stats KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Upcoming Visits"
          value={upcomingAppointments.length}
          subtitle="Scheduled & Confirmed"
          icon={Calendar}
        />
        <StatsCard
          title="Completed Consultations"
          value={historyAppointments.filter((a) => a.status === 'completed').length}
          subtitle="Past Care Records"
          icon={CalendarCheck}
        />
        <StatsCard
          title="Active Care Provider"
          value="Primary Network"
          subtitle={currentUser?.insuranceProvider || 'Standard Insurance'}
          icon={ShieldCheck}
        />
        <StatsCard
          title="Blood Group"
          value={currentUser?.bloodGroup || 'O+'}
          subtitle="Registered Profile Metric"
          icon={Heart}
        />
      </div>

      {/* UPCOMING APPOINTMENTS SECTION */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">Upcoming Consultations</h3>
            <p className="text-xs text-slate-500">Scheduled visits requiring your attendance</p>
          </div>
          {upcomingAppointments.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              rightIcon={ChevronRight}
              onClick={() => navigate('/patient/appointments')}
            >
              View All
            </Button>
          )}
        </div>

        {upcomingAppointments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {upcomingAppointments.map((apt) => (
              <AppointmentCard
                key={apt.id}
                appointment={apt}
                viewRole="patient"
                onReschedule={(appointment) => setReschedulingApt(appointment)}
                onCancel={(appointment) => setCancelingApt(appointment)}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Calendar}
            title="No upcoming appointments"
            description="You do not have any pending or confirmed consultations on your schedule."
            actionLabel="Find a Doctor & Book Now"
            onAction={() => navigate('/doctors')}
          />
        )}
      </div>

      {/* QUICK SPECIALTY FILTER & AVAILABLE DOCTORS */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">Schedule with Verified Doctors</h3>
            <p className="text-xs text-slate-500">Pick a clinical specialty to view open hours</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/doctors')}
            rightIcon={ChevronRight}
          >
            Explore Directory ({doctors.length})
          </Button>
        </div>

        {/* Specialty Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          <button
            type="button"
            onClick={() => setSpecialtyFilter('')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer border ${
              !specialtyFilter
                ? 'bg-teal-600 text-white border-teal-600 shadow-2xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
            }`}
          >
            All Specialties
          </button>
          {specialties.map((spec) => (
            <button
              key={spec.id}
              type="button"
              onClick={() => setSpecialtyFilter(spec.name)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer border ${
                specialtyFilter.toLowerCase() === spec.name.toLowerCase()
                  ? 'bg-teal-600 text-white border-teal-600 shadow-2xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
              }`}
            >
              {spec.name}
            </button>
          ))}
        </div>

        {/* Doctors Grid Preview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {availableDoctors.map((doc) => (
            <DoctorCard
              key={doc.id}
              doctor={doc}
              onBook={(doctor) => setBookingDoctor(doctor)}
              onViewDetails={(doctor) => navigate(`/doctors?id=${doctor.id}`)}
            />
          ))}
        </div>
      </div>

      {/* RECENT PAST APPOINTMENT HISTORY */}
      {historyAppointments.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">Recent Appointment History</h3>
              <p className="text-xs text-slate-500">Past completed and cancelled consultations</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              rightIcon={ChevronRight}
              onClick={() => navigate('/patient/appointments')}
            >
              Full History
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {historyAppointments.slice(0, 2).map((apt) => (
              <AppointmentCard key={apt.id} appointment={apt} viewRole="patient" />
            ))}
          </div>
        </div>
      )}

      {/* Booking Modal */}
      {bookingDoctor && (
        <BookingModal
          isOpen={!!bookingDoctor}
          onClose={() => setBookingDoctor(null)}
          doctor={bookingDoctor}
        />
      )}

      {/* Reschedule Modal */}
      {reschedulingApt && (
        <RescheduleModal
          isOpen={!!reschedulingApt}
          onClose={() => setReschedulingApt(null)}
          appointment={reschedulingApt}
        />
      )}

      {/* Cancel Confirmation Dialog */}
      {cancelingApt && (
        <Modal
          isOpen={!!cancelingApt}
          onClose={() => setCancelingApt(null)}
          title="Cancel Appointment"
          subtitle={`With ${cancelingApt.doctorName}`}
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-rose-50 rounded-xl border border-rose-200 text-rose-800 text-xs">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>
                Are you sure you want to cancel this appointment on <strong>{cancelingApt.date}</strong> at <strong>{cancelingApt.time}</strong>? This slot will become available for other patients.
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setCancelingApt(null)}>
                Keep Appointment
              </Button>
              <Button variant="danger" onClick={handleConfirmCancel}>
                Confirm Cancellation
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
