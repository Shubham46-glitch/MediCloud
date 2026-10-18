import { placeholderResponse } from '../utils/responseFormatter.js';

export const handleAdminPlaceholder = (req, res) => {
  return placeholderResponse(
    res,
    'Admin',
    'Platform administration, role-based authorization, doctor verification, and appointment auditing will be implemented in Phase 2.'
  );
};
