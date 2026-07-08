import nodemailer from 'nodemailer';
import config from '../config/config.js';
import Donation from '../models/Donation.js';
import User from '../models/User.js';

let transporter;

// Create transporter
if (config.email.user && config.email.pass) {
  transporter = nodemailer.createTransport({
    host: config.email.host,
    port: config.email.port,
    secure: config.email.port === 465,
    auth: {
      user: config.email.user,
      pass: config.email.pass
    }
  });
  console.log('✉ [Email Service] SMTP Transporter initialized successfully.');
} else {
  console.warn('✉ [Email Service] SMTP credentials not set. Running in mock console logging mode.');
}

/**
 * Helper to send mail with fallbacks
 */
const sendMailHelper = async (mailOptions) => {
  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from: config.email.from,
        ...mailOptions
      });
      console.log(`✉ [Email Service] Email sent successfully to ${mailOptions.to}. MessageID: ${info.messageId}`);
      return info;
    } catch (error) {
      console.error(`❌ [Email Service] Failed to send email to ${mailOptions.to}:`, error.message);
    }
  } else {
    console.log('\n---------------- MOCK TRANSACTIONAL EMAIL ----------------');
    console.log(`FROM:    ${config.email.from}`);
    console.log(`TO:      ${mailOptions.to}`);
    console.log(`SUBJECT: ${mailOptions.subject}`);
    console.log('CONTENT:');
    console.log(mailOptions.html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim());
    console.log('----------------------------------------------------------\n');
    return { messageId: `mock_id_${Date.now()}` };
  }
};

/**
 * Send alert to NGOs and volunteers about new nearby donation listing
 */
export const sendNewDonationAlert = async (recipientEmail, donation) => {
  const itemsList = donation.foodItems.map(item => `<li>${item.quantity} ${item.unit} of ${item.name}</li>`).join('');
  
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #0c0f17; color: #f3f4f6; border-radius: 10px;">
      <h2 style="color: #ff007f; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px;">🍲 New Surplus Food Listing Alert!</h2>
      <p>Hello,</p>
      <p>A new food donation has just been listed near your location and needs to be reclaimed:</p>
      <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px; border-left: 4px solid #00f0ff; margin: 15px 0;">
        <h3 style="margin-top: 0; color: #ffffff;">Donation Details</h3>
        <ul>
          ${itemsList}
        </ul>
        <p><strong>Storage Method:</strong> ${donation.storageMethod}</p>
        <p><strong>AI Predicted Shelf-life:</strong> ${donation.aiPredictedShelfLifeDays || 2} Days</p>
        <p><strong>Pickup Location:</strong> ${donation.pickupLocation.address}</p>
      </div>
      <p>Please log in to your dashboard to claim this listing and assign transport coordinates.</p>
      <p style="margin-top: 25px; font-size: 11px; color: #6b7280;">Zero Hunger Platform Notification Service</p>
    </div>
  `;

  return sendMailHelper({
    to: recipientEmail,
    subject: `[Zero Hunger] Alert: New Surplus Food Listed Near You!`,
    html
  });
};

/**
 * Send alert to donor that their listing was accepted by an NGO
 */
export const sendDonationClaimedAlert = async (recipientEmail, donation, ngoName) => {
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #0c0f17; color: #f3f4f6; border-radius: 10px;">
      <h2 style="color: #39ff14; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px;">🎉 Your Donation Has Been Claimed!</h2>
      <p>Hello,</p>
      <p>Great news! Your listed surplus food has been accepted and claimed by <strong>${ngoName}</strong>.</p>
      <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px; border-left: 4px solid #39ff14; margin: 15px 0;">
        <p><strong>NGO Receiver:</strong> ${ngoName}</p>
        <p><strong>Listing Address:</strong> ${donation.pickupLocation.address}</p>
        <p>A volunteer will be dispatched shortly to pick up the donation. Please keep your QR handoff code ready.</p>
      </div>
      <p>Thank you for contributing to the Zero Hunger network!</p>
      <p style="margin-top: 25px; font-size: 11px; color: #6b7280;">Zero Hunger Platform Notification Service</p>
    </div>
  `;

  return sendMailHelper({
    to: recipientEmail,
    subject: `[Zero Hunger] Your Food Donation Has Been Claimed!`,
    html
  });
};

