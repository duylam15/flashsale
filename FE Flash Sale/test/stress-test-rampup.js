import http from 'k6/http';
import { check } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// Custom Metrics
const successfulOrders = new Counter('orders_success');
const failedOrders = new Counter('orders_failed');
const orderDuration = new Trend('order_response_time');
const errorRate = new Rate('error_rate');

export const options = {
  scenarios: {
    ramp_up_stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 100 },  // Giai đoạn 1: Khởi động nhẹ lên 100 VUs trong 10s
        { duration: '20s', target: 300 },  // Giai đoạn 2: Tăng đều lên 300 VUs trong 20s
        { duration: '20s', target: 600 },  // Giai đoạn 3: Đẩy tải lên 600 VUs
        { duration: '20s', target: 1000 }, // Giai đoạn 4: Đẩy chạm mốc 1000 VUs
        { duration: '10s', target: 0 },    // Giai đoạn 5: Giảm dần về 0 (Cool down)
      ],
      gracefulRampDown: '5s',
    },
  },
  thresholds: {
    // Nếu tỉ lệ lỗi vượt 5% hoặc latency p95 > 2s thì đánh dấu vượt ngưỡng chịu tải
    error_rate: ['rate<0.05'],
    http_req_duration: ['p(95)<2000'],
  },
};

// export const options = {
//   scenarios: {
//     find_max_rps: {
//       executor: 'ramping-arrival-rate',
//       startRate: 50,              // Bắt đầu từ 50 RPS
//       timeUnit: '1s',
//       preAllocatedVUs: 200,       // Khởi tạo sẵn 200 worker
//       maxVUs: 1500,               // Mở rộng tối đa 1500 worker nếu RPS đòi hỏi
//       stages: [
//         { duration: '15s', target: 100 }, // Tăng lên 100 RPS trong 15s
//         { duration: '20s', target: 300 }, // Tăng lên 300 RPS
//         { duration: '20s', target: 600 }, // Tăng lên 600 RPS
//         { duration: '20s', target: 1000 },// Thử thách ở 1000 RPS
//         { duration: '10s', target: 50 },  // Hạ tải về 50 RPS
//       ],
//     },
//   },
//   thresholds: {
//     http_req_failed: ['rate<0.05'],
//     http_req_duration: ['p(95)<1500'],
//   },
// };

const BASE_URL = 'http://localhost:4000/v1';
const PRODUCT_ID = 1;
const MAX_PREPARED_TOKENS = 1000;

// Setup: Chuẩn bị trước 1000 tokens
export function setup() {
  console.log(`[SETUP] Đang khởi tạo ${MAX_PREPARED_TOKENS} tokens...`);
  const res = http.post(
    `${BASE_URL}/auth/generate-tokens`,
    JSON.stringify({ count: MAX_PREPARED_TOKENS, startId: 1 }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  if (res.status !== 200) {
    throw new Error(`Setup thất bại: ${res.body}`);
  }

  return { users: res.json().data.users };
}

export default function (data) {
  // Lấy token luân phiên theo ID của Virtual User
  const vuIndex = (__VU - 1) % data.users.length;
  const user = data.users[vuIndex];

  const payload = JSON.stringify({
    items: [{ productId: PRODUCT_ID, quantity: 1 }],
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${user.token}`,
    },
  };

  const res = http.post(`${BASE_URL}/orders`, payload, params);

  const isOk = res.status === 200 || res.status === 201;

  check(res, {
    'Status 200/201': (r) => isOk,
  });

  if (isOk) {
    successfulOrders.add(1);
    errorRate.add(0);
  } else {
    failedOrders.add(1);
    errorRate.add(1);
  }

  orderDuration.add(res.timings.duration);
}