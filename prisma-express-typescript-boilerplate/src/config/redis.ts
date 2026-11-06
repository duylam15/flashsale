import Redis from 'ioredis';

// Đọc URL từ file .env, nếu không có thì mặc định dùng localhost
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

// Khởi tạo một đối tượng kết nối
const redis = new Redis(redisUrl, {
  // Cấu hình thử kết nối lại tự động nếu Redis bị rớt mạng
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

// --- LẮNG NGHE CÁC SỰ KIỆN ĐỂ DEBUG ---

// Khi kết nối thành công
redis.on('connect', () => {
  console.log('🟢 Đã kết nối thành công tới Redis!');
});

// Khi có lỗi xảy ra (sai pass, sai port, redis chưa bật...)
redis.on('error', (err) => {
  console.error('🔴 Lỗi kết nối Redis:', err.message);
});

// Khi Redis đã sẵn sàng nhận lệnh
redis.on('ready', () => {
  console.log('🚀 Redis đã sẵn sàng hoạt động!');
});

// Xuất đối tượng redis ra để các file khác (như controller, worker) có thể import và dùng chung
export default redis;