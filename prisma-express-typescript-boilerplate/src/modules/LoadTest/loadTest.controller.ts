
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';

const activeTests = new Map<string, any>();

export const startBackendLoadTest = async (req: any, res: any) => {
  const {
    users = 100,
    productId = 1,
    startId = 1,
    stock = 3000,
    jitter = 0,
  } = req.body;

  const testId = `test_${Date.now()}`;

  activeTests.set(testId, {
    id: testId,
    status: 'running',
    metrics: {
      total: Number(users),
      completed: 0,
      success: 0,
      rejected: 0,
      errors: 0,
      statuses: {},
    },
  });

  const scriptPath = path.join(
    process.cwd(),
    'src/tests/flash-sale.k6.js'
  );

  const summaryPath = path.join(
    process.cwd(),
    `summary_${testId}.json`
  );

  if (!fs.existsSync(scriptPath)) {
    activeTests.set(testId, {
      id: testId,
      status: 'failed',
      error: `Không tìm thấy file K6: ${scriptPath}`,
    });

    return res.status(400).json({
      status: 'error',
      message: `Không tìm thấy file K6: ${scriptPath}`,
    });
  }

  const cmd = `k6 run -e TOTAL_USERS=${users} -e PRODUCT_ID=${productId} -e START_ID=${startId} -e FLASH_SALE_STOCK=${stock} -e JITTER=${jitter} -e BASE_URL=http://localhost:4000/v1 --summary-export="${summaryPath}" "${scriptPath}"`;


  exec(cmd, { maxBuffer: 20 * 1024 * 1024 }, (error) => {
    try {
      // K6 exit code 99 = không đạt threshold P95.
      // Đây không phải lỗi thực thi, vẫn đọc summary bình thường.
      if (error && Number((error as any).code) !== 99) {
        throw new Error(`K6 chạy lỗi: ${error.message}`);
      }

      if (!fs.existsSync(summaryPath)) {
        throw new Error('Không tìm thấy file summary K6');
      }

      const summaryData = JSON.parse(
        fs.readFileSync(summaryPath, 'utf8')
      );

      const metrics = summaryData.metrics || {};

      const get = (name: string, field: string): number | null => {
        const value =
          metrics[name]?.values?.[field] ??
          metrics[name]?.[field];

        return typeof value === 'number' ? value : null;
      };

      const success = get('flashsale_accepted', 'count') ?? 0;
      const rejected = get('flashsale_rejected', 'count') ?? 0;
      const errors = get('flashsale_errors', 'count') ?? 0;

      const completed =
        get('iterations', 'count') ??
        success + rejected + errors;

      const httpReqs = get('http_reqs', 'count');
      const rps = get('http_reqs', 'rate');

      const latencyKey = metrics[
        'http_req_duration{endpoint:flash_sale}'
      ]
        ? 'http_req_duration{endpoint:flash_sale}'
        : 'http_req_duration';

      const checksPassed = get('checks', 'passes');
      const checksFailed = get('checks', 'fails');

      const failedCount = get('http_req_failed', 'passes');
      const failedRate = get('http_req_failed', 'rate');

      const httpReqFailed =
        failedCount ??
        (failedRate !== null && httpReqs !== null
          ? Math.round(failedRate * httpReqs)
          : null);

      const durationMs =
        summaryData.state?.testRunDurationMs ??
        (httpReqs !== null && rps !== null && rps > 0
          ? (httpReqs / rps) * 1000
          : null);

      const statuses: Record<string, number> = {};

      if (success > 0) statuses['201/202'] = success;
      if (rejected > 0) statuses['400/409'] = rejected;

      activeTests.set(testId, {
        id: testId,
        status: 'completed',
        metrics: {
          total: Number(users),
          completed,
          success,
          accepted: success,
          rejected,
          errors,

          rps,
          avgMs: get(latencyKey, 'avg'),
          p95Ms: get(latencyKey, 'p(95)'),
          p90Ms: get(latencyKey, 'p(90)'),
          minMs: get(latencyKey, 'min'),
          maxMs: get(latencyKey, 'max'),
          medianMs: get(latencyKey, 'med'),
          durationMs,

          checksTotal:
            checksPassed !== null && checksFailed !== null
              ? checksPassed + checksFailed
              : null,
          checksSucceeded: checksPassed,
          checksFailed,

          httpReqs,
          httpReqFailed,
          statuses,
        },

        ...(error
          ? { warning: 'K6 hoàn thành nhưng không đạt threshold P95' }
          : {}),
      });

      fs.unlinkSync(summaryPath);
    } catch (e: any) {
      activeTests.set(testId, {
        id: testId,
        status: 'failed',
        error: e.message,
      });
    }
  });


  return res.status(200).json({
    status: 'success',
    data: { testId },
  });
};

export const getBackendTestStatus = (req: any, res: any) => {
  const { testId } = req.params;
  const testInfo = activeTests.get(testId);

  if (!testInfo) {
    return res.status(404).json({
      message: 'Không tìm thấy bài test.',
    });
  }

  return res.status(200).json({
    status: 'success',
    data: testInfo,
  });
};

export default {
  startBackendLoadTest,
  getBackendTestStatus,
};
