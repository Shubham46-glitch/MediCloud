# MediCloud — Healthcare Appointment Management Platform

A professional healthcare appointment management platform built with React, Vite, Tailwind CSS, React Router, Lucide React, and Framer Motion.

## Project Structure

```text
MediCloud/
├── frontend/                     # React.js Frontend Application (Vite + Tailwind CSS)
│   ├── src/
│   │   ├── assets/              # Static media assets & logos
│   │   ├── components/          # Modular & reusable UI components
│   │   │   ├── common/          # Navbar, Sidebar, Footer, Button, Input, Modal, Cards
│   │   │   └── booking/         # BookingModal, RescheduleModal
│   │   ├── context/             # AppContext (Auth, Appointments, Doctors state)
│   │   ├── data/                # Sample data (Doctors, Appointments, Specialties, Users)
│   │   ├── layouts/             # MainLayout, DashboardLayout
│   │   ├── pages/               # Landing, Doctors, Auth, Patient, Doctor, Admin pages
│   │   └── utils/               # Timezone-safe formatters, helpers
│   ├── public/                  # Public assets & favicons
│   ├── index.html               # Main HTML entry with Plus Jakarta Sans typography
│   ├── package.json             # Frontend dependencies & npm scripts
│   └── vite.config.js           # Vite bundler configuration with @tailwindcss/vite
├── backend/                      # Node.js & Express API Backend
│   ├── src/
│   │   ├── config/              # Environment config & Zod validation
│   │   ├── controllers/         # Health & Phase 2 placeholder controllers
│   │   ├── middleware/          # Helmet, CORS, RateLimiter, Error & 404 handlers
│   │   ├── routes/              # Health, Auth, Doctors, Appointments, Admin routes
│   │   ├── services/            # Health status service
│   │   ├── utils/               # JSON response formatters
│   │   └── app.js               # Express app configuration
│   ├── tests/                   # Automated tests (health, 404, placeholders)
│   ├── server.js                # Server entry point & graceful shutdown
│   ├── package.json             # Backend dependencies & npm scripts
│   ├── .env.example             # Safe environment variable template
│   └── README.md                # Comprehensive backend documentation
└── README.md                    # Root project documentation
```

## Getting Started

### 1. Prerequisites
- Node.js (v18+ recommended, v25 supported)
- npm (v9+ recommended)

### 2. Running the Frontend
Navigate to the `frontend/` directory and start the Vite development server:

```bash
cd frontend
npm install
npm run dev
```

Open your browser at **`http://localhost:5173`** to access the platform.

### 3. Running the Backend
Navigate to the `backend/` directory and start the Express API server:

```bash
cd backend
npm install
npm run dev
```

The API server runs at **`http://localhost:5000`** (Health check: `http://localhost:5000/api/health`).

### 4. Running Backend Tests
```bash
cd backend
npm test
```

### 5. Building the Frontend for Production
```bash
cd frontend
npm run build
```

## Features & Roles

- **Patient Portal:** Browse certified specialists, filter by discipline, choose available time slots, book appointments (with duplicate booking prevention), reschedule, and cancel visits.
- **Doctor Portal:** Manage today's clinic appointments, review upcoming requests, accept or decline visits, mark completed, and customize weekly consultation hours and time slots.
- **Admin Control Center:** Hospital system telemetry, clinician credential management (activate / deactivate doctor profiles), specialty departments, and platform-wide appointment auditing.
- **Interactive Role Switcher:** Instant 1-click switching between Patient, Doctor, and Admin views in the top navigation bar and sidebar.
