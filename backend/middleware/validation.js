const { body, validationResult } = require('express-validator');

// Validation error handler
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      error: 'Validation failed', 
      details: errors.array().map(e => ({ field: e.path, message: e.msg }))
    });
  }
  next();
};

// Registration validation
const validateRegister = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 characters'),
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*$/).withMessage('Password must contain uppercase, lowercase, and number'),
  body('college')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('College name too long'),
  body('year')
    .optional()
    .isInt({ min: 1, max: 5 }).withMessage('Year must be between 1 and 5'),
  body('skills')
    .optional()
    .custom((value) => {
      if (!value) return true;
      const arr = typeof value === 'string' ? value.split(',') : value;
      if (!Array.isArray(arr) || arr.length > 20) return false;
      return arr.every(skill => {
        const trimmed = typeof skill === 'string' ? skill.trim() : '';
        return trimmed.length > 0 && trimmed.length <= 50 && !/[<>"']/.test(trimmed);
      });
    }).withMessage('Invalid skills format or length'),
  validate
];

// Login validation
const validateLogin = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required'),
  validate
];

// Profile update validation
const validateProfileUpdate = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 characters'),
  body('bio')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Bio cannot exceed 500 characters'),
  body('college')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('College name too long'),
  body('year')
    .optional()
    .isInt({ min: 1, max: 5 }).withMessage('Year must be between 1 and 5'),
  body('skills')
    .optional()
    .custom((value) => {
      if (!value) return true;
      const arr = typeof value === 'string' ? value.split(',') : value;
      if (!Array.isArray(arr) || arr.length > 20) return false;
      return arr.every(skill => {
        const trimmed = typeof skill === 'string' ? skill.trim() : '';
        return trimmed.length > 0 && trimmed.length <= 50 && !/[<>"']/.test(trimmed);
      });
    }).withMessage('Invalid skills format or length'),
  body('experienceLevel')
    .optional()
    .isIn(['beginner', 'intermediate', 'advanced', 'expert']).withMessage('Invalid experience level'),
  body('interests')
    .optional()
    .custom((value) => {
      if (!value) return true;
      const arr = typeof value === 'string' ? value.split(',') : value;
      if (!Array.isArray(arr) || arr.length > 10) return false;
      return arr.every(interest => {
        const trimmed = typeof interest === 'string' ? interest.trim() : '';
        return trimmed.length > 0 && trimmed.length <= 50 && !/[<>"']/.test(trimmed);
      });
    }).withMessage('Invalid interests format or length'),
  body('github')
    .optional()
    .trim()
    .custom((value) => {
      if (!value) return true;
      return /^https?:\/\/(www\.)?github\.com\/[\w-]+\/?$/.test(value);
    }).withMessage('Invalid GitHub URL format'),
  body('linkedin')
    .optional()
    .trim()
    .custom((value) => {
      if (!value) return true;
      return /^https?:\/\/(www\.)?linkedin\.com\/in\/[\w-]+\/?$/.test(value);
    }).withMessage('Invalid LinkedIn URL format'),
  body('availability')
    .optional()
    .isIn(['available', 'busy', 'in-team']).withMessage('Invalid availability status'),
  validate
];

module.exports = {
  validateRegister,
  validateLogin,
  validateProfileUpdate
};
