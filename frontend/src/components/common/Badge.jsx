import React from 'react';
import { getStatusConfig } from '../../utils/formatters';

export const Badge = ({ status, label, className = '' }) => {
  const config = getStatusConfig(status);
  const displayLabel = label || config.label;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${config.bg} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {displayLabel}
    </span>
  );
};
