import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Donor from '../models/Donor.js';
import NGO from '../models/NGO.js';
import Volunteer from '../models/Volunteer.js';
import AppError from '../utils/AppError.js';
import catchAsync from '../utils/catchAsync.js';
import { uploadToCloudinary } from '../middleware/upload.js';

const signToken = (id, role, secret, expiry) => {
  return jwt.sign({ id, role }, secret, {
    expiresIn: expiry,
  });
};

const createSendTokens = async (user, statusCode, res) => {
  const accessToken = signToken(user._id, user.role, process.env.JWT_ACCESS_SECRET, process.env.JWT_ACCESS_EXPIRY);
  const refreshToken = signToken(user._id, user.role, process.env.JWT_REFRESH_SECRET, process.env.JWT_REFRESH_EXPIRY);

  // Save refresh token to user
  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  // Store refresh token in cookie
  const cookieOptions = {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  };

  res.cookie('refreshToken', refreshToken, cookieOptions);

  // Hide password and refresh token from output
  user.password = undefined;
  user.refreshToken = undefined;

  res.status(statusCode).json({
    status: 'success',
    accessToken,
    data: {
      user,
    },
  });
};

export const register = catchAsync(async (req, res, next) => {
  const { name, email, password, role, phone, organizationName, donorType, taxId, registrationNumber, documentUrl, contactPerson, vehicleType, location } = req.body;

  let finalDocumentUrl = documentUrl || 'https://res.cloudinary.com/mock-doc.pdf';
  if (req.file) {
    try {
      finalDocumentUrl = await uploadToCloudinary(req.file.buffer, 'documents');
    } catch (err) {
      console.error('Cloudinary document upload failure:', err.message);
    }
  }

  // 1) Create base user
  const newUser = await User.create({
    name,
    email,
    password,
    role,
    phone,
  });

  // 2) Create specific profile based on user role
  try {
    if (role === 'donor') {
      await Donor.create({
        userId: newUser._id,
        organizationName: organizationName || `${name}'s Org`,
        donorType: donorType || 'individual',
        taxId: taxId || '',
        location: location || { coordinates: [0, 0], address: 'No Address provided' },
      });
    } else if (role === 'ngo') {
      await NGO.create({
        userId: newUser._id,
        registrationNumber: registrationNumber || `REG-${Date.now()}`,
        documentUrl: finalDocumentUrl,
        contactPerson: contactPerson || name,
        location: location || { coordinates: [0, 0], address: 'No Address provided' },
      });
    } else if (role === 'volunteer') {
      await Volunteer.create({
        userId: newUser._id,
        vehicleType: vehicleType || 'bicycle',
        currentLocation: location || { coordinates: [0, 0] },
      });
    }
  } catch (err) {
    // Cleanup created user if profile fails
    await User.findByIdAndDelete(newUser._id);
    return next(err);
  }

  // 3) Respond
  await createSendTokens(newUser, 201, res);
});

export const login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // 1) Check if email and password exist
  if (!email || !password) {
    return next(new AppError('Please provide email and password!', 400));
  }

  // 2) Check if user exists & password is correct
  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.comparePassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }

  // 3) Check if user account status is pending (specifically for NGOs)
  if (user.status === 'pending_approval') {
    return next(new AppError('Your NGO registration is pending approval by the Admin.', 403));
  }

  // 4) If everything is OK, send tokens to client
  await createSendTokens(user, 200, res);
});

export const refreshToken = catchAsync(async (req, res, next) => {
  const token = req.cookies.refreshToken || req.body.refreshToken;

  if (!token) {
    return next(new AppError('No refresh token provided.', 401));
  }

  // Verify token
  const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);

  // Check if user still exists
  const user = await User.findById(decoded.id);
  if (!user) {
    return next(new AppError('The user belonging to this token no longer exists.', 401));
  }

  if (user.status === 'suspended') {
    return next(new AppError('This account has been suspended.', 403));
  }

  // Generate new Access Token
  const accessToken = signToken(user._id, user.role, process.env.JWT_ACCESS_SECRET, process.env.JWT_ACCESS_EXPIRY);

  res.status(200).json({
    status: 'success',
    accessToken,
  });
});

export const logout = catchAsync(async (req, res, next) => {
  res.cookie('refreshToken', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.status(200).json({ status: 'success' });
});

export const verifyEmail = catchAsync(async (req, res, next) => {
  res.status(200).json({
    status: 'success',
    message: 'Email verified successfully! (Mocked)',
  });
});

export const resetPassword = catchAsync(async (req, res, next) => {
  res.status(200).json({
    status: 'success',
    message: 'Password reset link sent! (Mocked)',
  });
});
