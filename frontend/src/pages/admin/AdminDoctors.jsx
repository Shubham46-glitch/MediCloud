import React, { useState } from 'react';
import {
  Stethoscope,
  Plus,
  Search,
  Edit2,
  Sparkles,
  Layers
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { formatCurrency } from '../../utils/formatters';

export const AdminDoctors = () => {
  const { doctors, specialties, addDoctor, updateDoctor, toggleDoctorStatus, addSpecialty } = useApp();

  const [activeTab, setActiveTab] = useState('doctors'); // 'doctors' | 'specialties'
  const [searchTerm, setSearchTerm] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState('');

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState(null);
  const [isAddSpecialtyOpen, setIsAddSpecialtyOpen] = useState(false);

  // Form State for Doctor
  const [doctorForm, setDoctorForm] = useState({
    name: '',
    title: '',
    specialty: 'Cardiology',
    hospital: '',
    location: '',
    fee: 150,
    experience: 10,
    bio: '',
    education: '',
    availableSlots: '09:00 AM, 11:00 AM, 02:00 PM, 04:00 PM'
  });

  // Specialty Form
  const [specForm, setSpecForm] = useState({
    name: '',
    description: '',
    icon: 'Stethoscope'
  });

  const filteredDoctors = doctors.filter((doc) => {
    const matchesSearch =
      !searchTerm ||
      doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.hospital.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSpecialty =
      !specialtyFilter || doc.specialty.toLowerCase() === specialtyFilter.toLowerCase();
    return matchesSearch && matchesSpecialty;
  });

  const openAddDoctor = () => {
    setDoctorForm({
      name: '',
      title: 'MD - Specialist',
      specialty: specialties[0]?.name || 'Cardiology',
      hospital: 'Metro Central Hospital',
      location: 'New York, NY',
      fee: 140,
      experience: 8,
      bio: 'Board-certified medical practitioner with extensive clinical experience.',
      education: 'Johns Hopkins School of Medicine',
      availableSlots: '09:00 AM, 11:00 AM, 02:00 PM, 04:00 PM'
    });
    setIsAddModalOpen(true);
  };

  const openEditDoctor = (doc) => {
    setEditingDoctor(doc);
    setDoctorForm({
      name: doc.name,
      title: doc.title,
      specialty: doc.specialty,
      hospital: doc.hospital,
      location: doc.location,
      fee: doc.fee,
      experience: doc.experience,
      bio: doc.bio || '',
      education: doc.education || '',
      availableSlots: doc.availableSlots?.join(', ') || '09:00 AM, 11:00 AM, 02:00 PM'
    });
  };

  const handleDoctorSubmit = (e) => {
    e.preventDefault();
    const slotsArray = doctorForm.availableSlots
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (editingDoctor) {
      updateDoctor(editingDoctor.id, {
        ...doctorForm,
        fee: Number(doctorForm.fee),
        experience: Number(doctorForm.experience),
        availableSlots: slotsArray
      });
      setEditingDoctor(null);
    } else {
      addDoctor({
        ...doctorForm,
        fee: Number(doctorForm.fee),
        experience: Number(doctorForm.experience),
        availableSlots: slotsArray,
        rating: 5.0,
        reviewCount: 1,
        featured: false
      });
      setIsAddModalOpen(false);
    }
  };

  const handleSpecialtySubmit = (e) => {
    e.preventDefault();
    if (!specForm.name.trim()) return;
    addSpecialty(specForm.name, specForm.description, specForm.icon);
    setSpecForm({ name: '', description: '', icon: 'Stethoscope' });
    setIsAddSpecialtyOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Physician & Specialty Governance</h2>
          <p className="text-xs text-slate-500">Add, edit, deactivate clinician credentials and configure medical specialties</p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'doctors' ? (
            <Button variant="primary" leftIcon={Plus} onClick={openAddDoctor}>
              Add Doctor Profile
            </Button>
          ) : (
            <Button variant="primary" leftIcon={Plus} onClick={() => setIsAddSpecialtyOpen(true)}>
              Add Specialty
            </Button>
          )}
        </div>
      </div>

      {/* View Switcher Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('doctors')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'doctors'
              ? 'bg-teal-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Stethoscope className="w-4 h-4" />
          <span>Doctor Profiles ({doctors.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('specialties')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'specialties'
              ? 'bg-teal-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Medical Specialties ({specialties.length})</span>
        </button>
      </div>

      {/* DOCTORS TAB VIEW */}
      {activeTab === 'doctors' && (
        <div className="space-y-4">
          {/* Search & Specialty Filter */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm w-full">
              <Search className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search doctors by name or hospital..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50/50 text-slate-900 focus:bg-white focus:border-teal-600 focus:ring-2 focus:ring-teal-500/15 outline-none"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={specialtyFilter}
                onChange={(e) => setSpecialtyFilter(e.target.value)}
                className="py-2 px-3 rounded-xl border border-slate-200 text-xs bg-slate-50 text-slate-800 outline-none cursor-pointer"
              >
                <option value="">All Specialties</option>
                {specialties.map((spec) => (
                  <option key={spec.id} value={spec.name}>
                    {spec.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Doctors Table */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-2xs uppercase tracking-wider font-bold text-slate-500">
                    <th className="py-3 px-4">Doctor</th>
                    <th className="py-3 px-4">Specialty & Affiliation</th>
                    <th className="py-3 px-4">Consultation Fee</th>
                    <th className="py-3 px-4">Rating & Experience</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredDoctors.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-8 text-center text-slate-500 font-medium">
                        No doctor profiles found matching your search or specialty filter.
                      </td>
                    </tr>
                  ) : (
                    filteredDoctors.map((doc) => {
                      const isActive = doc.status === 'active';
                      return (
                        <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <img
                                src={doc.image}
                                alt={doc.name}
                                className="w-9 h-9 rounded-xl object-cover border border-slate-200"
                              />
                              <div>
                                <div className="font-bold text-slate-900">{doc.name}</div>
                                <div className="text-2xs text-slate-400">{doc.title}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-teal-700">{doc.specialty}</div>
                            <div className="text-2xs text-slate-500">{doc.hospital}</div>
                          </td>
                          <td className="py-3.5 px-4 font-bold text-slate-900">
                            {formatCurrency(doc.fee)}
                          </td>
                          <td className="py-3.5 px-4 text-slate-600">
                            <div>★ {doc.rating} ({doc.reviewCount || 0})</div>
                            <div className="text-2xs text-slate-400">{doc.experience} years experience</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <Badge status={doc.status} />
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => openEditDoctor(doc)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                                title="Edit Profile"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => toggleDoctorStatus(doc.id)}
                                className={`text-2xs font-bold px-2.5 py-1 rounded-md border transition-colors cursor-pointer ${
                                  isActive
                                    ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                                    : 'border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100'
                                }`}
                              >
                                {isActive ? 'Deactivate' : 'Activate'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SPECIALTIES TAB VIEW */}
      {activeTab === 'specialties' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {specialties.map((spec) => (
            <div
              key={spec.id}
              className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs hover:border-slate-300 transition-all space-y-3"
            >
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">{spec.name}</h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{spec.description}</p>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-2xs text-slate-400 font-semibold">
                <span>ACTIVE CLINICAL DEPARTMENT</span>
                <span className="text-teal-700 font-bold">
                  {doctors.filter((d) => d.specialty.toLowerCase() === spec.name.toLowerCase()).length} Doctors
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ADD / EDIT DOCTOR MODAL */}
      {(isAddModalOpen || editingDoctor) && (
        <Modal
          isOpen={isAddModalOpen || !!editingDoctor}
          onClose={() => {
            setIsAddModalOpen(false);
            setEditingDoctor(null);
          }}
          title={editingDoctor ? `Edit ${editingDoctor.name}` : 'Add New Doctor Profile'}
          subtitle="Configure clinician credentials, hospital affiliation, and consultation fees"
          maxWidth="max-w-2xl"
        >
          <form onSubmit={handleDoctorSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Full Name (with Dr. prefix)"
                value={doctorForm.name}
                onChange={(e) => setDoctorForm({ ...doctorForm, name: e.target.value })}
                placeholder="Dr. Alexander Smith"
                required
              />
              <Input
                label="Professional Title & Credentials"
                value={doctorForm.title}
                onChange={(e) => setDoctorForm({ ...doctorForm, title: e.target.value })}
                placeholder="MD, FACC - Attending Cardiologist"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Select
                label="Specialty"
                value={doctorForm.specialty}
                onChange={(e) => setDoctorForm({ ...doctorForm, specialty: e.target.value })}
                options={specialties.map((s) => s.name)}
                required
              />
              <Input
                label="Consultation Fee ($)"
                type="number"
                value={doctorForm.fee}
                onChange={(e) => setDoctorForm({ ...doctorForm, fee: e.target.value })}
                required
              />
              <Input
                label="Experience (Years)"
                type="number"
                value={doctorForm.experience}
                onChange={(e) => setDoctorForm({ ...doctorForm, experience: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Hospital / Clinic Name"
                value={doctorForm.hospital}
                onChange={(e) => setDoctorForm({ ...doctorForm, hospital: e.target.value })}
                placeholder="St. Jude Medical Institute"
                required
              />
              <Input
                label="City & State"
                value={doctorForm.location}
                onChange={(e) => setDoctorForm({ ...doctorForm, location: e.target.value })}
                placeholder="New York, NY"
                required
              />
            </div>

            <Input
              label="Medical Education & University"
              value={doctorForm.education}
              onChange={(e) => setDoctorForm({ ...doctorForm, education: e.target.value })}
              placeholder="Harvard Medical School"
            />

            <div>
              <label className="text-2xs font-bold uppercase tracking-wider text-slate-700 block mb-1">
                Clinical Biography
              </label>
              <textarea
                value={doctorForm.bio}
                onChange={(e) => setDoctorForm({ ...doctorForm, bio: e.target.value })}
                rows={2}
                className="w-full bg-white text-slate-900 text-xs rounded-lg border border-slate-300 p-2.5 focus:border-teal-600 outline-none"
                placeholder="Brief clinical background and specialty focus..."
              />
            </div>

            <Input
              label="Bookable Time Slots (comma-separated)"
              value={doctorForm.availableSlots}
              onChange={(e) => setDoctorForm({ ...doctorForm, availableSlots: e.target.value })}
              placeholder="09:00 AM, 11:00 AM, 02:00 PM, 04:00 PM"
              required
            />

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingDoctor(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                {editingDoctor ? 'Save Changes' : 'Create Doctor Profile'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ADD SPECIALTY MODAL */}
      {isAddSpecialtyOpen && (
        <Modal
          isOpen={isAddSpecialtyOpen}
          onClose={() => setIsAddSpecialtyOpen(false)}
          title="Add Medical Specialty"
          subtitle="Define a new clinical department in MediCloud"
          maxWidth="max-w-md"
        >
          <form onSubmit={handleSpecialtySubmit} className="space-y-4">
            <Input
              label="Specialty Name"
              value={specForm.name}
              onChange={(e) => setSpecForm({ ...specForm, name: e.target.value })}
              placeholder="e.g. Endocrinology"
              required
            />
            <Input
              label="Description"
              value={specForm.description}
              onChange={(e) => setSpecForm({ ...specForm, description: e.target.value })}
              placeholder="e.g. Hormone, thyroid, and endocrine conditions"
              required
            />
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <Button variant="secondary" onClick={() => setIsAddSpecialtyOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                Add Specialty
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
