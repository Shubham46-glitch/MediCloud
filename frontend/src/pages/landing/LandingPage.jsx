import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Search,
  MapPin,
  Stethoscope,
  Calendar,
  ShieldCheck,
  ArrowRight,
  Activity,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { DoctorCard } from '../../components/common/DoctorCard';
import { BookingModal } from '../../components/booking/BookingModal';
import { Button } from '../../components/common/Button';

export const LandingPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { doctors, specialties } = useApp();

  const [searchName, setSearchName] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('');
  const [searchLocation, setSearchLocation] = useState('');
  const [bookingDoctor, setBookingDoctor] = useState(null);

  // Smooth scroll to anchor on mount/hash change
  useEffect(() => {
    if (location.hash) {
      const element = document.getElementById(location.hash.replace('#', ''));
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    }
  }, [location]);

  // Featured Doctors
  const featuredDoctors = doctors.filter((doc) => doc.featured || doc.rating >= 4.85).slice(0, 4);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchName) params.set('q', searchName);
    if (selectedSpecialty) params.set('specialty', selectedSpecialty);
    if (searchLocation) params.set('location', searchLocation);
    navigate(`/doctors?${params.toString()}`);
  };

  return (
    <div className="bg-slate-50 min-h-screen">
      {/* HERO SECTION */}
      <section className="relative overflow-hidden bg-gradient-to-b from-teal-50/60 via-slate-50 to-white pt-12 pb-20 lg:pt-18 lg:pb-28 border-b border-slate-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center max-w-3xl mx-auto space-y-5">
            {/* Tagline Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-100/70 border border-teal-200/90 text-teal-800 text-xs font-semibold shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-teal-600" />
              <span>Next-Gen Medical Appointment Platform</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
              Your Health, <span className="text-teal-600">One Click Away.</span>
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-normal max-w-2xl mx-auto">
              Find verified medical specialists, browse live availability time slots, and book in-person or telehealth consultations in seconds.
            </p>

            {/* Hero CTAs */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Button
                variant="primary"
                size="lg"
                leftIcon={Calendar}
                onClick={() => navigate('/doctors')}
                className="shadow-md"
              >
                Book Appointment Now
              </Button>
              <Button
                variant="secondary"
                size="lg"
                onClick={() => navigate('/register')}
              >
                Join as Patient
              </Button>
            </div>
          </div>

          {/* SEARCH BOX COMPONENT */}
          <div className="mt-12 max-w-4xl mx-auto bg-white rounded-2xl shadow-xl border border-slate-200/80 p-3 sm:p-4">
            <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-3">
              {/* Doctor / Symptom */}
              <div className="md:col-span-4 relative flex items-center">
                <Search className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Doctor name or condition..."
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-sm focus:bg-white focus:border-teal-600 focus:ring-2 focus:ring-teal-500/15 outline-none transition-all placeholder:text-slate-400"
                />
              </div>

              {/* Specialty Select */}
              <div className="md:col-span-4 relative flex items-center">
                <Stethoscope className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                <select
                  value={selectedSpecialty}
                  onChange={(e) => setSelectedSpecialty(e.target.value)}
                  className="w-full pl-10 pr-8 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-sm focus:bg-white focus:border-teal-600 focus:ring-2 focus:ring-teal-500/15 outline-none transition-all cursor-pointer"
                >
                  <option value="">All Specialties</option>
                  {specialties.map((spec) => (
                    <option key={spec.id} value={spec.name}>
                      {spec.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Location */}
              <div className="md:col-span-4 flex items-center gap-2">
                <div className="relative flex-1 flex items-center">
                  <MapPin className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="City or state..."
                    value={searchLocation}
                    onChange={(e) => setSearchLocation(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-sm focus:bg-white focus:border-teal-600 focus:ring-2 focus:ring-teal-500/15 outline-none transition-all placeholder:text-slate-400"
                  />
                </div>
                <Button type="submit" variant="primary" className="py-2.5 shrink-0 px-4">
                  Find Care
                </Button>
              </div>
            </form>

            {/* Quick Filter Specialty Pills */}
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2 overflow-x-auto text-xs py-1">
              <span className="text-2xs uppercase tracking-wider font-bold text-slate-400 shrink-0">
                Popular:
              </span>
              {specialties.slice(0, 5).map((spec) => (
                <button
                  key={spec.id}
                  type="button"
                  onClick={() => navigate(`/doctors?specialty=${encodeURIComponent(spec.name)}`)}
                  className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-teal-50 hover:text-teal-700 text-slate-600 transition-colors shrink-0 font-medium cursor-pointer"
                >
                  {spec.name}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Metrics Strip */}
          <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 text-center shadow-2xs">
              <p className="text-2xl font-black text-slate-900">2,480+</p>
              <p className="text-xs text-slate-500 mt-0.5">Patients Consulted</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 text-center shadow-2xs">
              <p className="text-2xl font-black text-teal-600">48+</p>
              <p className="text-xs text-slate-500 mt-0.5">Certified Specialists</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 text-center shadow-2xs">
              <p className="text-2xl font-black text-slate-900">98.4%</p>
              <p className="text-xs text-slate-500 mt-0.5">Patient Satisfaction</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 text-center shadow-2xs">
              <p className="text-2xl font-black text-teal-600">&lt; 15s</p>
              <p className="text-xs text-slate-500 mt-0.5">Instant Booking</p>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURED DOCTORS SECTION */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 mb-10">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-teal-700 mb-1">
              <ShieldCheck className="w-4 h-4" />
              <span>Vetted Healthcare Providers</span>
            </div>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Featured Specialists Available This Week
            </h2>
            <p className="text-sm text-slate-500 mt-1 max-w-xl">
              Experienced, highly-rated doctors across primary disciplines ready for immediate in-person or video consultations.
            </p>
          </div>
          <Button
            variant="outline"
            rightIcon={ArrowRight}
            onClick={() => navigate('/doctors')}
            className="shrink-0"
          >
            View All Doctors
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredDoctors.map((doc) => (
            <DoctorCard
              key={doc.id}
              doctor={doc}
              onBook={(doctor) => setBookingDoctor(doctor)}
              onViewDetails={(doctor) => navigate(`/doctors?id=${doctor.id}`)}
            />
          ))}
        </div>
      </section>

      {/* HOW IT WORKS SECTION */}
      <section id="how-it-works" className="py-20 bg-slate-100/60 border-y border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-700 block mb-1">
              Frictionless Care Delivery
            </span>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              How MediCloud Works
            </h2>
            <p className="text-sm text-slate-600 mt-2">
              Three simple steps to coordinate quality healthcare without phone queues or paperwork delays.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="bg-white rounded-2xl p-7 border border-slate-200/80 shadow-xs relative">
              <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-100 text-teal-600 flex items-center justify-center font-bold text-lg mb-5">
                01
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Find Your Specialist</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Filter by specialty, symptoms, hospital affiliation, and transparent consultation fees to find the right clinician for your needs.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-white rounded-2xl p-7 border border-slate-200/80 shadow-xs relative">
              <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-100 text-teal-600 flex items-center justify-center font-bold text-lg mb-5">
                02
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Pick An Open Slot</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Select your preferred date and time with real-time slot validation. Duplicate bookings are automatically prevented.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-white rounded-2xl p-7 border border-slate-200/80 shadow-xs relative">
              <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-100 text-teal-600 flex items-center justify-center font-bold text-lg mb-5">
                03
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Attend & Manage Care</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Receive instant confirmation, manage your upcoming schedule, or easily reschedule and cancel directly from your dashboard.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* HEALTHCARE BENEFITS SECTION */}
      <section id="about" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-teal-700 block mb-1">
              Patient-First Technology
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Designed For Precision, Comfort, and Peace of Mind.
            </h2>
            <p className="text-base text-slate-600 mt-4 leading-relaxed">
              MediCloud brings clarity to modern healthcare. Say goodbye to prolonged hold times and ambiguous appointment statuses.
            </p>

            <div className="mt-8 space-y-4">
              <div className="flex items-start gap-3.5">
                <div className="w-6 h-6 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Zero Wait Phone Queues</h4>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    Instantly view available doctor calendar hours and book appointments 24/7 on web or mobile.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="w-6 h-6 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">100% Board-Certified Clinicians</h4>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    All physicians in our network undergo thorough medical license verification and clinical background auditing.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="w-6 h-6 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Flexible Rescheduling & Cancellations</h4>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    Life changes. Easily update your appointment date or time slot with one click from your patient dashboard.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4">
              <Button variant="primary" size="lg" onClick={() => navigate('/doctors')}>
                Explore Available Clinics
              </Button>
            </div>
          </div>

          {/* Visual Showcase Card */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-lg space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">MediCloud Realtime Scheduling</h4>
                  <p className="text-2xs text-teal-600 font-semibold">Active Demonstration</p>
                </div>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                Online
              </span>
            </div>

            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-sm">
                    MV
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-800">Dr. Marcus Vance (Cardiology)</h5>
                    <p className="text-2xs text-slate-500">St. Jude Heart Institute • $150</p>
                  </div>
                </div>
                <span className="text-2xs font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                  Confirmed
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-sm">
                    ER
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-800">Dr. Elena Rostova (Dermatology)</h5>
                    <p className="text-2xs text-slate-500">Aura Skin Clinic • $120</p>
                  </div>
                </div>
                <span className="text-2xs font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                  Pending
                </span>
              </div>
            </div>

            <div className="pt-2 text-center text-xs text-slate-400">
              Interactive demo with role-based switching (Patient, Doctor, Admin)
            </div>
          </div>
        </div>
      </section>

      {/* Booking Modal */}
      {bookingDoctor && (
        <BookingModal
          isOpen={!!bookingDoctor}
          onClose={() => setBookingDoctor(null)}
          doctor={bookingDoctor}
        />
      )}
    </div>
  );
};
