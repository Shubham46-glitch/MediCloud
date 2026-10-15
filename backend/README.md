# MediCloud Backend Service

The Node.js & Express.js backend API service for the MediCloud healthcare appointment management platform.

---

## 🚀 Technology Stack

- **Runtime:** Node.js (v18+ / v25+ ES Modules)
- **Framework:** Express.js (v4.21+)
- **Security:** Helmet (HTTP security headers) & CORS (configurable frontend origin)
- **Rate Limiting:** express-rate-limit (15-min sliding window)
- **Configuration & Validation:** dotenv & Zod schema validation
- **Dev Tooling:** Nodemon (auto-reload)
- **Testing:** Native Node test runner (`node:test`, `node:assert/strict`) & Supertest

---

## 📁 Directory Structure

```text
backend/
├── src/
│   ├── config/
│   │   └── env.js                 # Environment variable validation & loader
│   ├── controllers/
│   │   ├── admin.controller.js        # Admin placeholder handler
│   │   ├── appointments.controller.js # Appointments placeholder handler
│   │   ├── auth.controller.js         # Authentication placeholder handler
│   │   ├── doctors.controller.js      # Doctors placeholder handler
│   │   └── health.controller.js       # Health telemetry handler
│   ├── middleware/
│   │   ├── errorHandler.js        # Centralized error handler (hides stack in prod)
│   │   ├── notFoundHandler.js     # Standardized JSON 404 handler
│   │   └── rateLimiter.js         # API rate limiter (100 req / 15 min)
│   ├── routes/
│   │   ├── admin.routes.js
│   │   ├── appointments.routes.js
│   │   ├── auth.routes.js
│   │   ├── doctors.routes.js
│   │   ├── health.routes.js
│   │   └── index.js               # Main API router aggregator
│   ├── services/
│   │   └── health.service.js      # Health status and uptime service
│   ├── utils/
│   │   └── responseFormatter.js   # Consistent JSON response utilities
│   ├── validators/
│   │   └── env.validator.js       # Zod schema for environment variables
│   └── app.js                     # Express app configuration & middleware
├── tests/
│   ├── health.test.js             # Automated tests for /api/health
│   ├── notFound.test.js           # Automated tests for 404 handler
│   └── placeholders.test.js       # Automated tests for Phase 2 placeholders
├── server.js                      # HTTP server listener & graceful shutdown
├── package.json                   # Dependencies and scripts
├── .env.example                   # Safe environment template
├── .env                           # Local environment config
├── .gitignore                     # Git ignore rules for backend
└── README.md                      # Backend documentation
```

---

## ⚙️ Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

| Variable | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `PORT` | Number | `5000` | Port for the Express HTTP server |
| `NODE_ENV` | String | `development` | Environment mode (`development`, `production`, `test`) |
| `FRONTEND_URL` | String (URL) | `http://localhost:5173` | Allowed frontend origin for CORS |

---

## 📦 Setup & Running

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Run in Development Mode (with hot-reload)
```bash
npm run dev
```

### 3. Run in Production Mode
```bash
npm start
```

### 4. Run Automated Tests
```bash
npm test
```

---

## 📡 API Endpoints & Examples

### Health Check Endpoint
- **Method:** `GET`
- **Route:** `/api/health`
- **Description:** Verifies service health, system uptime, and environment.

**Example Request:**
```bash
curl -X GET http://localhost:5000/api/health
```

**Example Response (200 OK):**
```json
{
  "success": true,
  "service": "MediCloud Healthcare API",
  "status": "ok",
  "timestamp": "2026-10-15T12:00:00.000Z",
  "uptimeSeconds": 42,
  "environment": "development",
  "version": "1.0.0"
}
```

---

### Placeholder Route Modules (Deferred to Phase 2)

All placeholder modules return HTTP `501 Not Implemented` with clear messaging:

| Endpoint | Method | Status | Notes |
| :--- | :--- | :--- | :--- |
| `/api/auth` | ALL | `501 Not Implemented` | User registration, login, JWT auth |
| `/api/doctors` | ALL | `501 Not Implemented` | Doctor roster, availability, profiles |
| `/api/appointments` | ALL | `501 Not Implemented` | Slot reservation, reschedule, cancel |
| `/api/admin` | ALL | `501 Not Implemented` | Hospital management, audit logs |

**Example Request:**
```bash
curl -X GET http://localhost:5000/api/auth
```

**Example Response (501 Not Implemented):**
```json
{
  "success": false,
  "status": 501,
  "module": "Authentication",
  "message": "Authentication endpoints are not implemented yet. Scheduled for Phase 2.",
  "details": "User registration, login, JWT token generation, and password hashing will be implemented in Phase 2.",
  "phase": "Phase 2"
}
```

---

### Consistent 404 Response

**Example Request:**
```bash
curl -X GET http://localhost:5000/api/unknown-route
```

**Example Response (404 Not Found):**
```json
{
  "success": false,
  "status": 404,
  "error": {
    "code": "ROUTE_NOT_FOUND",
    "message": "Cannot GET /api/unknown-route - Route not found on this server"
  }
}
```

---

## 🔒 Security Architecture

1. **Helmet:** Automatically configures critical HTTP security headers (X-Content-Type-Options, X-Frame-Options, HSTS, etc.).
2. **CORS:** Restricts origins strictly to the configured `FRONTEND_URL` while allowing local tools and mobile clients without origins.
3. **Rate Limiting:** Prevents brute force and denial of service attacks by restricting incoming requests to 100 per 15 minutes per IP.
4. **Environment Validation:** Uses Zod to validate all configuration on startup before starting the server.
5. **Centralized Error Handling:** Strips sensitive stack traces from API responses when `NODE_ENV=production`.
