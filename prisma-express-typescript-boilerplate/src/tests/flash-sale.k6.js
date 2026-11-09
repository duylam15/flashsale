
/* eslint-disable */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter } from 'k6/metrics';

// ==========================================
// CẤU HÌNH
// ==========================================

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000/v1';
const TOTAL_USERS = Number(__ENV.TOTAL_USERS || 5000);
const PRODUCT_ID = Number(__ENV.PRODUCT_ID || 1);
const START_ID = Number(__ENV.START_ID || 1);
const JITTER = Number(__ENV.JITTER || 0);

// Số lượng sản phẩm dành riêng cho Flash Sale
const FLASH_SALE_STOCK = Number(__ENV.FLASH_SALE_STOCK || 5000);

// Thống kê
const accepted = new Counter('flashsale_accepted');
const rejected = new Counter('flashsale_rejected');
const errors = new Counter('flashsale_errors');


export const options = {
  setupTimeout: '5m',
  teardownTimeout: '2m',

  scenarios: {
    flash_sale_spike: {
      executor: 'per-vu-iterations',
      vus: TOTAL_USERS,
      iterations: 1,
      maxDuration: '5m',
      gracefulStop: '10s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<1000'],
  },
};

// ==========================================
// 1. SETUP - WARMUP CACHE + TẠO TOKEN
// ==========================================

export function setup() {

  // BƯỚC 1: WARMUP CACHE
  console.log(
    `[K6 SETUP] Khởi tạo tồn kho Flash Sale: ${FLASH_SALE_STOCK} sản phẩm`
  );

  const warmupResponse = http.post(
    `${BASE_URL}/orders/warmup-cache`,
    JSON.stringify({
      productIds: [PRODUCT_ID],
      stock: FLASH_SALE_STOCK,
    }),
    {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: '120s',
    }
  );

  if (warmupResponse.status !== 200) {
    throw new Error(
      `Warmup cache failed: HTTP ${warmupResponse.status} - ${warmupResponse.body}`
    );
  }

  console.log(
    `[K6 SETUP] Warmup API phản hồi thành công`
  );

  // BƯỚC 2: TẠO TOKEN
  console.log(
    `[K6 SETUP] Đang sinh ${TOTAL_USERS} tokens bắt đầu từ ID ${START_ID}...`
  );

  const response = http.post(
    `${BASE_URL}/auth/generate-tokens`,
    JSON.stringify({
      count: TOTAL_USERS,
      startId: START_ID,
    }),
    {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: '120s',
    }
  );

  if (response.status !== 200) {
    throw new Error(
      `Generate tokens failed: HTTP ${response.status}, ${response.body}`
    );
  }

  const users = response.json('data.users');

  if (!Array.isArray(users) || users.length < TOTAL_USERS) {
    throw new Error(
      `Không đủ tokens: ${(users && users.length) || 0}/${TOTAL_USERS}`);
  }

  console.log(
    `[K6 SETUP] Đã nhận thành công ${users.length} tokens. Bắt đầu bắn tải...`
  );

  return { users };
}

// ==========================================
// 2. CHẠY LOAD TEST
// ==========================================

export default function (data) {
  if (JITTER > 0) {
    sleep(Math.random() * JITTER);
  }

  const user = data.users[__VU - 1];

  if (!user || !user.token) {
    errors.add(1);
    return;
  }

  const response = http.post(
    `${BASE_URL}/orders/flash-sale`,
    JSON.stringify({
      productId: PRODUCT_ID,
      quantity: 1,
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user.token}`,
      },
      timeout: '30s',
      // responseCallback: http.expectedStatuses(
      //   201, 202, 400, 409
      // ),
      tags: {
        endpoint: 'flash_sale',
      },
    }
  );

  // THỐNG KÊ KẾT QUẢ
  if (response.status === 201 || response.status === 202) {
    accepted.add(1);

  } else if (response.status === 400 || response.status === 409) {
    rejected.add(1);

  } else {
    errors.add(1);

    if (__VU <= 10) {
      console.log(
        `[WARNING] VU ${__VU} | Status: ${response.status} | Error: ${response.error}`
      );
    }
  }

  check(response, {
    'Valid Response (201, 202, 400, 409)': (r) =>
      r.status === 201 ||
      r.status === 202 ||
      r.status === 400 ||
      r.status === 409,
  });
}
