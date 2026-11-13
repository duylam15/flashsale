'use client';

import { Server, Database, Zap, ShieldCheck, Cpu, ArrowRight, Layers } from 'lucide-react';

export default function ArchitectureTab() {
  return (
    <div className="space-y-8">
      {/* Hero Banner */}
      <div className="rounded-xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 p-6 md:p-8">
        <div className="inline-flex items-center gap-2 rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-400 border border-indigo-500/20 mb-4">
          <Zap className="h-3.5 w-3.5" /> High-Concurrency Flash Sale Engine
        </div>
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
          Kiến trúc Xử lý Đồng thời Cao & Chống Bán Lố (Zero Overselling)
        </h2>
        <p className="text-slate-400 max-w-3xl leading-relaxed">
          Hệ thống giải quyết bài toán hàng nghìn người dùng tranh mua một số lượng tồn kho giới hạn tại cùng một mili-giây. 
          Tách biệt hoàn toàn luồng kiểm tra/trừ kho tốc độ cao trên RAM (Redis) và luồng ghi nhận đơn hàng bền vững xuống ổ đĩa (PostgreSQL).
        </p>

        {/* 3 Key Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="rounded-lg bg-slate-950/60 border border-slate-800 p-4">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold mb-1">
              <ShieldCheck className="h-5 w-5" /> Atomic Lua Script
            </div>
            <p className="text-xs text-slate-400">
              Kiểm tra giới hạn user & trừ tồn kho trên Redis thực thi đơn luồng nguyên tử (Atomic), loại bỏ 100% Race Condition.
            </p>
          </div>
          <div className="rounded-lg bg-slate-950/60 border border-slate-800 p-4">
            <div className="flex items-center gap-2 text-amber-400 font-semibold mb-1">
              <Layers className="h-5 w-5" /> Asynchronous Queue
            </div>
            <p className="text-xs text-slate-400">
              Trả phản hồi HTTP 202 ngay lập tức sau khi giữ slot trên Redis. Worker đẩy job tạo Order xuống PostgreSQL theo batch/queue.
            </p>
          </div>
          <div className="rounded-lg bg-slate-950/60 border border-slate-800 p-4">
            <div className="flex items-center gap-2 text-sky-400 font-semibold mb-1">
              <Cpu className="h-5 w-5" /> Distributed Load Test
            </div>
            <p className="text-xs text-slate-400">
              Tách biệt máy phát tải (k6) và Server xử lý (VPS) để đảm bảo kết quả benchmark phản ánh đúng năng lực chịu tải thực tế.
            </p>
          </div>
        </div>
      </div>

      {/* Sơ đồ luồng xử lý (Request Flow) */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
        <h3 className="text-lg font-semibold text-white mb-6">Luồng xử lý Request (System Flow)</h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-center">
          {/* Step 1 */}
          <div className="rounded-lg border border-slate-700 bg-slate-950 p-4 text-center">
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
              <Zap className="h-5 w-5" />
            </div>
            <div className="font-semibold text-sm text-white">1. Client / k6 Spike</div>
            <div className="text-xs text-slate-400 mt-1">3,000+ VUs bắn đồng thời POST /orders/flash-sale</div>
          </div>

          <div className="hidden lg:flex justify-center text-slate-600">
            <ArrowRight className="h-6 w-6" />
          </div>

          {/* Step 2 */}
          <div className="rounded-lg border border-rose-500/30 bg-rose-950/10 p-4 text-center">
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-rose-500/10 text-rose-400">
              <Server className="h-5 w-5" />
            </div>
            <div className="font-semibold text-sm text-white">2. API + Redis Lua</div>
            <div className="text-xs text-slate-400 mt-1">Check userLimit & DECR stock. Hết hàng trả 409 ngay trong &lt;5ms</div>
          </div>

          <div className="hidden lg:flex justify-center text-slate-600">
            <ArrowRight className="h-6 w-6" />
          </div>

          {/* Step 3 */}
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/10 p-4 text-center">
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
              <Database className="h-5 w-5" />
            </div>
            <div className="font-semibold text-sm text-white">3. Queue & Postgres</div>
            <div className="text-xs text-slate-400 mt-1">Worker tiêu thụ Queue, ghi Order & đồng bộ Inventory an toàn</div>
          </div>
        </div>
      </div>

      {/* Tech Stack */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <h3 className="text-base font-semibold text-white mb-4">Backend & Infrastructure (VPS)</h3>
          <ul className="space-y-2.5 text-sm text-slate-300">
            <li className="flex justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400">Runtime & Framework</span>
              <span className="font-mono text-indigo-400">Node.js / Express / TypeScript</span>
            </li>
            <li className="flex justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400">In-Memory Lock & Queue</span>
              <span className="font-mono text-rose-400">Redis (Lua Script + Worker)</span>
            </li>
            <li className="flex justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400">Primary Database</span>
              <span className="font-mono text-sky-400">PostgreSQL + Prisma ORM</span>
            </li>
            <li className="flex justify-between">
              <span className="text-slate-400">Benchmark Tool</span>
              <span className="font-mono text-emerald-400">Grafana k6 (Auto-report to DB)</span>
            </li>
          </ul>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <h3 className="text-base font-semibold text-white mb-4">Kịch bản kiểm thử (Test Scenarios)</h3>
          <ul className="space-y-3 text-sm text-slate-400">
            <li>
              <strong className="text-slate-200">• Spike Test (Chịu tải đột biến):</strong> Giả lập hàng nghìn user vào mua cùng 1 giây đầu tiên mở bán.
            </li>
            <li>
              <strong className="text-slate-200">• Contention Test (Tranh chấp tồn kho):</strong> Số lượng VUs lớn hơn nhiều lần Stock thực tế (VD: 3,000 VUs tranh 100 sản phẩm) để chứng minh không âm kho.
            </li>
            <li>
              <strong className="text-slate-200">• End-to-End Telemetry:</strong> Kết quả k6 sau khi chạy xong tự động đẩy qua API <code className="text-xs bg-slate-800 px-1.5 py-0.5 rounded">POST /v1/load-test-results</code>.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}