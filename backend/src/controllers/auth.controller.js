import { placeholderResponse } from '../utils/responseFormatter.js';

export const handleAuthPlaceholder = (req, res) => {
  return placeholderResponse(
    res,
    'Authentication',
    'User registration, login, JWT token generation, and password hashing will be implemented in Phase 2.'
  );
};
