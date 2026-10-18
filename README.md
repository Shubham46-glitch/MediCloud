# MediCloud — Smart Healthcare Platform

A full-stack healthcare appointment management platform built with React 19, Node.js/Express, Amazon DynamoDB, Amazon Cognito, Amazon S3, and Brevo email.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS 4, React Router 7, Framer Motion |
| Backend | Node.js, Express 4, Zod, Winston |
| Database | Amazon DynamoDB (single-table design) |
| Auth | Amazon Cognito (+ mock adapter for local dev) |
| Storage | Amazon S3 (+ mock adapter for local dev) |
| Email | Brevo API (+ mock adapter for local dev) |
| Hosting target | EC2 manual runbook is documented; deployment is not verified |

---

## Project Structure

```text
MediCloud/
├── frontend/                     # React 19 + Vite + Tailwind CSS
│   ├── src/
│   │   ├── assets/              # Static assets and logos
│   │   ├── components/          # Reusable UI components
│   │   │   ├── common/          # Navbar, Sidebar, Button, Modal, Cards, etc.
│   │   │   └── booking/         # BookingModal, RescheduleModal
│   │   ├── context/             # AppContext — global state (auth, doctors, appointments)
│   │   ├── data/                # Legacy local data files; app state uses the API
│   │   ├── layouts/             # MainLayout, DashboardLayout
│   │   ├── pages/               # Landing, Doctors, Auth, Patient, Doctor, Admin pages
│   │   └── utils/               # Date/currency formatters
│   ├── .env.example             # ← Copy to .env for local development
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
├── backend/                      # Node.js + Express API
│   ├── src/
│   │   ├── adapters/            # Pluggable service adapters
│   │   │   ├── auth/            # mock-auth.adapter.js, cognito-auth.adapter.js
│   │   │   ├── email/           # mock-email.adapter.js, brevo-email.adapter.js
│   │   │   └── storage/         # mock-storage.adapter.js, s3-storage.adapter.js
│   │   ├── config/              # env.js, seed-data.js, dynamo-schema.md
│   │   ├── controllers/         # HTTP handlers (thin — delegate to services)
│   │   ├── middleware/          # auth.js, requestLogger.js, rateLimiter.js, errorHandler.js
│   │   ├── repository/          # mock.repository.js, dynamo.repository.js, index.js
│   │   ├── routes/              # health, auth, doctors, appointments, admin, documents
│   │   ├── services/            # Business logic layer
│   │   ├── utils/               # logger.js (Winston, JSON), responseFormatter.js
│   │   └── validators/          # env.validator.js (Zod schema)
│   ├── tests/                   # health.test.js, notFound.test.js, placeholders.test.js
│   ├── .env.example             # ← Copy to .env for local development
│   ├── server.js
│   └── package.json
│
├── .gitignore                    # Excludes .env files, node_modules, dist
└── README.md
```

---

## Local Development Setup

No AWS credentials required for local development. All AWS services have in-memory mock adapters that activate automatically when the default environment variables are used.

### Prerequisites

- **Node.js v18 or newer** (tested on v18–v25)
- **npm v9 or newer**

### 1. Clone and install dependencies

```bash
# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies
cd ../backend
npm install
```

### 2. Configure environment variables

**Backend:**
```bash
cd backend
cp .env.example .env
```

The default `.env` values work for local development without any changes — all providers default to `mock`.

**Frontend:**
```bash
cd frontend
cp .env.example .env
```

The default `VITE_API_URL=http://localhost:5000` is correct for local development.

### 3. Start the backend

```bash
cd backend
npm run dev
```

The API starts at **http://localhost:5000**

Health check: **http://localhost:5000/api/health**

You should see output like:
```
===============================================
 MediCloud Backend API Service
 Status: Running
 Environment: development
 Port: 5000
 URL: http://localhost:5000
 Health: http://localhost:5000/api/health
 Allowed Frontend: http://localhost:5173
===============================================
```

### 4. Start the frontend

Open a second terminal:

```bash
cd frontend
npm run dev
```

The app opens at **http://localhost:5173**

### 5. Run backend tests

```bash
cd backend
npm test
```

Tests use the mock adapters — no AWS credentials needed.

### 6. Run frontend lint

```bash
cd frontend
npm run lint
```

### 7. Build frontend for production

```bash
cd frontend
npm run build
```

Output goes to `frontend/dist/`.

---

## Frontend and API Integration

The React app calls the Express API for authentication, doctor listings,
appointments, profile changes, and patient documents. Access tokens are held in
tab-scoped `sessionStorage`; authorization roles come from the backend profile.
The frontend does not persist application records in browser storage. Local
mock mode simulates document uploads and email delivery; it does not store real
files or send messages.

## Development Mode — How It Works

The backend has four provider flags, all defaulting to `mock`. Set them in your `.env` to switch to real AWS services when ready:

| Environment Variable | Default | Options | Description |
|---|---|---|---|
| `DB_PROVIDER` | `mock` | `mock`, `dynamodb` | In-memory MockRepository vs. real DynamoDB |
| `AUTH_PROVIDER` | `mock` | `mock`, `cognito` | HMAC-signed dev tokens vs. real Cognito JWTs |
| `EMAIL_PROVIDER` | `mock` | `mock`, `brevo` | Log-only emails vs. real Brevo delivery |
| `STORAGE_PROVIDER` | `mock` | `mock`, `s3` | Fake presigned URLs vs. real S3 |

