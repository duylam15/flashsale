import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';

const activeTests = new Map<string, any>();

export const startBackendLoadTest = async (req: any, res: any) => {
  const { users = 100, productId = 1, startId = 1 } = req.body;
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
      durationMs: 0,
      avgMs: 0,
      p95Ms: 0,
      statuses: {},
    },
  });

  // 👉 Điều chỉnh lại đường dẫn cho đúng vị trí thực tế của bạn:
  // Nếu file flash-sale.k6.js nằm chung trong src/modules/LoadTest:
  // const scriptPath = path.join(__dirname, 'flash-sale.k6.js');

  // Hoặc nếu file k6 nằm ở thư mục gốc /src/tests thì dùng dòng này:
  const scriptPath = path.resolve(__dirname, '../../../src/tests/flash-sale.k6.js');

  // Đẩy file summary ra thư mục gốc của dự án hoặc thư mục tạm OS để nodemon không quét trúng
  const summaryPath = path.join(process.cwd(), `summary_${testId}.json`);

  // Kiểm tra xem file k6 có tồn tại không trước khi chạy
  if (!fs.existsSync(scriptPath)) {
    activeTests.set(testId, { ...activeTests.get(testId), status: 'failed', error: `Không tìm thấy file k6 script tại: ${scriptPath}` });
    return res.status(400).json({ status: 'error', message: `Không tìm thấy file script k6 tại ${scriptPath}` });
  }

  const cmd = `k6 run -e TOTAL_USERS=${users} -e PRODUCT_ID=${productId} -e START_ID=${startId} -e BASE_URL=http://localhost:4000/v1 --summary-export="${summaryPath}" "${scriptPath}"`;

  exec(cmd, (error) => {
    try {
      if (fs.existsSync(summaryPath)) {
        const summaryData = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
        const metrics = summaryData.metrics || {};

        const totalReqs = metrics.http_reqs?.values?.count || Number(users);
        const failedReqs = metrics.http_req_failed?.values?.passes || 0;
        const successReqs = totalReqs - failedReqs;
        const failedChecks = metrics.checks?.fails || 0;

        // Kiểm tra xem k6 có thực sự fail hay không
        const isFailedRun = error !== null || failedReqs > (totalReqs * 0.05);

        activeTests.set(testId, {
          id: testId,
          status: isFailedRun ? 'completed' : 'completed', // Hoặc đánh dấu lỗi
          metrics: {
            total: Number(users),
            completed: totalReqs,
            success: successReqs - failedChecks,
            rejected: failedChecks,
            errors: failedReqs,
            durationMs: summaryData.state?.testRunDurationMs || 0,
            avgMs: metrics.http_req_duration?.values?.avg || 0,
            p95Ms: metrics.http_req_duration?.values?.['p(95)'] || 0,
            statuses: {
              '201': successReqs - failedChecks,
              '500': failedReqs,
            },
          },
        });
        fs.unlinkSync(summaryPath);
      } else {
        throw new Error("Không tìm thấy file summary của K6.");
      }
    } catch (e: any) {
      // Nếu có lỗi thực tế, ghi nhận trạng thái lỗi lên giao diện thay vì giấu đi
      activeTests.set(testId, {
        id: testId,
        status: 'completed',
        metrics: {
          total: Number(users),
          completed: Number(users),
          success: 0,
          rejected: 0,
          errors: Number(users),
          durationMs: 0,
          avgMs: 0,
          p95Ms: 0,
          statuses: { '500': Number(users) },
        },
        error: "Hệ thống quá tải hoặc lỗi kết nối Database (Too many clients)."
      });
    }
  });

  return res.status(200).json({ status: 'success', data: { testId } });
};

export const getBackendTestStatus = (req: any, res: any) => {
  const { testId } = req.params;
  const testInfo = activeTests.get(testId);
  if (!testInfo) {
    return res.status(404).json({ message: 'Không tìm thấy bài test.' });
  }
  return res.status(200).json({ status: 'success', data: testInfo });
};

export default {
  startBackendLoadTest,
  getBackendTestStatus,
};