/**
 * Send alert about delivery tracking status updates
 */
export const sendDeliveryUpdateAlert = async (recipientEmail, donation, status, volunteerName) => {
  const statusLabels = {
    'picking_up': 'Volunteer Dispatched for Pickup',
    'picked_up': 'Food Picked Up & In Transit',
    'delivered': 'Food Successfully Delivered!'
  };

  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #0c0f17; color: #f3f4f6; border-radius: 10px;">
      <h2 style="color: #00f0ff; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px;">🚚 Transit Status Update</h2>
      <p>Hello,</p>
      <p>The status of your donation has been updated by the volunteer transporter <strong>${volunteerName}</strong>:</p>
      <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px; border-left: 4px solid #00f0ff; margin: 15px 0;">
        <p style="font-size: 16px; font-weight: bold; color: #ffffff;">Status: ${statusLabels[status] || status}</p>
        <p><strong>Transporter:</strong> ${volunteerName}</p>
        <p><strong>Address:</strong> ${donation.pickupLocation.address}</p>
      </div>
      <p style="margin-top: 25px; font-size: 11px; color: #6b7280;">Zero Hunger Platform Notification Service</p>
    </div>
  `;

  return sendMailHelper({
    to: recipientEmail,
    subject: `[Zero Hunger] Delivery Update: ${statusLabels[status] || status}`,
    html
  });
};

/**
 * Automatically scan database for donations expiring within 24 hours and notify active NGOs
 */
export const checkAndAlertExpiringDonations = async () => {
  try {
    const now = new Date();
    const targetTime = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

    const expiringDonations = await Donation.find({
      status: { $in: ['pending', 'accepted'] },
      expiryTime: { $gt: now, $lt: targetTime }
    });

    if (expiringDonations.length === 0) return;

    console.log(`✉ [Email Service] Found ${expiringDonations.length} donations expiring within 24 hours. Dispatching warnings...`);

    const ngos = await User.find({ role: 'ngo', status: 'active' });
    if (ngos.length === 0) return;

    for (const donation of expiringDonations) {
      const itemsList = donation.foodItems.map(item => `${item.quantity} ${item.unit} ${item.name}`).join(', ');
      
      const html = `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #0c0f17; color: #f3f4f6; border-radius: 10px;">
          <h2 style="color: #eab308; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px;">⚠️ Food Expiring Soon Warning!</h2>
          <p>Hello,</p>
          <p>This is a safety warning that a surplus food donation listed in the network is expiring in less than 24 hours and needs urgent recovery:</p>
          <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px; border-left: 4px solid #eab308; margin: 15px 0;">
            <p><strong>Food Items:</strong> ${itemsList}</p>
            <p><strong>Expiry Time:</strong> ${new Date(donation.expiryTime).toLocaleString()}</p>
            <p><strong>Storage Method:</strong> ${donation.storageMethod}</p>
            <p><strong>Pickup Location:</strong> ${donation.pickupLocation.address}</p>
          </div>
          <p>Please claim and collect this food immediately if you have capacity.</p>
          <p style="margin-top: 25px; font-size: 11px; color: #6b7280;">Zero Hunger Platform Notification Service</p>
        </div>
      `;

      for (const ngo of ngos) {
        await sendMailHelper({
          to: ngo.email,
          subject: `⚠️ [Zero Hunger] CRITICAL Alert: Food Expiring Soon! (${itemsList})`,
          html
        }).catch(err => console.error(err.message));
      }
    }
  } catch (error) {
    console.error('❌ [Email Service] Expiry check error:', error.message);
  }
};
