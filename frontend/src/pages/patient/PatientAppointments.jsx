import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Search, Plus, AlertCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { AppointmentCard } from '../../components/common/AppointmentCard';
import { EmptyState } from '../../components/common/EmptyState';
import { Button } from '../../components/common/Button';
import { RescheduleModal } from '../../components/booking/RescheduleModal';
import { Modal } from '../../components/common/Modal';

export const PatientAppointments = () => {
  const navigate = useNavigate();
  const { currentUser, appointments, cancelAppointment } = useApp();

  const [activeTab, setActiveTab] = useState('all'); // all, upcoming, completed, cancelled
  const [searchTerm, setSearchTerm] = useState('');
  const [reschedulingApt, setReschedulingApt] = useState(null);
  const [cancelingApt, setCancelingApt] = useState(null);

  // Filter patient's appointments
  const myAppointments = appointments.filter(
    (apt) => currentUser && (apt.patientId === currentUser.userId || apt.patientId === currentUser.id)
  );

  const filteredAppointments = useMemo(() => {
    return myAppointments.filter((apt) => {
      const matchesSearch =
        !searchTerm ||
        apt.doctorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        apt.doctorSpecialty?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        apt.reason?.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      if (activeTab === 'upcoming') return apt.status === 'confirmed' || apt.status === 'pending';
      if (activeTab === 'completed') return apt.status === 'completed';
      if (activeTab === 'cancelled') return apt.status === 'cancelled';
      return true;
    });
  }, [myAppointments, searchTerm, activeTab]);

  const handleConfirmCancel = () => {
    if (cancelingApt) {
      cancelAppointment(cancelingApt.id, 'Patient requested cancellation');
      setCancelingApt(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & New Booking CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Your Health Consultations</h2>
          <p className="text-xs text-slate-500">Track and manage your scheduled clinic visits and telehealth sessions</p>
        </div>
        <Button
          variant="primary"
          leftIcon={Plus}
          onClick={() => navigate('/doctors')}
        >
          Book New Consultation
        </Button>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Tabs */}
        <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All ({myAppointments.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('upcoming')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'upcoming' ? 'bg-white text-teal-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Upcoming ({myAppointments.filter((a) => a.status === 'confirmed' || a.status === 'pending').length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('completed')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'completed' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Completed ({myAppointments.filter((a) => a.status === 'completed').length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('cancelled')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'cancelled' ? 'bg-white text-rose-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Cancelled ({myAppointments.filter((a) => a.status === 'cancelled').length})
          </button>
        </div>

        {/* Search */}
        <div className="relative flex items-center max-w-xs w-full">
          <Search className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by doctor or reason..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50/50 text-slate-900 focus:bg-white focus:border-teal-600 focus:ring-2 focus:ring-teal-500/15 outline-none"
          />
        </div>
      </div>

      {/* Appointment Grid */}
      {filteredAppointments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredAppointments.map((apt) => (
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
          title="No appointments match this filter"
          description="Try changing tabs or clearing your search keywords."
          actionLabel="Find a Doctor"
          onAction={() => navigate('/doctors')}
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

      {/* Cancel Confirmation Modal */}
      {cancelingApt && (
        <Modal
          isOpen={!!cancelingApt}
          onClose={() => setCancelingApt(null)}
          title="Cancel Appointment"
          subtitle={`With ${cancelingApt.doctorName}`}
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-rose-800 text-xs flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>Are you sure you want to cancel your scheduled visit with {cancelingApt.doctorName}?</span>
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
