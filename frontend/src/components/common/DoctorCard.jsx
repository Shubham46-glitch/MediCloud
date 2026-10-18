import React from 'react';
import { Star, MapPin, Building2, Calendar } from 'lucide-react';
import { Button } from './Button';
import { formatCurrency } from '../../utils/formatters';

export const DoctorCard = ({ doctor, onBook, onViewDetails }) => {
  const isAvailable = doctor.status === 'active';

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 hover:border-slate-300 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col h-full overflow-hidden group">
      {/* Top Banner / Image Area */}
      <div className="p-5 pb-0">
        <div className="flex items-start gap-4">
          <div className="relative shrink-0">
            {doctor.image ? <img src={doctor.image} alt={doctor.name} className="w-20 h-20 rounded-2xl object-cover border-2 border-white shadow-sm group-hover:scale-102 transition-transform duration-200 bg-slate-100" loading="lazy" /> : <div className="w-20 h-20 rounded-2xl border-2 border-white shadow-sm bg-teal-50 text-teal-800 text-xl font-bold grid place-items-center">{doctor.name?.slice(0, 1) || '?'}</div>}
            {isAvailable ? (
              <span className="absolute bottom-1 right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white" title="Accepting Patients" />
            ) : (
              <span className="absolute bottom-1 right-1 w-3.5 h-3.5 rounded-full bg-slate-400 border-2 border-white" title="Currently Unavailable" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-100/80">
                {doctor.specialty}
              </span>
              {doctor.featured && (
                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-2xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                  Featured
                </span>
              )}
            </div>

            <h3 className="text-base font-bold text-slate-900 mt-1 truncate group-hover:text-teal-700 transition-colors">
              {doctor.name}
            </h3>
            <p className="text-xs text-slate-500 truncate mt-0.5">{doctor.title}</p>

            {(Number.isFinite(doctor.rating) || Number.isFinite(doctor.experience)) && <div className="flex items-center gap-2 mt-2">
              {Number.isFinite(doctor.rating) && <>
              <div className="flex items-center gap-1 text-xs font-bold text-slate-800">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span>{doctor.rating}</span>
              </div>
              {Number.isFinite(doctor.reviewCount) && <span className="text-xs text-slate-400">({doctor.reviewCount} reviews)</span>}
              </>}
              {Number.isFinite(doctor.experience) && <span className="text-xs font-medium text-slate-600">{doctor.experience} yrs experience</span>}
            </div>}
          </div>
        </div>
      </div>

      {/* Middle info */}
      <div className="px-5 py-4 flex-1 flex flex-col justify-between border-t border-slate-100 mt-4 space-y-3">
        <div className="space-y-1.5 text-xs text-slate-600">
          <div className="flex items-center gap-2 truncate">
            <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{doctor.hospital}</span>
          </div>
          <div className="flex items-center gap-2 truncate">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{doctor.location}</span>
          </div>
        </div>

        {/* Available slots preview */}
        {doctor.availableSlots && doctor.availableSlots.length > 0 && (
          <div className="pt-2">
            <div className="flex items-center justify-between text-2xs uppercase tracking-wider font-semibold text-slate-400 mb-1.5">
              <span>Available Times</span>
              <span className="text-teal-600 lowercase font-normal">{doctor.availableSlots.length} slots</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {doctor.availableSlots.slice(0, 3).map((slot, i) => (
                <span key={i} className="px-2 py-0.5 rounded text-2xs font-medium bg-slate-50 text-slate-600 border border-slate-200">
                  {slot}
                </span>
              ))}
              {doctor.availableSlots.length > 3 && (
                <span className="px-1.5 py-0.5 text-2xs text-slate-400 font-medium">
                  +{doctor.availableSlots.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer / CTA */}
      <div className="px-5 py-3.5 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between gap-3">
        <div>
          <span className="text-2xs uppercase text-slate-400 font-semibold block">Consultation</span>
          <span className="text-base font-bold text-slate-900">{formatCurrency(doctor.fee)}</span>
        </div>

        <div className="flex items-center gap-2">
          {onViewDetails && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onViewDetails(doctor)}
              className="text-xs"
            >
              Profile
            </Button>
          )}
          <Button
            variant="primary"
            size="sm"
            onClick={() => onBook(doctor)}
            disabled={!isAvailable}
            leftIcon={Calendar}
            className="text-xs"
          >
            {isAvailable ? 'Book' : 'Unavailable'}
          </Button>
        </div>
      </div>
    </div>
  );
};
