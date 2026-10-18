import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { formatDate } from '../../utils/formatters';

export const DoctorPatients = () => {
  const { appointments, currentUser } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);

  const doctorId = currentUser?.doctorId || currentUser?.userId || currentUser?.id;

  // Get unique patients associated with this doctor from appointments
  const patientsMap = {};
  appointments
    .filter((a) => a.doctorId === doctorId)
    .forEach((apt) => {
      if (!patientsMap[apt.patientEmail]) {
        patientsMap[apt.patientEmail] = {
          id: apt.patientId,
          name: apt.patientName,
          email: apt.patientEmail,
          phone: apt.patientPhone,
          gender: apt.patientGender,
          lastVisit: apt.date,
          lastReason: apt.reason,
          consultationCount: 1,
          history: [apt]
        };
      } else {
        patientsMap[apt.patientEmail].consultationCount += 1;
        patientsMap[apt.patientEmail].history.push(apt);
        if (apt.date > patientsMap[apt.patientEmail].lastVisit) {
          patientsMap[apt.patientEmail].lastVisit = apt.date;
          patientsMap[apt.patientEmail].lastReason = apt.reason;
        }
      }
    });

  const patientList = Object.values(patientsMap).filter(
    (p) =>
      !searchTerm ||
      p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.lastReason?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Patient Directory</h2>
          <p className="text-xs text-slate-500">Patients who have attended or scheduled appointments at your clinic</p>
        </div>

        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search patient by name or symptom..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 text-xs bg-white text-slate-900 focus:border-teal-600 focus:ring-2 focus:ring-teal-500/15 outline-none"
          />
        </div>
      </div>

      {/* Patient List Table / Cards */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-2xs uppercase tracking-wider font-bold text-slate-500">
                <th className="py-3 px-4">Patient Name</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">Last Visit</th>
                <th className="py-3 px-4">Chief Complaint</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {patientList.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-500 font-medium">
                    No patients found matching your search.
                  </td>
                </tr>
              ) : (
                patientList.map((patient) => (
                  <tr key={patient.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-800 font-bold flex items-center justify-center shrink-0">
                          {patient.name?.charAt(0) || '?'}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">{patient.name}</div>
                          <div className="text-2xs text-slate-400">{patient.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-medium">
                      {patient.phone || 'Not provided'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {formatDate(patient.lastVisit)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 max-w-xs truncate">
                      {patient.lastReason}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedPatient(patient)}
                        className="text-xs text-teal-700 hover:text-teal-800"
                      >
                        View Chart
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Patient Chart Modal */}
      {selectedPatient && (
        <Modal
          isOpen={!!selectedPatient}
          onClose={() => setSelectedPatient(null)}
          title={`Clinical History: ${selectedPatient.name}`}
          subtitle={`${selectedPatient.consultationCount} Consultations`}
          maxWidth="max-w-xl"
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Consultation History Records
              </h4>
              {selectedPatient.history.map((apt) => (
                <div key={apt.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">{formatDate(apt.date)} at {apt.time}</span>
                    <span className="capitalize font-semibold text-teal-700">{apt.status}</span>
                  </div>
                  <p className="text-slate-600 font-medium">{apt.reason}</p>
                  {apt.notes && <p className="text-2xs text-slate-400 italic">Notes: {apt.notes}</p>}
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <Button variant="secondary" onClick={() => setSelectedPatient(null)}>
                Close Chart
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
