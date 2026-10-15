import React from 'react';
import { Phone, Heart, Shield, AlertTriangle } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const PatientProfile = () => {
  const { currentUser } = useApp();

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Profile Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xs flex flex-col sm:flex-row items-start sm:items-center gap-6">
        <img
          src={currentUser?.avatar || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=300'}
          alt={currentUser?.name}
          className="w-20 h-20 rounded-2xl object-cover border-2 border-teal-500 shadow-xs"
        />
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-2xs font-bold uppercase bg-teal-50 text-teal-800 border border-teal-200">
              Verified Patient
            </span>
            <span className="text-2xs text-slate-400">Record ID: {currentUser?.id}</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900">{currentUser?.name}</h2>
          <p className="text-xs text-slate-500 flex items-center gap-3">
            <span>Member since {currentUser?.memberSince || '2024'}</span>
            <span>•</span>
            <span>DOB: {currentUser?.dateOfBirth || 'June 14, 1992'}</span>
          </p>
        </div>
      </div>

      {/* Profile Details Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Contact & Address */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
            <Phone className="w-4 h-4 text-teal-600" />
            <span>Contact Information</span>
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-400 block font-medium">Email Address</span>
              <span className="font-semibold text-slate-800 mt-0.5 block">{currentUser?.email}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Phone Number</span>
              <span className="font-semibold text-slate-800 mt-0.5 block">{currentUser?.phone}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Residential Address</span>
              <span className="font-semibold text-slate-800 mt-0.5 block">{currentUser?.address || 'New York, NY'}</span>
            </div>
          </div>
        </div>

        {/* Insurance Coverage */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
            <Shield className="w-4 h-4 text-teal-600" />
            <span>Insurance Coverage</span>
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-400 block font-medium">Insurance Provider</span>
              <span className="font-semibold text-slate-800 mt-0.5 block">{currentUser?.insuranceProvider || 'BlueCross Premier'}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Policy ID Number</span>
              <span className="font-mono font-semibold text-teal-700 mt-0.5 block">{currentUser?.policyNumber || 'BC-99281-X7'}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Verification Status</span>
              <span className="inline-block mt-0.5 px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-2xs font-bold">
                Active & Verified
              </span>
            </div>
          </div>
        </div>

        {/* Medical Metrics */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
            <Heart className="w-4 h-4 text-rose-500" />
            <span>Vitals & Clinical Data</span>
          </h3>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-400 block font-medium text-2xs uppercase">Blood Group</span>
              <span className="text-base font-bold text-slate-900 mt-0.5 block">{currentUser?.bloodGroup || 'O+'}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-400 block font-medium text-2xs uppercase">Gender</span>
              <span className="text-base font-bold text-slate-900 mt-0.5 block">{currentUser?.gender || 'Female'}</span>
            </div>
          </div>

          <div>
            <span className="text-slate-400 block font-medium text-xs mb-1">Known Allergies</span>
            <div className="flex flex-wrap gap-1.5">
              {currentUser?.allergies?.map((allergy, i) => (
                <span key={i} className="px-2.5 py-1 rounded bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold">
                  {allergy}
                </span>
              )) || <span className="text-xs text-slate-500">None recorded</span>}
            </div>
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span>Emergency Contact</span>
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-400 block font-medium">Designated Contact</span>
              <span className="font-semibold text-slate-800 mt-0.5 block">{currentUser?.emergencyContact?.name || 'Robert Jenkins'}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Emergency Phone</span>
              <span className="font-semibold text-slate-800 mt-0.5 block">{currentUser?.emergencyContact?.phone || '+1 (555) 345-9876'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
