import { placeholderResponse } from '../utils/responseFormatter.js';

export const handleAppointmentsPlaceholder = (req, res) => {
  return placeholderResponse(
    res,
    'Appointments',
    'Appointment booking, double-booking prevention, status lifecycle transitions, rescheduling, and cancellations will be implemented in Phase 2.'
  );
};
