import { Server } from 'http';
import app from './app';
import prisma from './client';
import redis from './config/redis';
import config from './config/config';
import logger from './config/logger';
import { startFlashSaleWorker } from './modules/Order/order.worker';

// HTTP server ONLY. Start Order Worker and Demo Runner as separate processes.
let server: Server | undefined;
let shuttingDown = false;

void startFlashSaleWorker().catch((error) => {
  logger.error('Flash Sale Worker failed:', error);
});

async function bootstrap() {
  await prisma.$connect();
  logger.info('Connected to SQL Database');
  server = app.listen(config.port, () => {
    logger.info(`Listening to port ${config.port}`);
  });
}

async function shutdown(reason: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info(`Shutting down: ${reason}`);
  if (server) {
    await new Promise<void>((resolve) => server!.close(() => resolve()));
  }
  await prisma.$disconnect();
  await redis.quit().catch(() => redis.disconnect());
}

process.once('SIGINT', () => { void shutdown('SIGINT'); });
process.once('SIGTERM', () => { void shutdown('SIGTERM'); });

process.on('uncaughtException', (error) => {
  logger.error(error);
  void shutdown('uncaughtException').finally(() => { process.exitCode = 1; });
});
process.on('unhandledRejection', (error) => {
  logger.error(error);
  void shutdown('unhandledRejection').finally(() => { process.exitCode = 1; });
});

bootstrap().catch((error) => {
  logger.error(error);
  process.exitCode = 1;
});