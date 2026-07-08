# FoodBridge: Zero Hunger Platform

FoodBridge is a real-time, QR-secured logistics platform bridging the gap between surplus food donors, local NGOs, and transit volunteers. It incorporates AI shelf-life predictions, location-based proximity mapping, double-factor QR code handshakes, and automated PDF activity reports to eliminate food waste and support communities.

---

## Key Features

- **Circular Proximity Matrix**: Displays and matches active surplus donations based on geolocation proximity coordinates between Donors and NGOs.
- **AI-Powered Shelf Life Telemetry**: Computes estimated shelf life on-the-fly inside the listing console using a Python-trained Random Forest model, analyzing packaging, storage temp, humidity, category, and age.
- **Dynamic Delivery Route Maps**: Renders electric-neon Leaflet routing tracks directly on the volunteer's mobile view mapping from pickup Point A (Donor) to delivery Point B (NGO).
- **Double QR Handoff Handovers**: Validates pickups and drop-offs using automated unique QR code generation, keeping deliveries transparent and fraud-safe.
- **PDF Impact & Activity Logs**: Downloads clean PDF activity ledgers and system-wide reports detailing food redirection statistics.

---

## Technology Stack

- **Frontend**: React (Vite, Tailwind CSS, Lucide icons, Leaflet Maps)
- **Backend API**: Node.js (Express.js, Mongoose, Socket.io, PDFKit, Nodemailer)
- **AI Service**: Python (Flask, Scikit-Learn, Joblib)
- **Database**: MongoDB (Atlas cloud hosting recommended)
- **Cloud Assets**: Cloudinary (Image management)

---

## Directory Structure

```text
FoodBridge/
  ├── client/          # Vite + React Frontend Application
  ├── server/          # Express API server & Socket.io WebSocket service
  └── ml-service/      # Python Flask AI shelf-life estimator
```

---

## Getting Started

### Prerequisites
Make sure you have the following installed on your machine:
- **Node.js** (v18.0.0 or higher)
- **NPM** (v9.0.0 or higher)
- **Python** (v3.10 or higher, with `pip`)
- **MongoDB** (local or Atlas)

### 1. Install Dependencies
Run the install command at the root of the project to install server, client, and developer packages concurrently:
```bash
npm run install-all
```

### 2. Configure Environment Variables
Create a `.env` file in the `/server` directory using `/server/.env.example` as a template:
```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_ACCESS_SECRET=your_jwt_access_secret_key
JWT_REFRESH_SECRET=your_jwt_refresh_secret_key
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

### 3. Seed Initial Administrative Users
Seed the database with default admin accounts:
```bash
npm run seed-admin
```
*Creates initial users:*
- **Super Admin**: `superadmin@zerohunger.com` (Password: `superadminpassword123`)
- **System Admin**: `admin@zerohunger.com` (Password: `adminpassword123`)

### 4. Run Development Servers
Start the client, backend API server, and Python Flask ML service concurrently:
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Running Unit Tests

Run the backend unit test suite:
```bash
cd server
npm run test
```

---

## Docker Compose Setup

Run the entire multi-container application locally:
```bash
docker-compose up --build
```
- **Frontend**: [http://localhost](http://localhost)
- **Backend API**: [http://localhost:5000](http://localhost:5000)
- **Flask AI Service**: [http://localhost:8000](http://localhost:8000)

---

## Deployment
For detailed instructions on deploying the frontend, backend, and database to live cloud servers, refer directly to the [deployment_guide.md](file:///C:/Users/Tharun/.gemini/antigravity/brain/6d18ee3a-8204-4678-99a7-4c8a7536b0e6/deployment_guide.md) in the artifacts.
