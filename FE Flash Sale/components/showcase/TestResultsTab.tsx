'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, CheckCircle2, AlertTriangle, Clock, Activity, Eye, X } from 'lucide-react';

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

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/v1';

  const fetchResults = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/load-test-results?limit=20`);
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
      const res = await fetch(`${API_URL}/load-test-results/${id}`);
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Lịch sử Benchmark & Load Test</h2>
          <p className="text-sm text-slate-400">
            Dữ liệu thực tế được ghi nhận trực tiếp từ PostgreSQL sau mỗi phiên chạy k6.
          </p>
        </div>
        <button
          onClick={fetchResults}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 transition cursor-pointer"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Làm mới dữ liệu
        </button>
      </div>

      {/* KPI Cards của lần chạy mới nhất */}
      {latest && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
              <Activity className="h-4 w-4 text-indigo-400" /> Throughput (Lần gần nhất)
            </div>
            <div className="text-2xl font-bold text-white">{latest.rps} <span className="text-xs font-normal text-slate-400">req/s</span></div>
            <div className="text-xs text-slate-500 mt-1">{latest.vus.toLocaleString()} VUs đồng thời</div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
              <Clock className="h-4 w-4 text-amber-400" /> P95 Latency
            </div>
            <div className="text-2xl font-bold text-white">{latest.p95LatencyMs} <span className="text-xs font-normal text-slate-400">ms</span></div>
            <div className="text-xs text-slate-500 mt-1">Thời gian chạy: {latest.durationSeconds}s</div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Xử lý hợp lệ (2xx/409)
            </div>
            <div className="text-2xl font-bold text-emerald-400">{latest.successCount.toLocaleString()}</div>
            <div className="text-xs text-slate-500 mt-1">Trên tổng {latest.totalRequests.toLocaleString()} requests</div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
              <AlertTriangle className="h-4 w-4 text-rose-400" /> Lỗi hệ thống (5xx/Timeout)
            </div>
            <div className={`text-2xl font-bold ${latest.failedCount === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {latest.failedCount}
            </div>
            <div className="text-xs text-slate-500 mt-1">Tỷ lệ lỗi: {((latest.failedCount / (latest.totalRequests || 1)) * 100).toFixed(2)}%</div>
          </div>
        </div>
      )}

      {/* Bảng danh sách */}
      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/40">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="border-b border-slate-800 bg-slate-900/80 text-xs uppercase text-slate-400">
            <tr>
              <th className="px-4 py-3">Tên kịch bản</th>
              <th className="px-4 py-3 text-right">VUs</th>
              <th className="px-4 py-3 text-right">RPS</th>
              <th className="px-4 py-3 text-right">P95 (ms)</th>
              <th className="px-4 py-3 text-right">Hợp lệ / Lỗi</th>
              <th className="px-4 py-3">Thời gian</th>
              <th className="px-4 py-3 text-center">Chi tiết</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/70">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">Đang tải dữ liệu từ VPS...</td>
              </tr>
            ) : results.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">Chưa có bản ghi test nào. Hãy chạy thử script ở Tab 3!</td>
              </tr>
            ) : (
              results.map((item) => (
                <tr key={item.id} className="hover:bg-slate-800/40 transition">
                  <td className="px-4 py-3">
                    <div className="font-medium text-white">{item.name}</div>
                    {item.description && <div className="text-xs text-slate-500">{item.description}</div>}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">{item.vus.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-mono text-indigo-400 font-semibold">{item.rps}</td>
                  <td className="px-4 py-3 text-right font-mono text-amber-400">{item.p95LatencyMs}</td>
                  <td className="px-4 py-3 text-right font-mono">
                    <span className="text-emerald-400">{item.successCount}</span> /{' '}
                    <span className={item.failedCount > 0 ? 'text-rose-400' : 'text-slate-500'}>{item.failedCount}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {new Date(item.executedAt).toLocaleString('vi-VN')}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => fetchDetail(item.id)}
                      className="inline-flex items-center gap-1 rounded bg-slate-800 px-2.5 py-1 text-xs text-slate-200 hover:bg-slate-700 cursor-pointer"
                    >
                      <Eye className="h-3.5 w-3.5" /> JSON
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="max-h-[85vh] w-full max-w-3xl flex flex-col rounded-xl border border-slate-700 bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
              <h3 className="font-semibold text-white">
                {loadingDetail ? 'Đang tải chi tiết...' : `Chi tiết Metrics: ${selectedDetail?.name}`}
              </h3>
              <button onClick={() => setSelectedDetail(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="overflow-y-auto p-6 space-y-4">
              {selectedDetail && (
                <>
                  {selectedDetail.rawResult?.customCounters && (
                    <div className="grid grid-cols-3 gap-3">
                      <div className="rounded-lg bg-emerald-950/30 border border-emerald-800/50 p-3">
                        <div className="text-xs text-emerald-400">Mua thành công (201/202)</div>
                        <div className="text-xl font-bold text-white">{selectedDetail.rawResult.customCounters.flashsale_accepted}</div>
                      </div>
                      <div className="rounded-lg bg-amber-950/30 border border-amber-800/50 p-3">
                        <div className="text-xs text-amber-400">Hết hàng / Từ chối (400/409)</div>
                        <div className="text-xl font-bold text-white">{selectedDetail.rawResult.customCounters.flashsale_rejected}</div>
                      </div>
                      <div className="rounded-lg bg-rose-950/30 border border-rose-800/50 p-3">
                        <div className="text-xs text-rose-400">Lỗi Server / Timeout</div>
                        <div className="text-xl font-bold text-white">{selectedDetail.rawResult.customCounters.flashsale_errors}</div>
                      </div>
                    </div>
                  )}
                  <div>
                    <div className="text-xs font-medium text-slate-400 mb-2">Full k6 Summary JSON (`rawResult`)</div>
                    <pre className="rounded-lg bg-slate-950 p-4 text-xs text-emerald-300 overflow-x-auto border border-slate-800">
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