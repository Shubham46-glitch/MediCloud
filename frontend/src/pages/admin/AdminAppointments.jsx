import React, { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { formatDate, formatCurrency } from '../../utils/formatters';

export const AdminAppointments = () => {
  const { appointments, doctors, updateAppointmentStatus } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [doctorFilter, setDoctorFilter] = useState('');
  const [selectedApt, setSelectedApt] = useState(null);

  const filteredAppointments = useMemo(() => {
    return appointments.filter((apt) => {
      const patientName = apt.patientName || '';
      const doctorName = apt.doctorName || '';
      const appointmentId = apt.id || '';
      const matchesSearch =
        !searchTerm ||
        patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doctorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        appointmentId.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = !statusFilter || apt.status === statusFilter;
      const matchesDoctor = !doctorFilter || apt.doctorId === doctorFilter;

      return matchesSearch && matchesStatus && matchesDoctor;
    });
  }, [appointments, searchTerm, statusFilter, doctorFilter]);

  const handleStatusChange = async (aptId, newStatus) => {
    const result = await updateAppointmentStatus(aptId, newStatus);
    if (result.success && selectedApt) setSelectedApt({ ...selectedApt, status: newStatus });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">System Appointment Auditing</h2>
          <p className="text-xs text-slate-500">Monitor, filter, and moderate healthcare appointments across all facilities</p>
        </div>
      </div>

      {/* Filter Strip */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="md:col-span-4 relative flex items-center">
          <Search className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by ref ID, patient, or doctor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50/50 text-slate-900 focus:bg-white focus:border-teal-600 focus:ring-2 focus:ring-teal-500/15 outline-none"
          />
        </div>

        <div className="md:col-span-4">
          <select
            value={doctorFilter}
            onChange={(e) => setDoctorFilter(e.target.value)}
            className="w-full py-2 px-3 rounded-xl border border-slate-200 text-xs bg-slate-50 text-slate-800 outline-none cursor-pointer"
          >
            <option value="">Filter by Doctor (All)</option>
            {doctors.map((doc) => (
              <option key={doc.id} value={doc.id}>
                {doc.name} ({doc.specialty})
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full py-2 px-3 rounded-xl border border-slate-200 text-xs bg-slate-50 text-slate-800 outline-none cursor-pointer"
          >
            <option value="">Filter by Status (All)</option>
            <option value="confirmed">Confirmed</option>
            <option value="pending">Pending Approval</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Appointments Master Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Found {filteredAppointments.length} matching appointment records</span>
          {(searchTerm || statusFilter || doctorFilter) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('');
                setDoctorFilter('');
              }}
              className="text-teal-700 font-bold hover:underline cursor-pointer"
            >
              Clear Filters
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-2xs uppercase tracking-wider font-bold text-slate-500">
                <th className="py-3 px-4">Booking Ref</th>
                <th className="py-3 px-4">Patient</th>
                <th className="py-3 px-4">Doctor</th>
                <th className="py-3 px-4">Schedule</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Fee</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredAppointments.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-slate-500 font-medium">
                    No appointments found matching your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredAppointments.map((apt) => (
                  <tr key={apt.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-700">
                      {apt.id}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{apt.patientName}</div>
                      <div className="text-2xs text-slate-400">{apt.patientPhone}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{apt.doctorName}</div>
                      <div className="text-2xs text-teal-700">{apt.doctorSpecialty}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      <div>{formatDate(apt.date)}</div>
                      <div className="text-2xs text-slate-400 font-semibold">{apt.time}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {apt.type}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {formatCurrency(apt.fee)}
                    </td>
                    <td className="py-3 px-4">
                      <Badge status={apt.status} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedApt(apt)}
                        className="text-xs text-teal-700 hover:text-teal-800"
                      >
                        Audit
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Appointment Audit Modal */}
      {selectedApt && (
        <Modal
          isOpen={!!selectedApt}
          onClose={() => setSelectedApt(null)}
          title={`Appointment Audit: ${selectedApt.id}`}
          subtitle={`${formatDate(selectedApt.date)} at ${selectedApt.time}`}
          maxWidth="max-w-lg"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 block font-semibold text-2xs uppercase">Patient Details</span>
                <span className="font-bold text-slate-800 mt-0.5 block">{selectedApt.patientName}</span>
                <span className="text-slate-500 block">{selectedApt.patientPhone}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 block font-semibold text-2xs uppercase">Assigned Doctor</span>
                <span className="font-bold text-slate-800 mt-0.5 block">{selectedApt.doctorName}</span>
                <span className="text-teal-700 block">{selectedApt.doctorSpecialty}</span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
              <span className="text-slate-400 block font-semibold text-2xs uppercase mb-1">Reason for Visit</span>
              <p className="text-slate-800 font-medium">{selectedApt.reason}</p>
              {selectedApt.notes && <p className="text-2xs text-slate-500 italic mt-1">{selectedApt.notes}</p>}
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
              <span className="text-slate-500">Current Status:</span>
              <Badge status={selectedApt.status} />
            </div>

            <div className="pt-2 border-t border-slate-100">
              <span className="text-2xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
                Override Status As Administrator
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleStatusChange(selectedApt.id, 'confirmed')}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 cursor-pointer"
                >
                  Set Confirmed
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusChange(selectedApt.id, 'completed')}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100 cursor-pointer"
                >
                  Set Completed
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusChange(selectedApt.id, 'cancelled')}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100 cursor-pointer"
                >
                  Cancel Appointment
                </button>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <Button variant="secondary" onClick={() => setSelectedApt(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
