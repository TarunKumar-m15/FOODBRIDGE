import AppError from '../utils/AppError.js';

export const validateRegister = (req, res, next) => {
  if (typeof req.body.location === 'string') {
    try {
      req.body.location = JSON.parse(req.body.location);
    } catch (err) {
      // Ignored
    }
  }
  const { name, email, password, role, phone } = req.body;
  
  if (!name || !email || !password || !role || !phone) {
    return next(new AppError('Please fill in all registration fields: name, email, password, role, phone.', 400));
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return next(new AppError('Please provide a valid email address.', 400));
  }

  if (password.length < 6) {
    return next(new AppError('Password must be at least 6 characters long.', 400));
  }

  const validRoles = ['donor', 'ngo', 'volunteer', 'admin', 'super-admin'];
  if (!validRoles.includes(role)) {
    return next(new AppError('Invalid role specified. Must be donor, ngo, volunteer, admin, or super-admin.', 400));
  }

  next();
};

export const validateLogin = (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError('Please provide email and password.', 400));
  }

  next();
};

export const validateDonation = (req, res, next) => {
  if (typeof req.body.foodItems === 'string') {
    try {
      req.body.foodItems = JSON.parse(req.body.foodItems);
    } catch (err) {
      // Handled by validator checks below
    }
  }
  if (typeof req.body.pickupLocation === 'string') {
    try {
      req.body.pickupLocation = JSON.parse(req.body.pickupLocation);
    } catch (err) {
      // Handled by validator checks below
    }
  }

  const { foodItems, cookedAt, expiryTime, pickupLocation, storageMethod, packagingType, freshnessScore, freshness_score } = req.body;

  if (!foodItems || !Array.isArray(foodItems) || foodItems.length === 0) {
    return next(new AppError('Please provide a list of food items as an array.', 400));
  }

  for (const item of foodItems) {
    if (!item.name || !item.quantity || !item.foodType) {
      return next(new AppError('Each food item must have a name, quantity, and foodType (veg, non-veg, vegan, mixed).', 400));
    }
  }

  if (!cookedAt) {
    return next(new AppError('Please provide the cookedAt timestamp.', 400));
  }

  if (!pickupLocation || !pickupLocation.coordinates || pickupLocation.coordinates.length !== 2 || !pickupLocation.address) {
    return next(new AppError('Please provide a valid pickup location containing coordinates [lng, lat] and a formatted address.', 400));
  }

  // Validate new optional shelf-life parameters
  if (storageMethod && !['Room Temperature', 'Refrigerator', 'Freezer'].includes(storageMethod)) {
    return next(new AppError('Invalid storageMethod. Must be Room Temperature, Refrigerator, or Freezer.', 400));
  }

  if (packagingType && !['Open', 'Sealed', 'Vacuum Packed'].includes(packagingType)) {
    return next(new AppError('Invalid packagingType. Must be Open, Sealed, or Vacuum Packed.', 400));
  }

  const activeScore = freshness_score !== undefined ? freshness_score : freshnessScore;
  if (activeScore !== undefined) {
    const score = parseInt(activeScore);
    if (isNaN(score) || score < 1 || score > 10) {
      return next(new AppError('freshnessScore must be an integer between 1 and 10.', 400));
    }
  }

  next();
};
