import React, { useState, useEffect } from 'react';
import { Clock, AlertCircle } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { useApp } from '../../context/AppContext';
import { formatDate } from '../../utils/formatters';

export const RescheduleModal = ({ isOpen, onClose, appointment }) => {
  const { rescheduleAppointment, doctors, appointments } = useApp();

  const [date, setDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Find the doctor for available slots
  const doctor = doctors.find((d) => d.id === appointment?.doctorId);
  const availableSlots = doctor?.availableSlots || [
    '09:00 AM',
    '10:00 AM',
    '11:30 AM',
    '02:00 PM',
    '03:30 PM',
    '04:30 PM'
  ];

  useEffect(() => {
    if (isOpen && appointment) {
      setDate(appointment.date);
      setSelectedSlot(appointment.time);
      setError('');
    }
  }, [isOpen, appointment]);

  if (!appointment) return null;

  const isSlotBooked = (slot) => {
    return appointments.some(
      (apt) =>
        apt.id !== appointment.id &&
        apt.doctorId === appointment.doctorId &&
        apt.date === date &&
        apt.time === slot &&
        apt.status !== 'cancelled' &&
        apt.status !== 'rejected'
    );
  };

  const handleReschedule = (e) => {
    e.preventDefault();
    setError('');

    if (!date) {
      setError('Please choose a new date.');
      return;
    }
    if (!selectedSlot) {
      setError('Please choose a time slot.');
      return;
    }
    if (date === appointment.date && selectedSlot === appointment.time) {
      setError('Selected date and time are the same as current appointment.');
      return;
    }

    if (isSlotBooked(selectedSlot)) {
      setError(`The slot (${selectedSlot}) on ${date} is already booked for this doctor.`);
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      const result = rescheduleAppointment(appointment.id, date, selectedSlot);
      setIsSubmitting(false);
      if (result.success) {
        onClose();
      } else {
        setError(result.error);
      }
    }, 350);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Reschedule Appointment"
      subtitle={`With ${appointment.doctorName} • Current: ${formatDate(appointment.date)} at ${appointment.time}`}
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleReschedule} className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-slate-700 tracking-wide uppercase block mb-1.5">
            Select New Date
          </label>
          <input
            type="date"
            value={date}
            min={new Date().toISOString().split('T')[0]}
            onChange={(e) => {
              setDate(e.target.value);
              setError('');
            }}
            required
            className="w-full bg-white text-slate-900 text-sm rounded-lg border border-slate-300 py-2.5 px-3.5 focus:border-teal-600 focus:ring-2 focus:ring-teal-500/15 outline-none cursor-pointer"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-700 tracking-wide uppercase block mb-1.5">
            Select New Time Slot
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {availableSlots.map((slot) => {
              const booked = isSlotBooked(slot);
              const isSelected = selectedSlot === slot && !booked;

              return (
                <button
                  key={slot}
                  type="button"
                  disabled={booked}
                  onClick={() => {
                    setSelectedSlot(slot);
                    setError('');
                  }}
                  className={`py-2 px-3 rounded-lg text-xs font-medium border text-center transition-all ${
                    booked
                      ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed line-through'
                      : isSelected
                      ? 'bg-teal-600 text-white border-teal-600'
                      : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 cursor-pointer'
                  }`}
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <Clock className="w-3 h-3" />
                    <span>{slot}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            Confirm Reschedule
          </Button>
        </div>
      </form>
    </Modal>
  );
};
