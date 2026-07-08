import Donation from '../models/Donation.js';
import Pickup from '../models/Pickup.js';
import Delivery from '../models/Delivery.js';
import AppError from '../utils/AppError.js';
import catchAsync from '../utils/catchAsync.js';
import { verifyQRCodeSecret } from '../services/qrService.js';
import User from '../models/User.js';
import { sendDeliveryUpdateAlert } from '../services/emailService.js';

export const scanPickup = catchAsync(async (req, res, next) => {
  const { donationId, qrCodeSecret } = req.body;

  // 1) Find the donation
  const donation = await Donation.findById(donationId);
  if (!donation) {
    return next(new AppError('No donation found with that ID', 404));
  }

  // 2) Access control check
  if (donation.assignedVolunteerId?.toString() !== req.user._id.toString()) {
    return next(new AppError('You are not the volunteer assigned to this pickup.', 403));
  }

  // 3) Prevent duplicate scans
  if (donation.status === 'picked_up' || donation.status === 'delivering' || donation.status === 'delivered') {
    return next(new AppError('This donation has already been picked up.', 400));
  }

  // 4) Validate Secret
  if (!verifyQRCodeSecret(qrCodeSecret, donation.qrCodeSecret)) {
    return next(new AppError('Invalid QR Code secret. Verification failed.', 400));
  }

  // 5) Update Status
  donation.status = 'picked_up';
  await donation.save();

  // Dispatch background update notifications to Donor and NGO
  User.findById(donation.donorId)
    .then((donor) => {
      if (donor) {
        sendDeliveryUpdateAlert(donor.email, donation, 'picked_up', req.user.name).catch(err => console.error(err.message));
      }
    })
    .catch((err) => console.error(err.message));

  if (donation.assignedNgoId) {
    User.findById(donation.assignedNgoId)
      .then((ngo) => {
        if (ngo) {
          sendDeliveryUpdateAlert(ngo.email, donation, 'picked_up', req.user.name).catch(err => console.error(err.message));
        }
      })
      .catch((err) => console.error(err.message));
  }

  // 6) Create or update Pickup log
  await Pickup.findOneAndUpdate(
    { donationId },
    {
      volunteerId: req.user._id,
      ngoId: donation.assignedNgoId,
      pickupVerifiedAt: new Date(),
      status: 'verified',
    },
    { upsert: true, new: true }
  );

  // Broadcast status change via Socket.io
  req.io.emit('donation_status_changed', { donationId: donation._id, status: 'picked_up', donation });

  res.status(200).json({
    status: 'success',
    message: 'Pickup verified successfully! Food is now in transit.',
    data: { donation },
  });
});

export const scanDelivery = catchAsync(async (req, res, next) => {
  const { donationId, qrCodeSecret } = req.body;

  // 1) Find the donation
  const donation = await Donation.findById(donationId);
  if (!donation) {
    return next(new AppError('No donation found with that ID', 404));
  }

  // 2) Access control check (only the assigned NGO can confirm delivery, or the volunteer)
  // Let's verify that the NGO is the recipient of the donation
  if (donation.assignedNgoId?.toString() !== req.user._id.toString() && donation.assignedVolunteerId?.toString() !== req.user._id.toString()) {
    return next(new AppError('You are not authorized to verify this delivery.', 403));
  }

  // 3) Prevent duplicate scans
  if (donation.status === 'delivered') {
    return next(new AppError('This donation has already been delivered.', 400));
  }

  // 4) Validate Secret
  if (!verifyQRCodeSecret(qrCodeSecret, donation.qrCodeSecret)) {
    return next(new AppError('Invalid QR Code secret. Verification failed.', 400));
  }

  // 5) Update Status
  donation.status = 'delivered';
  await donation.save();

  // Dispatch background update notifications to Donor and NGO
  User.findById(donation.donorId)
    .then((donor) => {
      if (donor) {
        sendDeliveryUpdateAlert(donor.email, donation, 'delivered', req.user.name).catch(err => console.error(err.message));
      }
    })
    .catch((err) => console.error(err.message));

  if (donation.assignedNgoId) {
    User.findById(donation.assignedNgoId)
      .then((ngo) => {
        if (ngo) {
          sendDeliveryUpdateAlert(ngo.email, donation, 'delivered', req.user.name).catch(err => console.error(err.message));
        }
      })
      .catch((err) => console.error(err.message));
  }

  // 6) Create or update Delivery log
  await Delivery.findOneAndUpdate(
    { donationId },
    {
      volunteerId: donation.assignedVolunteerId,
      ngoId: donation.assignedNgoId || req.user._id,
      deliveryVerifiedAt: new Date(),
      status: 'verified',
    },
    { upsert: true, new: true }
  );

  // Broadcast status change via Socket.io
  req.io.emit('donation_status_changed', { donationId: donation._id, status: 'delivered', donation });

  res.status(200).json({
    status: 'success',
    message: 'Delivery verified successfully! Food redistribution completed.',
    data: { donation },
  });
});
