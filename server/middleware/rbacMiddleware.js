import AppError from '../utils/AppError.js';

export const restrictTo = (...roles) => {
  return (req, res, next) => {
    // req.user.role is set by protect middleware
    if (!roles.includes(req.user.role)) {
      console.warn(`[RBAC Access Denied] User: ${req.user.email} | Active Role: "${req.user.role}" | Required Roles: ${JSON.stringify(roles)}`);
      return next(new AppError('You do not have permission to perform this action', 403));
    }
    next();
  };
};
