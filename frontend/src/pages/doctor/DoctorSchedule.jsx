import React, { useState, useEffect } from 'react';
import { Clock, Plus, Trash2, Calendar, Save } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Button } from '../../components/common/Button';

export const DoctorSchedule = () => {
  const { currentUser, doctors, updateDoctorSlots, showToast } = useApp();

  // Active doctor
  const doctor = doctors.find((d) => d.id === (currentUser?.id || 'doc-1')) || doctors[0];

  const [slots, setSlots] = useState(
    doctor?.availableSlots || ['09:00 AM', '10:00 AM', '11:30 AM', '02:00 PM', '03:30 PM', '04:30 PM']
  );

  const [workingDays, setWorkingDays] = useState(
    doctor?.availableDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
  );

  const [newSlotTime, setNewSlotTime] = useState('01:00 PM');
  const [isSaving, setIsSaving] = useState(false);

  // Sync state if active doctor changes
  useEffect(() => {
    if (doctor) {
      setSlots(doctor.availableSlots || ['09:00 AM', '10:00 AM', '11:30 AM', '02:00 PM', '03:30 PM', '04:30 PM']);
      setWorkingDays(doctor.availableDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
    }
  }, [doctor]);

  const allDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const handleToggleDay = (day) => {
    if (workingDays.includes(day)) {
      if (workingDays.length === 1) {
        showToast('At least one active working day is required', 'error');
        return;
      }
      setWorkingDays(workingDays.filter((d) => d !== day));
    } else {
      setWorkingDays([...workingDays, day]);
    }
  };

  const handleAddSlot = (e) => {
    e.preventDefault();
    if (!newSlotTime.trim()) return;

    if (slots.includes(newSlotTime.trim())) {
      showToast('This time slot is already listed in your availability', 'error');
      return;
    }

    setSlots([...slots, newSlotTime.trim()]);
    showToast(`Added ${newSlotTime} to active slots`, 'success');
  };

  const handleRemoveSlot = (slotToRemove) => {
    if (slots.length <= 1) {
      showToast('You must maintain at least one consultation slot', 'error');
      return;
    }
    setSlots(slots.filter((s) => s !== slotToRemove));
    showToast(`Removed ${slotToRemove}`, 'info');
  };

  const handleSaveAll = () => {
    setIsSaving(true);
    setTimeout(() => {
      updateDoctorSlots(doctor.id, slots, workingDays);
      setIsSaving(false);
      showToast('Weekly schedule & availability hours updated successfully', 'success');
    }, 350);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Availability & Time-Slot Management</h2>
          <p className="text-xs text-slate-500">Configure your weekly consulting days and bookable appointment hours</p>
        </div>
        <Button
          variant="primary"
          leftIcon={Save}
          onClick={handleSaveAll}
          isLoading={isSaving}
        >
          Save Availability Settings
        </Button>
      </div>

      {/* Working Days Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs space-y-4">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-teal-600" />
            <span>Active Consultation Days</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Patients can only book appointments on days selected here.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 pt-2">
          {allDays.map((day) => {
            const isActive = workingDays.includes(day);
            return (
              <button
                key={day}
                type="button"
                onClick={() => handleToggleDay(day)}
                className={`py-3 px-2 rounded-xl border text-center transition-all cursor-pointer ${
                  isActive
                    ? 'bg-teal-50 border-teal-500 text-teal-900 font-bold shadow-2xs'
                    : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100 font-medium'
                }`}
              >
                <span className="text-xs block">{day.slice(0, 3)}</span>
                <span className="text-2xs block mt-1 font-semibold">
                  {isActive ? 'Available' : 'Off'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Consultation Time Slots Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs space-y-6">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-teal-600" />
            <span>Bookable Consultation Time Slots</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time appointment slots shown to patients booking appointments with you.
          </p>
        </div>

        {/* Add Slot Form */}
        <form onSubmit={handleAddSlot} className="flex items-end gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200/80">
          <div className="flex-1 max-w-xs">
            <label className="text-2xs font-bold uppercase tracking-wider text-slate-600 block mb-1">
              New Time Slot
            </label>
            <input
              type="text"
              placeholder="e.g. 05:00 PM"
              value={newSlotTime}
              onChange={(e) => setNewSlotTime(e.target.value)}
              className="w-full bg-white text-slate-900 text-xs rounded-lg border border-slate-300 py-2 px-3 focus:border-teal-600 outline-none"
            />
          </div>
          <Button type="submit" variant="primary" size="sm" leftIcon={Plus}>
            Add Slot
          </Button>
        </form>

        {/* Existing Slots Grid */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Configured Slots ({slots.length})</span>
            <span>Click trash icon to delete</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {slots.map((slot) => (
              <div
                key={slot}
                className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200 hover:border-slate-300 shadow-2xs group"
              >
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                  <Clock className="w-3.5 h-3.5 text-teal-600" />
                  <span>{slot}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveSlot(slot)}
                  className="text-slate-300 hover:text-rose-600 p-1 rounded transition-colors cursor-pointer"
                  title="Remove this slot"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
