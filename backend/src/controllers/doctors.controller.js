import { placeholderResponse } from '../utils/responseFormatter.js';

export const handleDoctorsPlaceholder = (req, res) => {
  return placeholderResponse(
    res,
    'Doctors',
    'Doctor directory, specialty filtering, profile management, and weekly availability slots will be connected to MongoDB in Phase 2.'
  );
};
