'use client';

import { useEffect, useState } from 'react';
import {
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Activity,
  Eye,
  X,
} from 'lucide-react';

interface LoadTestSummary {
  id: string;
  name: string;
  description: string | null;
  tool: string;
  status: string;
  targetEndpoint: string;
  vus: number;
  durationSeconds: number;
  totalRequests: number;
  successCount: number;
  failedCount: number;
  rps: number;
  p95LatencyMs: number;
  p99LatencyMs: number | null;
  executedAt: string;
}

export default function TestResultsTab() {
  const [results, setResults] = useState<LoadTestSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDetail, setSelectedDetail] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  const fetchResults = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/v1/load-test-results`);
      const json = await res.json();
      setResults(json.data?.results || []);
    } catch (error) {
      console.error('Lỗi tải danh sách test:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDetail = async (id: string) => {
    setLoadingDetail(true);
    try {
      const res = await fetch(`${API_URL}/v1/load-test-results/${id}`);
      const json = await res.json();
      setSelectedDetail(json.data);
    } catch (error) {
      console.error('Lỗi tải chi tiết test:', error);
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, []);

  const latest = results[0];

  return (
    <div className="space-y-6">
      {/* Header + Nút Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Lịch sử Benchmark & Load Test
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Dữ liệu thực tế được ghi nhận trực tiếp từ PostgreSQL sau mỗi phiên chạy k6.
          </p>
        </div>

        <button
          onClick={fetchResults}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition shadow-sm cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Làm mới dữ liệu
        </button>
      </div>

      {/* KPI Cards của lần chạy mới nhất */}
      {latest && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-1.5">
              <Activity className="h-4 w-4 text-blue-600" />
              Throughput (Lần gần nhất)
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {latest.rps}{' '}
              <span className="text-xs font-normal text-slate-500">req/s</span>
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {latest.vus.toLocaleString()} VUs đồng thời
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-1.5">
              <Clock className="h-4 w-4 text-amber-500" />
              P95 Latency
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {latest.p95LatencyMs}{' '}
              <span className="text-xs font-normal text-slate-500">ms</span>
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Thời gian chạy: {latest.durationSeconds}s
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Xử lý hợp lệ (2xx/409)
            </div>
            <div className="text-2xl font-bold text-emerald-600">
              {latest.successCount.toLocaleString()}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Trên tổng {latest.totalRequests.toLocaleString()} requests
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-1.5">
              <AlertTriangle className="h-4 w-4 text-rose-500" />
              Lỗi hệ thống (5xx/Timeout)
            </div>
            <div
              className={`text-2xl font-bold ${
                latest.failedCount === 0 ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {latest.failedCount}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Tỷ lệ lỗi:{' '}
              {((latest.failedCount / (latest.totalRequests || 1)) * 100).toFixed(2)}%
            </div>
          </div>
        </div>
      )}

      {/* Bảng danh sách */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm text-slate-700">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-5 py-3.5">Tên kịch bản</th>
              <th className="px-4 py-3.5 text-right">VUs</th>
              <th className="px-4 py-3.5 text-right">RPS</th>
              <th className="px-4 py-3.5 text-right">P95 (ms)</th>
              <th className="px-4 py-3.5 text-right">Hợp lệ / Lỗi</th>
              <th className="px-4 py-3.5">Thời gian</th>
              <th className="px-5 py-3.5 text-center">Chi tiết</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                  Đang tải dữ liệu từ VPS...
                </td>
              </tr>
            ) : results.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                  Chưa có bản ghi test nào. Hãy chạy thử script ở Tab 3!
                </td>
              </tr>
            ) : (
              results.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/80 transition">
                  <td className="px-5 py-3.5">
                    <div className="font-semibold text-slate-900">{item.name}</div>
                    {item.description && (
                      <div className="text-xs text-slate-500 mt-0.5">
                        {item.description}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono text-slate-700">
                    {item.vus.toLocaleString()}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono text-blue-600 font-semibold">
                    {item.rps}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono text-amber-600 font-medium">
                    {item.p95LatencyMs}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono">
                    <span className="text-emerald-600 font-semibold">
                      {item.successCount}
                    </span>{' '}
                    /{' '}
                    <span
                      className={
                        item.failedCount > 0
                          ? 'text-rose-600 font-semibold'
                          : 'text-slate-400'
                      }
                    >
                      {item.failedCount}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-xs text-slate-500 whitespace-nowrap">
                    {new Date(item.executedAt).toLocaleString('vi-VN')}
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <button
                      onClick={() => fetchDetail(item.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition cursor-pointer"
                    >
                      <Eye className="h-3.5 w-3.5 text-slate-500" /> JSON
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal xem chi tiết Raw JSON */}
      {(selectedDetail || loadingDetail) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
          <div className="max-h-[85vh] w-full max-w-3xl flex flex-col rounded-2xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h3 className="font-bold text-slate-900">
                {loadingDetail
                  ? 'Đang tải chi tiết...'
                  : `Chi tiết Metrics: ${selectedDetail?.name}`}
              </h3>
              <button
                onClick={() => setSelectedDetail(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto p-6 space-y-5">
              {selectedDetail && (
                <>
                  {selectedDetail.rawResult?.customCounters && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3.5">
                        <div className="text-xs font-medium text-emerald-700">
                          Mua thành công (201/202)
                        </div>
                        <div className="text-xl font-bold text-emerald-900 mt-1">
                          {
                            selectedDetail.rawResult.customCounters
                              .flashsale_accepted
                          }
                        </div>
                      </div>

                      <div className="rounded-xl bg-amber-50 border border-amber-200 p-3.5">
                        <div className="text-xs font-medium text-amber-700">
                          Hết hàng / Từ chối (400/409)
                        </div>
                        <div className="text-xl font-bold text-amber-900 mt-1">
                          {
                            selectedDetail.rawResult.customCounters
                              .flashsale_rejected
                          }
                        </div>
                      </div>

                      <div className="rounded-xl bg-rose-50 border border-rose-200 p-3.5">
                        <div className="text-xs font-medium text-rose-700">
                          Lỗi Server / Timeout
                        </div>
                        <div className="text-xl font-bold text-rose-900 mt-1">
                          {
                            selectedDetail.rawResult.customCounters
                              .flashsale_errors
                          }
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="text-xs font-semibold text-slate-600 mb-2">
                      Full k6 Summary JSON (`rawResult`)
                    </div>
                    <pre className="rounded-xl bg-slate-50 p-4 text-xs font-mono text-slate-800 overflow-x-auto border border-slate-200 leading-relaxed">
                      {JSON.stringify(selectedDetail.rawResult, null, 2)}
                    </pre>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}