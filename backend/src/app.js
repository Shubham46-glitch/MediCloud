import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import { apiRateLimiter } from './middleware/rateLimiter.js';
import { requestLogger } from './middleware/requestLogger.js';
import { notFoundHandler } from './middleware/notFoundHandler.js';
import { errorHandler } from './middleware/errorHandler.js';
import apiRoutes from './routes/index.js';

const app = express();

// 1. Helmet security headers
app.use(helmet());

// 2. CORS configuration using environment variable
// FRONTEND_ORIGIN takes priority but FRONTEND_URL is kept for backward compatibility
const frontendOrigin = env.FRONTEND_ORIGIN || env.FRONTEND_URL;
const allowedOrigins = [frontendOrigin];
if (env.NODE_ENV !== 'production') {
  allowedOrigins.push('http://localhost:5173', 'http://127.0.0.1:5173');
}

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. curl, mobile apps, unit/integration tests)
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS error: Origin ${origin} not allowed`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// 3. JSON and URL-encoded body parsing
// Increased limit to accommodate file metadata; actual files go to S3 via presigned URLs
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// 4. Request logger (correlation IDs + structured logging)
app.use(requestLogger);

// 5. Rate limiter applied to all /api routes
app.use('/api', apiRateLimiter);

// 6. API Routes
app.use('/api', apiRoutes);

// Root informational endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    service: 'MediCloud Healthcare API',
    status: 'online',
    version: '2.0.0',
    healthCheck: '/api/health',
  });
});

// 7. JSON 404 Handler for undefined routes
app.use(notFoundHandler);

// 8. Centralized Error Handler
app.use(errorHandler);

export default app;
