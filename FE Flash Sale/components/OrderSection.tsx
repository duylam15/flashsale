'use client';

import { useState } from 'react';

interface ClientTestProps {
  productId: number;
}

interface TestJob {
  id: string;
  status: 'running' | 'completed' | 'failed';
  metrics: {
    total: number;
    completed: number;
    success: number;
    rejected: number;
    errors: number;
    durationMs: number;
    avgMs: number;
    p95Ms?: number;
    statuses: Record<string, number>;
  };
  error?: string;
}

// Gọi qua domain/port hiện tại của Next.js (sẽ được proxy ngầm sang backend)
const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

export default function ClientFlashSaleTest({ productId }: ClientTestProps) {
  const [quantity, setQuantity] = useState(100);
  const [startId, setStartId] = useState(1);
  const [isRunning, setIsRunning] = useState(false);
  const [message, setMessage] = useState('');
  const [job, setJob] = useState<TestJob | null>(null);

  const handleBackendLoadTest = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setMessage('Đang khởi tạo bài test trên Server...');
    setJob(null);

    try {
      // 1. Gửi số VUs xuống Backend để kích hoạt K6 chạy ngầm qua route /v1/load-tests
      const res = await fetch(`${API_URL}/v1/load-tests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ users: quantity, productId, startId,jitter: 0 }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || 'Không thể khởi chạy load test trên server.');
      }

      const testId = json.data.testId;
      setMessage(`Đã kích hoạt K6 trên Server với ${quantity} VUs. Đang theo dõi tiến độ...`);

      // 2. Vòng lặp Polling trạng thái mỗi 1 giây từ Backend
      for (let i = 0; i < 60; i++) {
        await new Promise((r) => setTimeout(r, 1000));

        const statusRes = await fetch(`${API_URL}/v1/load-tests/${testId}`, {
          cache: 'no-store',
        });

        const statusJson = await statusRes.json();
        if (!statusRes.ok) {
          throw new Error(statusJson.message || 'Không lấy được trạng thái test.');
        }

        const currentJob = statusJson.data as TestJob;
        setJob(currentJob);

        if (currentJob.status === 'completed') {
          setMessage('🎉 Bài kiểm thử K6 trên Server đã hoàn thành!');
          break;
        }

        if (currentJob.status === 'failed') {
          throw new Error(currentJob.error || 'K6 thực thi thất bại trên server.');
        }
      }
    } catch (error: any) {
      setMessage(`Lỗi: ${error.message || 'Kiểm thử thất bại'}`);
    } finally {
      setIsRunning(false);
    }
  };

  const metrics = job?.metrics;
  const progress = metrics ? Math.min(100, (metrics.completed / Math.max(1, metrics.total)) * 100) : 0;

  return (
    <div className="space-y-6 rounded-2xl border bg-white p-6 shadow-sm">
      <div>
        <h3 className="text-xl font-bold text-gray-900">⚡ Server-Side K6 Load Test Dashboard</h3>
        <p className="text-sm text-gray-500 mt-1">
          Nhập số lượng VUs trực tiếp trên ssweb, Backend sẽ tự động gọi file <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">flash-sale.k6.js</code> để chạy tải và trả kết quả real-time.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-semibold text-gray-700">Số lượng VUs / Requests</label>
          <input
            type="number"
            min={1}
            max={5000}
            value={quantity}
            disabled={isRunning}
            onChange={(e) => setQuantity(Number(e.target.value))}
            className="w-full rounded-xl border p-3 focus:outline-indigo-600"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            {[50, 100, 500, 1000].map((n) => (
              <button
                key={n}
                type="button"
                disabled={isRunning}
                onClick={() => setQuantity(n)}
                className="rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
              >
                {n.toLocaleString()} VUs
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-gray-700">Start User ID</label>
          <input
            type="number"
            value={startId}
            min={1}
            disabled={isRunning}
            onChange={(e) => setStartId(Number(e.target.value))}
            className="w-full rounded-xl border p-3 focus:outline-indigo-600"
          />
        </div>

        <button
          type="button"
          onClick={handleBackendLoadTest}
          disabled={isRunning}
          className="w-full rounded-xl bg-indigo-600 p-4 font-bold text-white shadow-lg transition hover:bg-indigo-700 disabled:bg-gray-300"
        >
          {isRunning ? 'ĐANG CHẠY K6 TRÊN SERVER...' : `BẮT ĐẦU K6 LOAD TEST (${quantity.toLocaleString()} VUs)`}
        </button>
      </div>

      {message && (
        <div className="rounded-xl bg-gray-50 p-3.5 text-sm font-medium text-gray-700 border">
          {message}
        </div>
      )}

      {job && metrics && (
        <div className="space-y-4 rounded-xl border p-5 bg-gray-50/50">
          <div className="flex justify-between items-center">
            <h4 className="font-bold text-gray-900">📊 Thống kê kết quả K6</h4>
            <span
              className={`text-xs font-semibold px-3 py-1 rounded-full ${
                isRunning ? 'bg-amber-100 text-amber-800 animate-pulse' : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {job.status === 'running' ? 'Đang chạy K6...' : 'Hoàn thành'}
            </span>
          </div>

          <div>
            <div className="mb-2 flex justify-between text-xs font-semibold text-gray-600">
              <span>Tiến độ thực thi</span>
              <span>{progress.toFixed(1)}%</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full bg-indigo-600 transition-all duration-150"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Đã hoàn tất {metrics.completed.toLocaleString()} / {metrics.total.toLocaleString()} requests
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>Tổng: {metrics.total}</div>
            <div>Thành công: {metrics.success}</div>
            <div>Thất bại: {metrics.rejected}</div>
            <div>Lỗi:{metrics.errors}</div>
          </div>

          <div className="rounded-lg bg-white p-4 border text-sm space-y-1.5 shadow-xs">
            <p>⏱️ Tổng thời gian: {(metrics.durationMs / 1000).toFixed(2)} giây</p>
            <p>⚡ Độ trễ trung bình (Avg Latency): {metrics.avgMs.toFixed(2)} ms</p>
            {metrics.p95Ms !== undefined && <p>📈 P95 Latency: {metrics.p95Ms.toFixed(2)} ms</p>}
            <p>📦 Product ID: {productId}</p>
          </div>
        </div>
      )}
    </div>
  );
}