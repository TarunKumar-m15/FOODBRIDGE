import PDFDocument from 'pdfkit';
import Donation from '../models/Donation.js';
import User from '../models/User.js';
import NGO from '../models/NGO.js';
import catchAsync from '../utils/catchAsync.js';
import AppError from '../utils/AppError.js';

// Helper to draw clean table grids in PDFKit
const drawTable = (doc, startX, startY, headers, rows, colWidths) => {
  let currentY = startY;
  doc.fontSize(10).fillColor('#333333');

  // Draw Header Row
  doc.font('Helvetica-Bold').fillColor('#FFFFFF');
  doc.rect(startX, currentY - 5, colWidths.reduce((a, b) => a + b, 0), 20).fill('#1E1B4B'); // Dark blue background
  doc.fillColor('#FFFFFF');

  let currentX = startX;
  headers.forEach((header, index) => {
    doc.text(header, currentX + 5, currentY, { width: colWidths[index] - 10, align: 'left' });
    currentX += colWidths[index];
  });
  currentY += 20;

  // Draw Rows
  doc.font('Helvetica').fillColor('#333333');
  rows.forEach((row, rowIndex) => {
    // Zebra striping
    if (rowIndex % 2 === 0) {
      doc.rect(startX, currentY - 5, colWidths.reduce((a, b) => a + b, 0), 20).fill('#F3F4F6');
    }
    doc.fillColor('#333333');

    currentX = startX;
    row.forEach((cell, cellIndex) => {
      doc.text(String(cell), currentX + 5, currentY, { width: colWidths[cellIndex] - 10, align: 'left' });
      currentX += colWidths[cellIndex];
    });
    currentY += 20;

    // Page overflow handling
    if (currentY > doc.page.height - 50) {
      doc.addPage();
      currentY = 50;
    }
  });

  return currentY;
};

// Generate General Impact Report PDF
export const getImpactReport = catchAsync(async (req, res, next) => {
  const doc = new PDFDocument({ margin: 50 });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename=foodbridge-impact-report.pdf');
  doc.pipe(res);

  // Styling palette
  const primaryColor = '#10B981'; // Emerald Green
  const darkNavy = '#0F172A'; // Slate 900
  const lightGrey = '#94A3B8';

  // Title & Header Section
  doc.rect(0, 0, doc.page.width, 140).fill(darkNavy);
  
  doc.fillColor(primaryColor).fontSize(28).font('Helvetica-Bold').text('FOODBRIDGE', 50, 40);
  doc.fillColor('#FFFFFF').fontSize(14).text('Zero Hunger Initiative - Global Impact Report', 50, 75);
  doc.fillColor(lightGrey).fontSize(10).text(`Generated: ${new Date().toLocaleDateString()}`, 50, 95);

  // Retrieve metrics
  const totalUsers = await User.countDocuments();
  const totalDonations = await Donation.countDocuments();
  const activeDonationsCount = await Donation.countDocuments({ status: 'pending' });
  const completedDonationsCount = await Donation.countDocuments({ status: 'delivered' });
  
  const allDonations = await Donation.find();
  let totalQuantityKg = 0;
  allDonations.forEach(d => {
    d.foodItems.forEach(item => {
      totalQuantityKg += item.quantity;
    });
  });

  // Display KPI Grid
  let y = 170;
  doc.fillColor(darkNavy).fontSize(18).font('Helvetica-Bold').text('System Key Performance Metrics', 50, y);
  y += 25;

  const kpis = [
    { label: 'Meals Saved (Kg)', value: totalQuantityKg.toFixed(1) },
    { label: 'Total Donations', value: String(totalDonations) },
    { label: 'Completed Transfers', value: String(completedDonationsCount) },
    { label: 'Active Listings', value: String(activeDonationsCount) },
    { label: 'Registered Members', value: String(totalUsers) }
  ];

  kpis.forEach((kpi) => {
    doc.rect(50, y, 512, 32).fill('#F8FAFC');
    doc.fillColor(darkNavy).fontSize(11).font('Helvetica-Bold').text(kpi.label, 65, y + 10);
    doc.fillColor(primaryColor).fontSize(13).font('Helvetica-Bold').text(kpi.value, 400, y + 9, { align: 'right', width: 150 });
    y += 38;
  });

  // Recent Listings Table
  y += 20;
  doc.fillColor(darkNavy).fontSize(18).font('Helvetica-Bold').text('Recent Food Salvages', 50, y);
  y += 25;

  const recentDonations = await Donation.find()
    .populate('donorId', 'name')
    .sort({ createdAt: -1 })
    .limit(10);

  const headers = ['Donor', 'Food Item(s)', 'Qty (Kg)', 'Status', 'Expiry'];
  const colWidths = [120, 160, 60, 80, 92];
  const rows = recentDonations.map(d => [
    d.donorId?.name || 'Anonymous',
    d.foodItems.map(i => i.name).join(', '),
    d.foodItems.reduce((acc, curr) => acc + curr.quantity, 0).toFixed(1),
    d.status.toUpperCase(),
    new Date(d.expiryTime).toLocaleDateString()
  ]);

  drawTable(doc, 50, y, headers, rows, colWidths);

  // Footer
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(i);
    doc.fillColor(lightGrey).fontSize(9).font('Helvetica')
      .text(`Page ${i + 1} of ${range.count} | FoodBridge Zero Hunger`, 50, doc.page.height - 40, { align: 'center' });
  }

  doc.end();
});

