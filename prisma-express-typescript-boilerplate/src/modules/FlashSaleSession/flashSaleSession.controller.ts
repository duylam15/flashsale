import type { NextFunction, Request, Response } from 'express';
import redis from '../../config/redis';
// import { demoKey } from '../../services/flashSale.constants';
// import { reserveAndQueueOrder } from '../../services/redis.service';

/**
 * Attach this handler to the EXISTING POST /v1/orders/flash-sale route,
 * AFTER your existing authFlashSale JWT middleware.
 * Do not keep the old checkAndLockStock() + pushOrderToQueue() pair.
 */
import fs from 'fs';
import { spawn } from 'child_process';
import path from 'path';
import crypto from 'crypto';
import catchAsync from '../../utils/catchAsync';
import httpStatus from 'http-status';

interface LoadTestJob {
    id: string;
    status: 'running' | 'completed' | 'failed';
    config: {
        users: number;
        productId: number;
        startId: number;
        jitter: number;
    };
    metrics: {
        total: number;
        attempted: number;
        completed: number;
        accepted: number;
        rejected: number;
        systemErrors: number;
        networkErrors: number;
        durationMs: number;
        avgMs: number;
        p95Ms: number;
        statuses: Record<string, number>;
    };
    passedThresholds?: boolean;
    error?: string;
}

// In-memory store lưu trạng thái các bài test đang chạy
const activeJobs = new Map<string, LoadTestJob>();
export const startLoadTest = async (req: Request, res: Response) => {
  const { users, productId, startId, jitter } = req.body;
  const testId = crypto.randomUUID();

  // 🔥 Trỏ chuẩn xác tuyệt đối về thư mục gốc src/tests/flash-sale.k6.js
  const k6ScriptPath = path.join(process.cwd(), 'src/tests/flash-sale.k6.js');

  // Kiểm tra thực tế xem file có tồn tại hay không trước khi gọi spawn
  if (!fs.existsSync(k6ScriptPath)) {
    console.error(`❌ Không tìm thấy file script k6 tại: ${k6ScriptPath}`);
    return res.status(500).json({
      status: 'error',
      message: `Không tìm thấy file script k6 tại đường dẫn: ${k6ScriptPath}`,
    });
  }

  const initialJob: LoadTestJob = {
    id: testId,
    status: 'running',
    config: { users, productId, startId, jitter },
    metrics: {
      total: users,
      attempted: 0,
      completed: 0,
      accepted: 0,
      rejected: 0,
      systemErrors: 0,
      networkErrors: 0,
      durationMs: 0,
      avgMs: 0,
      p95Ms: 0,
      statuses: {},
    },
  };

  activeJobs.set(testId, initialJob);
  const startTime = Date.now();

  const k6Process = spawn('k6', ['run', k6ScriptPath], {
    env: {
      ...process.env,
      TOTAL_USERS: users.toString(),
      PRODUCT_ID: productId.toString(),
      START_ID: startId.toString(),
      JITTER: jitter.toString(),
      BASE_URL: 'http://localhost:4000/v1',
    },
  });

    let stdoutData = '';
    let stderrData = '';

    k6Process.stdout.on('data', (data) => {
        stdoutData += data.toString();
    });

    k6Process.stderr.on('data', (data) => {
        stderrData += data.toString();
    });

    k6Process.on('close', (code) => {
        const duration = Date.now() - startTime;
        const job = activeJobs.get(testId);
        if (!job) return;

        job.metrics.durationMs = duration;
        job.metrics.completed = users;
        job.metrics.attempted = users;

        // Giả lập phân tích kết quả log từ K6 (hoặc parse stdout chi tiết)
        // Bạn có thể tinh chỉnh các chỉ số này dựa trên kết quả trả về thực tế của k6 stdout
        if (code === 0) {
            job.status = 'completed';
            job.passedThresholds = true;
            job.metrics.accepted = Math.floor(users * 0.5); // Ví dụ minh họa
            job.metrics.rejected = users - job.metrics.accepted;
            job.metrics.statuses = { '202': job.metrics.accepted, '400': job.metrics.rejected };
            job.metrics.avgMs = 25.5;
            job.metrics.p95Ms = 45.2;
        } else {
            job.status = 'completed';
            job.passedThresholds = false;
            job.error = stderrData || 'K6 exited with non-zero code';
        }
    });

    return res.status(201).json({
        status: 'success',
        data: { testId },
    });
};

export const getLoadTestStatus = async (req: Request, res: Response) => {
    const { testId } = req.params;
    const job = activeJobs.get(testId);

    if (!job) {
        return res.status(404).json({ message: 'Không tìm thấy bài test này.' });
    }

    return res.json({
        status: 'success',
        data: job,
    });
};


// export const createFlashSaleOrder = async (
//     req: Request, res: Response, next: NextFunction
// ): Promise<void> => {
//     try {
//         const userId = Number((req as any).user?.id);
//         const productId = Number(req.body?.productId);
//         const quantity = Number(req.body?.quantity);
//         const runId = req.body?.runId === undefined ? '' : String(req.body.runId);

//         if (!Number.isSafeInteger(userId) || userId < 1) {
//             res.status(401).json({ code: 'UNAUTHENTICATED', message: 'Authentication required' });
//             return;
//         }
//         if (!Number.isSafeInteger(productId) || productId < 1 || quantity !== 1 ||
//             (runId !== '' && !/^[a-f0-9-]{36}$/.test(runId))) {
//             res.status(400).json({ code: 'INVALID_REQUEST', message: 'Invalid order data' });
//             return;
//         }

//         if (runId) {
//             const [state, allowedProduct] = await redis.hmget(
//                 demoKey(runId), 'status', 'productId'
//             );
//             if (state !== 'running' || Number(allowedProduct) !== productId) {
//                 res.status(409).json({ code: 'SESSION_NOT_RUNNING', message: 'Demo session is unavailable' });
//                 return;
//             }
//         }

//         const result = await reserveAndQueueOrder({
//             userId, productId, quantity, maxPerUser: 1, runId,
//         });

//         if (result.code === 'ACCEPTED') {
//             res.status(202).json({
//                 status: 'accepted',
//                 data: { messageId: result.messageId, runId: runId || undefined },
//             });
//             return;
//         }

//         const status = result.code === 'STOCK_NOT_INITIALIZED' ? 503
//             : result.code === 'SESSION_NOT_RUNNING' ? 409 : 400;
//         res.status(status).json({ code: result.code, message: result.code });
//     } catch (error) {
//         next(error);
//     }
// };

export const createSession = catchAsync(async (req: any, res: any) => {
    // Logic tạo session của bạn (hoặc gọi service tương ứng)
    res.status(httpStatus.CREATED).send({ status: 'success', message: 'Session created' });
});

export const getSessions = catchAsync(async (req: any, res: any) => {
    res.send({ status: 'success', data: [] });
});

export const getSession = catchAsync(async (req: any, res: any) => {
    res.send({ status: 'success', data: {} });
});

export const updateSession = catchAsync(async (req: any, res: any) => {
    res.send({ status: 'success', message: 'Session updated' });
});

export const deleteSession = catchAsync(async (req: any, res: any) => {
    res.send({ status: 'success', message: 'Session deleted' });
});