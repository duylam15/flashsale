
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

const TOTAL_USERS = 100;
const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000/v1';
const PRODUCT_ID = Number(__ENV.PRODUCT_ID || 1);
const START_ID = Number(__ENV.START_ID || 1);

// Mặc định rải request trong 3 giây.
// Có thể giảm dần xuống 1 hoặc 0.2 giây.
const JITTER_SECONDS = Number(__ENV.JITTER_SECONDS ?? 3);

// Custom metrics
const acceptedOrders = new Counter('orders_accepted_202');
const rejectedOrders = new Counter('orders_rejected_400');
const systemErrors = new Counter('orders_system_errors');
const networkErrors = new Counter('orders_network_errors');

const validResponseRate = new Rate('valid_response_rate');
const acceptedRate = new Rate('order_accepted_rate');

const flashSaleDuration = new Trend(
  'flash_sale_duration',
  true
);

export const options = {
  scenarios: {
    flash_sale_3000: {
      executor: 'per-vu-iterations',
      vus: TOTAL_USERS,
      iterations: 1,
      maxDuration: '1m',
      gracefulStop: '10s',
    },
  },

  thresholds: {
    'flash_sale_duration': ['p(95)<1000'],
    'orders_system_errors': ['count==0'],
    'orders_network_errors': ['count==0'],
    'valid_response_rate': ['rate==1'],
  },
};

// Đối với endpoint Flash Sale,
// 202 và 400 đều là response hợp lệ về mặt giao thức nghiệp vụ.
// Chỉ áp dụng cấu hình này cho request Flash Sale,
// không thay đổi cách đánh giá setup API.
export function setup() {
  console.log(`[SETUP] Creating ${TOTAL_USERS} tokens...`);

  const res = http.post(
    `${BASE_URL}/auth/generate-tokens`,
    JSON.stringify({
      count: TOTAL_USERS,
      startId: START_ID,
    }),
    {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: '60s',
    }
  );

  if (res.status !== 200) {
    throw new Error(
      `Token setup failed: ${res.status} ${res.body}`
    );
  }

  const users = res.json('data.users');

  if (!Array.isArray(users) || users.length !== TOTAL_USERS) {
    throw new Error('Invalid number of generated users');
  }

  const uniqueIds = new Set(users.map((user) => user.id));
  const uniqueTokens = new Set(
    users.map((user) => user.token)
  );

  if (
    users.some((user) => !user.token) ||
    uniqueTokens.size !== TOTAL_USERS
  ) {
    throw new Error('Missing or duplicate user tokens');
  }

  // Nếu API có trường id thì kiểm tra các user không trùng.
  if (
    users.every((user) => user.id !== undefined) &&
    uniqueIds.size !== TOTAL_USERS
  ) {
    throw new Error('Duplicate user IDs');
  }

  console.log('[SETUP] Warming Redis stock...');

  // Giữ nguyên giả định token đầu tiên có quyền Admin.
  // Thay bằng ADMIN_TOKEN nếu có token Admin riêng.
  const adminToken = __ENV.ADMIN_TOKEN || users[0].token;

  const warmup = http.post(
    `${BASE_URL}/orders/warmup-cache`,
    JSON.stringify({
      productIds: [PRODUCT_ID],
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      timeout: '30s',
    }
  );

  if (warmup.status !== 200) {
    throw new Error(
      `Warmup failed: ${warmup.status} ${warmup.body}`
    );
  }

  console.log('[SETUP] Ready for 3000 VUs.');

  return { users };
}

export default function (data) {
  const index = __VU - 1;
  const user = data.users[index];

  if (!user) {
    systemErrors.add(1);
    validResponseRate.add(false);
    acceptedRate.add(false);
    return;
  }

  if (JITTER_SECONDS > 0) {
    sleep(Math.random() * JITTER_SECONDS);
  }

  const payload = JSON.stringify({
    productId: PRODUCT_ID,
    quantity: 1,
  });

  const response = http.post(
    `${BASE_URL}/orders`,
    payload,
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user.token}`,
      },
      timeout: '15s',
      responseCallback: http.expectedStatuses(202, 400),
      tags: {
        name: 'POST /orders',
      },
    }
  );

  flashSaleDuration.add(response.timings.duration);

  const accepted = response.status === 202;
  const rejected = response.status === 400;
  const valid = accepted || rejected;

  validResponseRate.add(valid);
  acceptedRate.add(accepted);

  check(response, {
    'Valid business response (202 or 400)': () => valid,
  });

  if (accepted) {
    acceptedOrders.add(1);
  } else if (rejected) {
    rejectedOrders.add(1);
  } else {
    systemErrors.add(1);

    if (response.status === 0) {
      networkErrors.add(1);
    }

    // Log giới hạn, tránh hàng nghìn dòng console
    if (__VU <= 20) {
      console.error(
        `[ERROR] VU=${__VU}, status=${response.status}, ` +
        `error=${response.error || 'unknown'}, ` +
        `body=${String(response.body || '').slice(0, 300)}`
      );
    }
  }
}

export function teardown() {
  console.log('[TEST COMPLETED] Flash Sale 3000 VUs.');
}
