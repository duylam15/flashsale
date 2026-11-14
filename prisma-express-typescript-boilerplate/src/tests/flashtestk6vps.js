/* eslint-disable */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter } from 'k6/metrics';

// ==========================================
// CẤU HÌNH CHO VPS
// ==========================================
const BASE_URL = __ENV.BASE_URL || 'http://157.66.219.33:4000/v1';
const TOTAL_USERS = Number(__ENV.TOTAL_USERS || 1000);
const PRODUCT_ID = Number(__ENV.PRODUCT_ID || 1);
const START_ID = Number(__ENV.START_ID || 1);
const JITTER = Number(__ENV.JITTER || 3);

// Số lượng sản phẩm dành riêng cho Flash Sale
const FLASH_SALE_STOCK = Number(__ENV.FLASH_SALE_STOCK || 1000);

// Thống kê custom
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
      maxDuration: '2m',
      gracefulStop: '5s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<2000'], // Ngưỡng p95 cho VPS
  },
};

// ==========================================
// 1. SETUP - WARMUP CACHE + TẠO TOKEN
// ==========================================
export function setup() {
  // BƯỚC 1: WARMUP CACHE
  console.log(
    `[K6 SETUP] Khởi tạo tồn kho Flash Sale trên VPS (${BASE_URL}): ${FLASH_SALE_STOCK} sản phẩm`
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

  console.log(`[K6 SETUP] Warmup API phản hồi thành công`);

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
      `Không đủ tokens: ${(users && users.length) || 0}/${TOTAL_USERS}`
    );
  }

  console.log(
    `[K6 SETUP] Đã nhận thành công ${users.length} tokens. Bắt đầu bắn ${TOTAL_USERS} reqs vào VPS...`
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

  // __VU bắt đầu từ 1, index mảng bắt đầu từ 0
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

// ==========================================
// 3. SUMMARY - TỰ ĐỘNG LƯU KẾT QUẢ VÀO DB
// ==========================================
export function handleSummary(data) {
  const metrics = data.metrics;
  const totalReqs = metrics.http_reqs?.values?.count || 0;
  const rps = metrics.http_reqs?.values?.rate || 0;
  const p95 = metrics.http_req_duration?.values['p(95)'] || 0;
  const p99 = metrics.http_req_duration?.values['p(99)'] || null;
  const durationSeconds = (data.state?.testRunDurationMs || 0) / 1000;

  // Lấy số liệu từ 3 custom Counter
  const acceptedCount = metrics.flashsale_accepted?.values?.count || 0;
  const rejectedCount = metrics.flashsale_rejected?.values?.count || 0;
  const errorCount = metrics.flashsale_errors?.values?.count || 0;

  // 201/202 (mua được) và 400/409 (hết hàng đúng nghiệp vụ) đều tính là request xử lý hợp lệ
  const validHandledCount = acceptedCount + rejectedCount;

  const payload = {
    name:
      __ENV.TEST_NAME ||
      `VPS FlashSale ${TOTAL_USERS} VUs - Stock ${FLASH_SALE_STOCK}`,
    description:
      __ENV.TEST_DESC || `Chạy từ Windows Local bắn lên VPS (${BASE_URL})`,
    tool: 'K6',
    status: 'COMPLETED',
    sessionId: __ENV.SESSION_ID ? Number(__ENV.SESSION_ID) : null,
    targetEndpoint: 'POST /orders/flash-sale',
    vus: TOTAL_USERS,
    durationSeconds: Math.round(durationSeconds),
    totalRequests: totalReqs,
    successCount: validHandledCount,
    failedCount: errorCount,
    rps: Number(rps.toFixed(2)),
    p95LatencyMs: Number(p95.toFixed(2)),
    p99LatencyMs: p99 ? Number(p99.toFixed(2)) : null,
    rawResult: {
      customCounters: {
        flashsale_accepted: acceptedCount,
        flashsale_rejected: rejectedCount,
        flashsale_errors: errorCount,
      },
      metrics: data.metrics,
    },
    environmentMeta: {
      baseUrl: BASE_URL,
      productId: PRODUCT_ID,
      flashSaleStock: FLASH_SALE_STOCK,
      jitter: JITTER,
      clientOS: 'Windows',
    },
  };

  console.log(
    `\n[K6 SUMMARY] Đang đẩy kết quả test lên ${BASE_URL}/load-test-results ...`
  );

  const res = http.post(
    `${BASE_URL}/load-test-results`,
    JSON.stringify(payload),
    {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: '30s',
    }
  );

  if (res.status === 201) {
    console.log(
      `[K6 SUMMARY] Đã lưu kết quả vào DB thành công! ID: ${res.json('data.id')}`
    );
  } else {
    console.error(
      `[K6 SUMMARY] Lưu DB thất bại (${res.status}): ${res.body}`
    );
  }

  return {
    stdout: JSON.stringify(payload.rawResult.customCounters, null, 2) + '\n',
  };
}