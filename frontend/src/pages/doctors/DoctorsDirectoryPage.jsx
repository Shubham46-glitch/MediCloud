import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Filter, Stethoscope, MapPin, X, Calendar } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { DoctorCard } from '../../components/common/DoctorCard';
import { BookingModal } from '../../components/booking/BookingModal';
import { EmptyState } from '../../components/common/EmptyState';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { formatCurrency } from '../../utils/formatters';

export const DoctorsDirectoryPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { doctors, specialties } = useApp();

  const searchTerm = searchParams.get('q') || '';
  const selectedSpecialty = searchParams.get('specialty') || '';
  const selectedLocation = searchParams.get('location') || '';
  const [sortBy, setSortBy] = useState('recommended'); // recommended, rating, fee-asc, fee-desc, experience

  const [bookingDoctor, setBookingDoctor] = useState(null);
  const [selectedDoctorDetails, setSelectedDoctorDetails] = useState(null);

  const updateFilter = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
  };

  // Filter & Sort Logic
  const filteredDoctors = useMemo(() => {
    return doctors.filter((doc) => {
      const matchesSearch =
        !searchTerm ||
        (doc.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (doc.specialty || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (doc.hospital || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchesSpecialty =
        !selectedSpecialty || (doc.specialty || '').toLowerCase() === selectedSpecialty.toLowerCase();

      const matchesLocation =
        !selectedLocation || (doc.location || '').toLowerCase().includes(selectedLocation.toLowerCase());

      return matchesSearch && matchesSpecialty && matchesLocation;
    }).sort((a, b) => {
      if (sortBy === 'rating') return (b.rating ?? -1) - (a.rating ?? -1);
      if (sortBy === 'fee-asc') return (a.fee ?? Number.MAX_SAFE_INTEGER) - (b.fee ?? Number.MAX_SAFE_INTEGER);
      if (sortBy === 'fee-desc') return (b.fee ?? -1) - (a.fee ?? -1);
      if (sortBy === 'experience') return (b.experience ?? -1) - (a.experience ?? -1);
      return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
    });
  }, [doctors, searchTerm, selectedSpecialty, selectedLocation, sortBy]);

  const clearFilters = () => {
    setSortBy('recommended');
    setSearchParams({});
  };

  const hasActiveFilters = searchTerm || selectedSpecialty || selectedLocation || sortBy !== 'recommended';

  return (
    <div className="bg-slate-50 min-h-screen py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-teal-700 mb-1">
            <Stethoscope className="w-4 h-4" />
            <span>Medical Specialists</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Find Doctors & Specialists</h1>
          <p className="text-sm text-slate-600 mt-1">
            Browse doctor profiles by specialty and location, then request an appointment.
          </p>
        </div>

        {/* Filter Controls Card */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs mb-8 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            {/* Search input */}
            <div className="md:col-span-4 relative flex items-center">
              <Search className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by doctor, clinic, or keyword..."
                value={searchTerm}
                onChange={(e) => updateFilter('q', e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-sm focus:bg-white focus:border-teal-600 focus:ring-2 focus:ring-teal-500/15 outline-none transition-all placeholder:text-slate-400"
              />
            </div>

            {/* Specialty filter */}
            <div className="md:col-span-3">
              <select
                value={selectedSpecialty}
                onChange={(e) => updateFilter('specialty', e.target.value)}
                className="w-full py-2.5 px-3.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-sm focus:bg-white focus:border-teal-600 focus:ring-2 focus:ring-teal-500/15 outline-none transition-all cursor-pointer"
              >
                <option value="">All Specialties</option>
                {specialties.map((spec) => (
                  <option key={spec.id} value={spec.name}>
                    {spec.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Location filter */}
            <div className="md:col-span-3 relative flex items-center">
              <MapPin className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Filter by city/state..."
                value={selectedLocation}
                onChange={(e) => updateFilter('location', e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-sm focus:bg-white focus:border-teal-600 focus:ring-2 focus:ring-teal-500/15 outline-none transition-all placeholder:text-slate-400"
              />
            </div>

            {/* Sort Dropdown */}
            <div className="md:col-span-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full py-2.5 px-3.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-sm focus:bg-white focus:border-teal-600 focus:ring-2 focus:ring-teal-500/15 outline-none transition-all cursor-pointer"
              >
                <option value="recommended">Featured First</option>
                <option value="rating">Highest Rated</option>
                <option value="experience">Most Experienced</option>
                <option value="fee-asc">Fee: Low to High</option>
                <option value="fee-desc">Fee: High to Low</option>
              </select>
            </div>
          </div>

          {/* Active Filter Chips & Results Count */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100 flex-wrap gap-2 text-xs">
            <div className="text-slate-600">
              Showing <span className="font-bold text-slate-900">{filteredDoctors.length}</span> doctors available
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Reset All Filters</span>
              </button>
            )}
          </div>
        </div>

        {/* Doctor Grid */}
        {filteredDoctors.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredDoctors.map((doc) => (
              <DoctorCard
                key={doc.id}
                doctor={doc}
                onBook={(doctor) => setBookingDoctor(doctor)}
                onViewDetails={(doctor) => setSelectedDoctorDetails(doctor)}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Filter}
            title="No doctors match your criteria"
            description="Try modifying your search keywords, clearing specialty filters, or searching for a different city."
            actionLabel="Reset Search Filters"
            onAction={clearFilters}
          />
        )}
      </div>

      {/* Booking Modal */}
      {bookingDoctor && (
        <BookingModal
          isOpen={!!bookingDoctor}
          onClose={() => setBookingDoctor(null)}
          doctor={bookingDoctor}
        />
      )}

      {/* Doctor Detail Modal */}
      {selectedDoctorDetails && (
        <Modal
          isOpen={!!selectedDoctorDetails}
          onClose={() => setSelectedDoctorDetails(null)}
          title={selectedDoctorDetails.name}
          subtitle={selectedDoctorDetails.title}
          maxWidth="max-w-2xl"
        >
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pb-4 border-b border-slate-100">
              <img
                src={selectedDoctorDetails.image}
                alt={selectedDoctorDetails.name}
                className="w-20 h-20 rounded-2xl object-cover border border-slate-200"
              />
              <div className="space-y-1">
                <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-100">
                  {selectedDoctorDetails.specialty}
                </span>
                <p className="text-sm font-semibold text-slate-800">{selectedDoctorDetails.hospital}</p>
                <p className="text-xs text-slate-500">{selectedDoctorDetails.location}</p>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Biography & Care Approach</h4>
              <p className="text-sm text-slate-700 leading-relaxed">{selectedDoctorDetails.bio}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 font-semibold block uppercase text-2xs">Education & Training</span>
                <span className="font-bold text-slate-800 mt-1 block">{selectedDoctorDetails.education}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 font-semibold block uppercase text-2xs">Languages Spoken</span>
                <span className="font-bold text-slate-800 mt-1 block">
                  {selectedDoctorDetails.languages?.join(', ') || 'Not provided'}
                </span>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Available Consultation Hours</h4>
              <div className="flex flex-wrap gap-2">
                {selectedDoctorDetails.availableSlots?.map((slot, i) => (
                  <span key={i} className="px-3 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium">
                    {slot}
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-2xs uppercase text-slate-400 block font-semibold">Standard Consultation</span>
                <span className="text-xl font-bold text-slate-900">{formatCurrency(selectedDoctorDetails.fee)}</span>
              </div>
              <Button
                variant="primary"
                leftIcon={Calendar}
                onClick={() => {
                  const doc = selectedDoctorDetails;
                  setSelectedDoctorDetails(null);
                  setBookingDoctor(doc);
                }}
              >
                Book with {selectedDoctorDetails.name}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
