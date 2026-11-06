
import redis from './config/redis';
import { startFlashSaleWorker } from './modules/Order/order.worker';

async function main() {
  try {
    await redis.ping();
    console.log('Redis connected. Starting Worker...');

    await startFlashSaleWorker();
  } catch (error) {
    console.error('Worker startup failed:', error);
    process.exit(1);
  }
}

main();