**When all four are `mock`:** The backend uses in-memory repository, auth,
storage, and email adapters. It seeds doctor/specialty/appointment records
from `backend/src/config/seed-data.js`. Data resets when the server restarts.

**Switching to real AWS:** Configure all production providers and required values, migrate the database indexes/data, and review the manual AWS guide first. Production mode rejects mock providers. See [the manual AWS and EC2 runbook](docs/manual-aws-and-ec2.md); no resources are provisioned by application startup.

---

## Mock Seed Data

Seed profiles help populate local doctor and appointment listings. Seed users do
not have passwords, and public registration creates patient accounts. To test
authenticated flows, register through the UI or API. Assign doctor/admin roles
only through a trusted backend process; the frontend obtains the role from the
authenticated backend profile.

To register and get a token via the API:
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"YourPass123!","name":"Your Name"}'
```

---

## API Overview

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/health` | None | Service health check |
| `POST` | `/api/auth/register` | None | Register a new patient |
| `POST` | `/api/auth/login` | None | Login, receive token |
| `GET` | `/api/auth/me` | Bearer | Get current user profile |
| `PUT` | `/api/auth/me` | Bearer | Update profile |
| `POST` | `/api/auth/logout` | Bearer | Sign out (revokes Cognito session in Cognito mode) |
| `GET` | `/api/doctors` | None | List doctors (filterable) |
| `GET` | `/api/doctors/specialties` | None | List specialties |
| `GET` | `/api/doctors/:id` | None | Get doctor by ID |
| `POST` | `/api/doctors` | Admin | Create doctor profile |
| `PUT` | `/api/doctors/:id` | Admin | Update doctor profile |
| `PATCH` | `/api/doctors/:id/status` | Admin | Toggle active/inactive |
| `PUT` | `/api/doctors/:id/slots` | Doctor/Admin | Update availability slots |
| `POST` | `/api/appointments` | Patient | Book appointment |
| `GET` | `/api/appointments/me` | Patient | Own appointments |
| `GET` | `/api/appointments/doctor/:id` | Doctor/Admin | Doctor's appointments |
| `PATCH` | `/api/appointments/:id/cancel` | Any auth | Cancel appointment |
| `PATCH` | `/api/appointments/:id/reschedule` | Any auth | Reschedule appointment |
| `PATCH` | `/api/appointments/:id/status` | Doctor/Admin | Update status |
| `GET` | `/api/admin/stats` | Admin | Platform statistics |
| `GET` | `/api/admin/appointments` | Admin | All appointments |
| `GET` | `/api/documents` | Bearer | List own documents |
| `POST` | `/api/documents/upload-url` | Bearer | Request S3 upload URL |
| `POST` | `/api/documents/confirm-upload` | Bearer | Save document metadata |
| `GET` | `/api/documents/:id/download-url` | Bearer | Get S3 download URL |
| `DELETE` | `/api/documents/:id` | Bearer | Delete document |

---

## Features

**Patient Portal**
- Browse doctors by specialty and location
- Book appointments with duplicate-slot prevention
- Reschedule and cancel visits
- View appointment history

**Doctor Portal**
- View today's clinic queue and upcoming consultations
- Accept, decline, and mark consultations complete
- Manage weekly availability and time slots

**Admin Control Center**
- Platform-wide appointment auditing and status overrides
- Doctor credential management (activate/deactivate)
- Specialty department management
- System statistics dashboard

---

## DynamoDB Schema (Single-Table Design)

See `backend/src/config/dynamo-schema.md` for the single-table design including:
- Partition key / sort key conventions for each entity
- GSI (Global Secondary Index) definitions
- Paginated access patterns
- Transactional slot reservations for double-booking prevention

---

## AWS Services Required (When Activating)

> These services should only be configured when explicitly ready to move beyond local development. No resources should be provisioned without approval.

| Service | Purpose | Estimated Cost |
|---|---|---|
| Amazon DynamoDB | Application database | Check current regional pricing |
| Amazon Cognito | User auth & JWT tokens | Check current plan/pricing |
| Amazon S3 | Medical document storage | Usage and transfer charges may apply |
| Amazon EC2 | Backend hosting | Instance and storage pricing varies |
| Amazon CloudWatch | Logs & monitoring | Ingestion and retention charges may apply |
| Brevo | Transactional emails | Check current plan/pricing |

> **Note:** AWS free-tier eligibility depends on your account age and prior usage. Always verify current pricing at [aws.amazon.com/pricing](https://aws.amazon.com/pricing) before activating services.

---

## Deployment (Manual — No CI/CD)

Deployment is not performed as part of this change. When deployment is
approved, follow [the manual AWS and EC2 runbook](docs/manual-aws-and-ec2.md).

The application currently has no tested live deployment target. AWS resources,
EC2 state, DNS, TLS, and email delivery have not been verified.

---

## Security Notes

- All `.env` files are excluded from Git via `.gitignore`
- Never put real AWS credentials, API keys, or passwords in source code
- The mock auth adapter is clearly labelled development-only and never used in production
- Public registration always assigns the `patient` role — `doctor` and `admin` roles require a trusted admin process
- All backend routes enforce authentication and role-based authorization
- Appointment ownership, doctor availability, and slot conflicts are validated server-side
- Medical documents are stored as private S3 objects, accessed only via short-lived presigned URLs
