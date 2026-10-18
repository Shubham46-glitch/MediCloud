import app from './src/app.js';
import { env } from './src/config/env.js';
import logger from './src/utils/logger.js';

const PORT = env.PORT || 5000;

let server;

try {
  server = app.listen(PORT, () => {
    logger.info('MediCloud API started', { environment: env.NODE_ENV, port: PORT });
  });

  server.on('error', (error) => {
    if (error.syscall !== 'listen') {
      throw error;
    }

    if (error.code === 'EADDRINUSE') {
      logger.error('MediCloud API could not bind to port', { port: PORT, errorType: 'EADDRINUSE' });
    } else {
      logger.error('MediCloud API listener failed', { errorType: error.name || 'UnknownError' });
    }
    process.exit(1);
  });
} catch (startupError) {
  logger.error('MediCloud API startup failed', { errorType: startupError.name || 'UnknownError' });
  process.exit(1);
}

// Graceful shutdown handling
const shutdown = (signal, exitCode = 0) => {
  logger.info('MediCloud API shutdown requested', { signal });
  if (server) {
    server.close(() => {
      logger.info('MediCloud API stopped');
      process.exit(exitCode);
    });

    // Force exit after 5 seconds if connections linger
    setTimeout(() => {
      logger.error('MediCloud API shutdown timed out');
      process.exit(1);
    }, 5000);
  } else {
    process.exit(exitCode);
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection; shutting down', { errorType: reason?.name || typeof reason });
  shutdown('unhandledRejection', 1);
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception; shutting down', { errorType: err?.name || 'UnknownError' });
  shutdown('uncaughtException', 1);
});
