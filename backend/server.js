import app from './src/app.js';
import { env } from './src/config/env.js';

const PORT = env.PORT || 5000;

let server;

try {
  server = app.listen(PORT, () => {
    console.log(`===============================================`);
    console.log(` MediCloud Backend API Service`);
    console.log(` Status: Running`);
    console.log(` Environment: ${env.NODE_ENV}`);
    console.log(` Port: ${PORT}`);
    console.log(` URL: http://localhost:${PORT}`);
    console.log(` Health: http://localhost:${PORT}/api/health`);
    console.log(` Allowed Frontend: ${env.FRONTEND_URL}`);
    console.log(`===============================================`);
  });

  server.on('error', (error) => {
    if (error.syscall !== 'listen') {
      throw error;
    }

    if (error.code === 'EADDRINUSE') {
      console.error(`[Fatal Startup Error] Port ${PORT} is already in use.`);
    } else {
      console.error(`[Fatal Startup Error] ${error.message}`);
    }
    process.exit(1);
  });
} catch (startupError) {
  console.error(`[Fatal Startup Error] Failed to initialize server:`, startupError);
  process.exit(1);
}

// Graceful shutdown handling
const shutdown = (signal) => {
  console.log(`\nReceived ${signal}. Gracefully shutting down MediCloud backend...`);
  if (server) {
    server.close(() => {
      console.log('HTTP server closed. Exiting process.');
      process.exit(0);
    });

    // Force exit after 5 seconds if connections linger
    setTimeout(() => {
      console.error('Could not close connections in time, forcefully shutting down.');
      process.exit(1);
    }, 5000);
  } else {
    process.exit(0);
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  console.error('[Unhandled Rejection]', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[Uncaught Exception]', err);
  process.exit(1);
});
