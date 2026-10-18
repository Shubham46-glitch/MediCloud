import React, { useState } from 'react';
import { Phone, Heart, Shield, AlertTriangle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Button } from '../../components/common/Button';

export const PatientProfile = () => {
  const { currentUser, updateProfile } = useApp();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const handleSave = async (event) => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    setSaving(true);
    setSaveError('');
    try {
      const result = await updateProfile({
        name: values.get('name'), phone: values.get('phone'), address: values.get('address'),
        dateOfBirth: values.get('dateOfBirth') || undefined, gender: values.get('gender'),
        bloodGroup: values.get('bloodGroup'), insuranceProvider: values.get('insuranceProvider'),
        policyNumber: values.get('policyNumber'),
        allergies: String(values.get('allergies') || '').split(',').map((item) => item.trim()).filter(Boolean),
        emergencyContact: { name: values.get('emergencyName'), phone: values.get('emergencyPhone') },
      });
      if (!result.success) setSaveError(result.error || 'Profile changes could not be saved.');
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Profile Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xs flex flex-col sm:flex-row items-start sm:items-center gap-6">
        <div className="w-20 h-20 rounded-2xl border-2 border-teal-500 bg-teal-50 text-teal-800 text-2xl font-bold grid place-items-center" aria-hidden="true">{currentUser?.name?.slice(0, 1)?.toUpperCase() || '?'}</div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-2xs font-bold uppercase bg-teal-50 text-teal-800 border border-teal-200">
              Patient
            </span>
            <span className="text-2xs text-slate-400">Record ID: {currentUser?.userId || currentUser?.id || '—'}</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900">{currentUser?.name}</h2>
          <p className="text-xs text-slate-500 flex items-center gap-3">
            <span>Account profile</span>
            <span>•</span>
            <span>DOB: {currentUser?.dateOfBirth || 'Not provided'}</span>
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
              <span className="font-semibold text-slate-800 mt-0.5 block">{currentUser?.phone || 'Not provided'}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Residential Address</span>
              <span className="font-semibold text-slate-800 mt-0.5 block">{currentUser?.address || 'Not provided'}</span>
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
              <span className="font-semibold text-slate-800 mt-0.5 block">{currentUser?.insuranceProvider || 'Not provided'}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Policy ID Number</span>
              <span className="font-mono font-semibold text-teal-700 mt-0.5 block">{currentUser?.policyNumber || 'Not provided'}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Verification Status</span>
              <span className="inline-block mt-0.5 px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-2xs font-bold">
                Not verified
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
              <span className="text-base font-bold text-slate-900 mt-0.5 block">{currentUser?.bloodGroup || 'Not provided'}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-400 block font-medium text-2xs uppercase">Gender</span>
              <span className="text-base font-bold text-slate-900 mt-0.5 block">{currentUser?.gender || 'Not provided'}</span>
            </div>
          </div>

          <div>
            <span className="text-slate-400 block font-medium text-xs mb-1">Known Allergies</span>
            <div className="flex flex-wrap gap-1.5">
              {currentUser?.allergies?.length ? currentUser.allergies.map((allergy, i) => (
                <span key={i} className="px-2.5 py-1 rounded bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold">
                  {allergy}
                </span>
              )) : <span className="text-xs text-slate-500">Not provided</span>}
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
              <span className="font-semibold text-slate-800 mt-0.5 block">{currentUser?.emergencyContact?.name || 'Not provided'}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Emergency Phone</span>
              <span className="font-semibold text-slate-800 mt-0.5 block">{currentUser?.emergencyContact?.phone || 'Not provided'}</span>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs space-y-4">
        <div><h3 className="text-sm font-bold text-slate-900">Update profile</h3><p className="text-xs text-slate-500 mt-1">Changes are saved to your account.</p></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="text-xs font-semibold text-slate-600">Name<input name="name" defaultValue={currentUser?.name || ''} required minLength={2} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
          <label className="text-xs font-semibold text-slate-600">Phone<input name="phone" defaultValue={currentUser?.phone || ''} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
          <label className="text-xs font-semibold text-slate-600">Date of birth<input name="dateOfBirth" type="date" defaultValue={currentUser?.dateOfBirth || ''} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
          <label className="text-xs font-semibold text-slate-600">Gender<input name="gender" defaultValue={currentUser?.gender || ''} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
          <label className="text-xs font-semibold text-slate-600">Blood group<input name="bloodGroup" defaultValue={currentUser?.bloodGroup || ''} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
          <label className="text-xs font-semibold text-slate-600">Address<input name="address" defaultValue={currentUser?.address || ''} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
          <label className="text-xs font-semibold text-slate-600">Insurance provider<input name="insuranceProvider" defaultValue={currentUser?.insuranceProvider || ''} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
          <label className="text-xs font-semibold text-slate-600">Policy number<input name="policyNumber" defaultValue={currentUser?.policyNumber || ''} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
          <label className="text-xs font-semibold text-slate-600 sm:col-span-2">Allergies (comma separated)<input name="allergies" defaultValue={currentUser?.allergies?.join(', ') || ''} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
          <label className="text-xs font-semibold text-slate-600">Emergency contact name<input name="emergencyName" defaultValue={currentUser?.emergencyContact?.name || ''} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
          <label className="text-xs font-semibold text-slate-600">Emergency contact phone<input name="emergencyPhone" defaultValue={currentUser?.emergencyContact?.phone || ''} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
        </div>
        {saveError && <p role="alert" className="text-sm text-rose-700">{saveError}</p>}
        <Button type="submit" variant="primary" isLoading={saving}>Save profile</Button>
      </form>
    </div>
  );
};
