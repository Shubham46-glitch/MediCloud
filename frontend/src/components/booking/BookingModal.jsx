import React, { useState } from 'react';
import { Clock, Video, Building2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { useApp } from '../../context/AppContext';
import { formatCurrency, formatDate } from '../../utils/formatters';

const dateAtMidnight = new Date();
const MIN_BOOKING_DATE = new Date(dateAtMidnight.getTime() - dateAtMidnight.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
dateAtMidnight.setDate(dateAtMidnight.getDate() + 1);
const DEFAULT_BOOKING_DATE = new Date(dateAtMidnight.getTime() - dateAtMidnight.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

export const BookingModal = ({ isOpen, onClose, doctor }) => {
  const { bookAppointment, appointments } = useApp();

  const [date, setDate] = useState(DEFAULT_BOOKING_DATE);
  const [selectedSlot, setSelectedSlot] = useState(doctor?.availableSlots?.[0] || '');
  const [type, setType] = useState('In-Person Consultation');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedApt, setConfirmedApt] = useState(null);
  const [slotError, setSlotError] = useState('');

  // Check which slots for this doctor on this date are already booked
  const isSlotBooked = (slot, checkDate = date) => {
    return appointments.some(
      (apt) =>
        apt.doctorId === doctor?.id &&
        apt.date === checkDate &&
        apt.time === slot &&
        apt.status !== 'cancelled' &&
        apt.status !== 'rejected'
    );
  };

  if (!doctor) return null;

  const handleDateChange = (newDate) => {
    setDate(newDate);
    setSlotError('');
    const firstUnbooked = doctor.availableSlots?.find((slot) => !isSlotBooked(slot, newDate));
    setSelectedSlot(firstUnbooked || '');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSlotError('');

    if (!date) {
      setSlotError('Please choose an appointment date.');
      return;
    }
    if (!selectedSlot) {
      setSlotError('Please select an available time slot.');
      return;
    }

    if (isSlotBooked(selectedSlot)) {
      setSlotError(`This slot (${selectedSlot}) has already been reserved for ${doctor.name} on ${date}. Please select another time.`);
      return;
    }

    const dayName = new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long' });
    if (doctor.availableDays?.length && !doctor.availableDays.includes(dayName)) {
      setSlotError(`This doctor is not available on ${dayName}.`);
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await bookAppointment({ doctorId: doctor.id, date, time: selectedSlot, type, reason: reason.trim() });
      if (result.success && result.appointment) setConfirmedApt(result.appointment);
      else setSlotError(result.error || 'The appointment could not be booked.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={confirmedApt ? 'Booking Confirmed' : `Book with ${doctor.name}`}
      subtitle={confirmedApt ? 'Your appointment has been successfully scheduled' : `${doctor.specialty} • ${doctor.hospital}`}
      maxWidth="max-w-2xl"
    >
      {confirmedApt ? (
        // Confirmation Screen
        <div className="text-center py-4 space-y-6">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div>
            <h4 className="text-xl font-bold text-slate-900">Appointment Scheduled!</h4>
            <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">Your request with <span className="font-semibold text-slate-800">{confirmedApt.doctorName}</span> has been saved with status <strong>{confirmedApt.status}</strong>.</p>
          </div>

          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 text-left space-y-3 max-w-lg mx-auto">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200 text-xs">
              <span className="text-slate-500">Booking Reference</span>
              <span className="font-mono font-bold text-slate-900 uppercase">{confirmedApt.id}</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-500 block">Date & Time</span>
                <span className="font-bold text-slate-800 mt-0.5 block">{formatDate(confirmedApt.date)} at {confirmedApt.time}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Consultation Type</span>
                <span className="font-bold text-slate-800 mt-0.5 block">{confirmedApt.type}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Patient Name</span>
                <span className="font-bold text-slate-800 mt-0.5 block">{confirmedApt.patientName}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Consultation Fee</span>
                <span className="font-bold text-teal-700 mt-0.5 block">{formatCurrency(confirmedApt.fee)}</span>
              </div>
            </div>
            {confirmedApt.notes && (
              <div className="pt-2 border-t border-slate-200 text-xs">
                <span className="text-slate-500 block">Notes:</span>
                <span className="text-slate-700 italic">{confirmedApt.notes}</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <Button variant="primary" onClick={onClose}>
              Done & Return to Appointments
            </Button>
          </div>
        </div>
      ) : (
        // Booking Form
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Doctor Brief Banner */}
          <div className="flex items-center gap-4 p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/80">
            <img
              src={doctor.image}
              alt={doctor.name}
              className="w-14 h-14 rounded-xl object-cover border border-slate-200 bg-slate-100 shrink-0"
            />
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold text-slate-900 truncate">{doctor.name}</h4>
              <p className="text-xs text-teal-700 font-medium">{doctor.specialty} • {doctor.hospital}</p>
              <p className="text-xs text-slate-500 mt-0.5">{doctor.location}</p>
            </div>
            <div className="text-right shrink-0">
              <span className="text-2xs text-slate-400 uppercase font-semibold block">Fee</span>
              <span className="text-base font-bold text-teal-800">{formatCurrency(doctor.fee)}</span>
            </div>
          </div>

          {/* Date Picker */}
          <div>
            <label className="text-xs font-semibold text-slate-700 tracking-wide uppercase block mb-1.5">
              1. Choose Appointment Date <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="date"
                value={date}
                min={MIN_BOOKING_DATE}
                onChange={(e) => handleDateChange(e.target.value)}
                required
                className="w-full bg-white text-slate-900 text-sm rounded-lg border border-slate-300 py-2.5 px-3.5 focus:border-teal-600 focus:ring-2 focus:ring-teal-500/15 outline-none cursor-pointer"
              />
            </div>
          </div>

          {/* Time Slots */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700 tracking-wide uppercase">
                2. Select Available Time Slot <span className="text-rose-500">*</span>
              </label>
              <span className="text-2xs text-slate-500">
                {doctor.availableSlots?.length || 0} regular slots
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {doctor.availableSlots && doctor.availableSlots.length > 0 ? (
                doctor.availableSlots.map((slot) => {
                  const booked = isSlotBooked(slot);
                  const isSelected = selectedSlot === slot && !booked;

                  return (
                    <button
                      key={slot}
                      type="button"
                      disabled={booked}
                      onClick={() => {
                        setSelectedSlot(slot);
                        setSlotError('');
                      }}
                      className={`py-2 px-3 rounded-lg text-xs font-medium border text-center transition-all ${
                        booked
                          ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed line-through'
                          : isSelected
                          ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                          : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <Clock className="w-3 h-3" />
                        <span>{slot}</span>
                      </div>
                      {booked && <span className="text-2xs block text-slate-400 mt-0.5">Booked</span>}
                    </button>
                  );
                })
              ) : (
                <p className="text-xs text-slate-500 col-span-3">No slots configured for this doctor.</p>
              )}
            </div>
          </div>

          {/* Consultation Type */}
          <div>
            <label className="text-xs font-semibold text-slate-700 tracking-wide uppercase block mb-1.5">
              3. Consultation Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setType('In-Person Consultation')}
                className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  type === 'In-Person Consultation'
                    ? 'border-teal-600 bg-teal-50/50 text-teal-900 ring-1 ring-teal-600'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <Building2 className={`w-5 h-5 ${type === 'In-Person Consultation' ? 'text-teal-600' : 'text-slate-400'}`} />
                <div>
                  <span className="text-xs font-bold block">In-Person Clinic</span>
                  <span className="text-2xs text-slate-500">Visit {doctor.hospital}</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setType('Video Consultation')}
                className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  type === 'Video Consultation'
                    ? 'border-teal-600 bg-teal-50/50 text-teal-900 ring-1 ring-teal-600'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <Video className={`w-5 h-5 ${type === 'Video Consultation' ? 'text-teal-600' : 'text-slate-400'}`} />
                <div>
                  <span className="text-xs font-bold block">Video Telehealth</span>
                  <span className="text-2xs text-slate-500">Video visit details are provided after confirmation</span>
                </div>
              </button>
            </div>
          </div>

          <div>
            <Input
              label="Reason for Visit"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Chest pain, routine checkup, skin rash"
              required
            />
          </div>

          {slotError && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{slotError}</span>
            </div>
          )}

          {/* Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
            <div className="text-xs text-slate-500">
              Total: <span className="font-bold text-slate-900">{formatCurrency(doctor.fee)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" isLoading={isSubmitting}>
                Confirm Appointment
              </Button>
            </div>
          </div>
        </form>
      )}
    </Modal>
  );
};