// Generate NGO Activity Report PDF
export const getNgoActivityReport = catchAsync(async (req, res, next) => {
  const ngoId = req.params.ngoId || req.user._id;

  // Retrieve NGO details
  const ngoUser = await User.findById(ngoId);
  if (!ngoUser || ngoUser.role !== 'ngo') {
    return next(new AppError('NGO not found.', 404));
  }

  const ngoProfile = await NGO.findOne({ userId: ngoId });

  const doc = new PDFDocument({ margin: 50 });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=ngo-${ngoUser.name.toLowerCase().replace(/\s+/g, '-')}-activity.pdf`);
  doc.pipe(res);

  const primaryColor = '#3B82F6'; // Blue Accent
  const darkNavy = '#1E1B4B';
  const lightGrey = '#64748B';

  // Header banner
  doc.rect(0, 0, doc.page.width, 140).fill(darkNavy);
  doc.fillColor(primaryColor).fontSize(26).font('Helvetica-Bold').text('NGO PERFORMANCE REPORT', 50, 40);
  doc.fillColor('#FFFFFF').fontSize(14).text(ngoUser.name, 50, 75);
  doc.fillColor(lightGrey).fontSize(10).text(`Registration Number: ${ngoProfile?.registrationNumber || 'N/A'}`, 50, 95);

  // NGO statistics
  const claimedDonations = await Donation.find({ assignedNgoId: ngoId }).populate('donorId', 'name').populate('assignedVolunteerId', 'name');
  const activeClaimed = claimedDonations.filter(d => ['accepted', 'picking_up', 'picked_up', 'delivering'].includes(d.status)).length;
  const completedClaimed = claimedDonations.filter(d => d.status === 'delivered').length;
  const totalClaimedQty = claimedDonations.reduce((total, d) => {
    return total + d.foodItems.reduce((acc, curr) => acc + curr.quantity, 0);
  }, 0);

  let y = 170;
  doc.fillColor(darkNavy).fontSize(18).font('Helvetica-Bold').text('Activity Summary', 50, y);
  y += 25;

  const stats = [
    { label: 'Total Claims Registered', value: String(claimedDonations.length) },
    { label: 'Completed Deliveries', value: String(completedClaimed) },
    { label: 'Ongoing Safe Transfers', value: String(activeClaimed) },
    { label: 'Total Meals Received (Kg)', value: totalClaimedQty.toFixed(1) }
  ];

  stats.forEach((stat) => {
    doc.rect(50, y, 512, 32).fill('#F0F9FF');
    doc.fillColor(darkNavy).fontSize(11).font('Helvetica-Bold').text(stat.label, 65, y + 10);
    doc.fillColor(primaryColor).fontSize(13).font('Helvetica-Bold').text(stat.value, 400, y + 9, { align: 'right', width: 150 });
    y += 38;
  });

  // NGO claims table
  y += 20;
  doc.fillColor(darkNavy).fontSize(18).font('Helvetica-Bold').text('Donation Claim Log', 50, y);
  y += 25;

  const headers = ['Donor', 'Food Items', 'Qty (Kg)', 'Status', 'Delivery Agent'];
  const colWidths = [120, 150, 60, 80, 102];
  const rows = claimedDonations.map(d => [
    d.donorId?.name || 'Anonymous',
    d.foodItems.map(i => i.name).join(', '),
    d.foodItems.reduce((acc, curr) => acc + curr.quantity, 0).toFixed(1),
    d.status.toUpperCase(),
    d.assignedVolunteerId?.name || 'Self-Pickup'
  ]);

  drawTable(doc, 50, y, headers, rows, colWidths);

  // Footer page numbers
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(i);
    doc.fillColor(lightGrey).fontSize(9).font('Helvetica')
      .text(`Page ${i + 1} of ${range.count} | FoodBridge Zero Hunger NGO Report`, 50, doc.page.height - 40, { align: 'center' });
  }

  doc.end();
});
