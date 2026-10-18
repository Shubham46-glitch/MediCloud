import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Stethoscope,
  CalendarCheck,
  Plus,
  ArrowRight,
  Clock,
  Layers
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { StatsCard } from '../../components/common/StatsCard';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { formatDate, formatCurrency } from '../../utils/formatters';

export const AdminDashboard = () => {
  const navigate = useNavigate();
  const { doctors, appointments, specialties, toggleDoctorStatus, currentUser } = useApp();

  const activeDoctorsCount = doctors.filter((d) => d.status === 'active').length;
  const pendingAppointmentsCount = appointments.filter((a) => a.status === 'pending').length;
  const _confirmedAppointmentsCount = appointments.filter((a) => a.status === 'confirmed').length;
  const _completedAppointmentsCount = appointments.filter((a) => a.status === 'completed').length;

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 border border-teal-200">
              Clinical Administration
            </span>
            <span className="text-2xs text-slate-400">System Operator: {currentUser?.name || 'Administrator'}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            Hospital System Control Center
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Real-time platform operations, physician roster governance, and appointment telemetry
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={() => navigate('/admin/appointments')}
          >
            All Appointments
          </Button>
          <Button
            variant="primary"
            leftIcon={Plus}
            onClick={() => navigate('/admin/doctors')}
          >
            Manage Providers
          </Button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Active Doctors"
          value={activeDoctorsCount}
          subtitle={`Out of ${doctors.length} registered clinicians`}
          icon={Stethoscope}
          trend="Current directory count"
          trendPositive={null}
        />
        <StatsCard
          title="Total Consultations"
          value={appointments.length}
          subtitle="System booking transactions"
          icon={CalendarCheck}
          trend="Loaded appointment records"
          trendPositive={null}
        />
        <StatsCard
          title="Pending Approvals"
          value={pendingAppointmentsCount}
          subtitle="Awaiting clinician triage"
          icon={Clock}
          trend={pendingAppointmentsCount > 0 ? 'Requires attention' : 'No pending items'}
          trendPositive={null}
        />
        <StatsCard
          title="Clinical Specialties"
          value={specialties.length}
          subtitle="Hospital departments"
          icon={Layers}
        />
      </div>

      {/* RECENT PLATFORM APPOINTMENTS TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Recent Platform Appointments</h3>
            <p className="text-xs text-slate-500">Live transaction stream across all specialties</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            rightIcon={ArrowRight}
            onClick={() => navigate('/admin/appointments')}
          >
            Full Appointment Log
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-2xs uppercase tracking-wider font-bold text-slate-500">
                <th className="py-3 px-4">Booking Ref</th>
                <th className="py-3 px-4">Patient</th>
                <th className="py-3 px-4">Doctor & Specialty</th>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Consultation Fee</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {appointments.slice(0, 5).map((apt) => (
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
                    <div className="text-2xs text-slate-400">{apt.time}</div>
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-900">
                    {formatCurrency(apt.fee)}
                  </td>
                  <td className="py-3 px-4">
                    <Badge status={apt.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* QUICK DOCTOR ROSTER MANAGEMENT STRIP */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Doctor Quick Status Control</h3>
            <p className="text-xs text-slate-500">Activate or deactivate clinician availability</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/admin/doctors')}
          >
            Add / Edit Doctor Profiles
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          {doctors.slice(0, 4).map((doc) => {
            const isActive = doc.status === 'active';
            return (
              <div
                key={doc.id}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between space-y-3"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={doc.image}
                    alt={doc.name}
                    className="w-10 h-10 rounded-full object-cover border border-slate-200"
                  />
                  <div className="min-w-0 flex-1">
                    <h5 className="text-xs font-bold text-slate-900 truncate">{doc.name}</h5>
                    <p className="text-2xs text-teal-700 truncate">{doc.specialty}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200/60">
                  <Badge status={doc.status} />
                  <button
                    type="button"
                    onClick={() => toggleDoctorStatus(doc.id)}
                    className={`text-2xs font-bold px-2 py-1 rounded transition-colors cursor-pointer ${
                      isActive
                        ? 'text-rose-600 hover:bg-rose-50'
                        : 'text-teal-700 hover:bg-teal-50'
                    }`}
                  >
                    {isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
