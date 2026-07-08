import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import config from './config/config.js';
import connectDB from './config/db.js';
import { checkAndAlertExpiringDonations } from './services/emailService.js';
import authRoutes from './routes/authRoutes.js';
import donationRoutes from './routes/donationRoutes.js';
import verifyRoutes from './routes/verifyRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import errorHandler from './middleware/errorHandler.js';
import AppError from './utils/AppError.js';

// Connect to MongoDB Database
connectDB();

const app = express();
const server = http.createServer(app);

// Initialize Socket.io for real-time notifications
const io = new Server(server, {
  cors: {
    origin: '*', // Allow connections from any origin for development
    methods: ['GET', 'POST', 'PATCH'],
  },
});

// Real-time communication namespace configurations
io.on('connection', (socket) => {
  console.log(`Socket client connected: ${socket.id}`);

  // Join role-specific rooms
  socket.on('join_room', (role) => {
    socket.join(role);
    console.log(`Socket client ${socket.id} joined room: ${role}`);
  });

  socket.on('disconnect', () => {
    console.log(`Socket client disconnected: ${socket.id}`);
  });
});

// Expose socket.io to request handlers
app.use((req, res, next) => {
  req.io = io;
  next();
});

// --- GLOBAL MIDDLEWARES ---

// 1. Security Headers
app.use(helmet());

// 2. Cross-Origin Resource Sharing
app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://foodbridge-steel.vercel.app"
  ],
  credentials: true,
}));

// 3. Rate Limiting (Prevent abuse, e.g., max 100 requests per 15 minutes)
const limiter = rateLimit({
  max: 200,
  windowMs: 15 * 60 * 1000,
  message: 'Too many requests from this IP, please try again in 15 minutes!'
});
app.use('/api', limiter);

// 4. Body parsers (Read JSON data into req.body, max 10kb size)
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// 5. Data Sanitization (Prevent NoSQL injection)
app.use(mongoSanitize());

// --- ROUTES ---
app.use('/api/auth', authRoutes);
app.use('/api/donations', donationRoutes);
app.use('/api/verify', verifyRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/reports', reportRoutes);

// Serve static assets in production
// Health check / Root route
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "FoodBridge Backend API is running 🚀",
  });
});

// Catch-all for undefined routes
app.all("*", (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Mount Global Error Handling Middleware
app.use(errorHandler);

// --- START SERVER ---
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server listening in ${process.env.NODE_ENV} mode on port ${PORT}`);
  
  // Run food safety expiry alert checks every hour
  setInterval(() => {
    checkAndAlertExpiringDonations().catch((err) => console.error(err.message));
  }, 60 * 60 * 1000);
});
