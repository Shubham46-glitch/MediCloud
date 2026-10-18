import React from 'react';

export const StatsCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendPositive = true,
  className = ''
}) => {
  return (
    <div className={`bg-white rounded-xl p-5 border border-slate-200/90 shadow-xs hover:border-slate-300 transition-all ${className}`}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</p>
          <h4 className="text-2xl font-bold text-slate-900 mt-1.5 tracking-tight">{value}</h4>
          {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
          {trend && (
            <p className={`text-xs font-medium mt-1.5 flex items-center gap-1 ${trendPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
              {trendPositive !== null && <span>{trendPositive ? '↑' : '↓'}</span>}
              <span>{trend}</span>
            </p>
          )}
        </div>
        {Icon && (
          <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 shrink-0">
            <Icon className="w-6 h-6" />
          </div>
        )}
      </div>
    </div>
  );
};
