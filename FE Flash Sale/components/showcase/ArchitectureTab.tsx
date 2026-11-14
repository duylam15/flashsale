'use client';

import React from 'react';
import {
  Cpu,
  Database,
  Layers,
  ShieldAlert,
  ArrowRight,
  CheckCircle2,
  Gauge,
} from 'lucide-react';
import OrderSection from '@/components/OrderSection';
import PerformanceWatcher from '@/components/PerformanceWatcher';

export default function ArchitectureTab() {
  const steps = [
    {
      step: '01',
      title: 'API Gateway & Auth',
      desc: 'Express + JWT xác thực nhanh token người dùng và kiểm tra định dạng request trước khi chạm vào tầng dữ liệu.',
      tech: 'Node.js / Express',
      color: 'bg-blue-50 text-blue-700 border-blue-200',
    },
    {
      step: '02',
      title: 'Atomic Stock Control',
      desc: 'Thực thi Lua Script đơn luồng trên Redis: kiểm tra trùng user, kiểm tra tồn kho và trừ kho nguyên tử trong < 1ms.',
      tech: 'Redis Lua Script',
      color: 'bg-rose-50 text-rose-700 border-rose-200',
    },
    {
      step: '03',
      title: 'Async Queue Buffering',
      desc: 'Đẩy đơn hàng hợp lệ vào hàng đợi BullMQ và trả ngay HTTP 201/202 cho khách, giải phóng kết nối tức thì.',
      tech: 'BullMQ Worker',
      color: 'bg-amber-50 text-amber-700 border-amber-200',
    },
    {
      step: '04',
      title: 'Persistent Storage',
      desc: 'Worker nền điều tiết tốc độ ghi (concurrency control) để lưu đơn hàng an toàn xuống PostgreSQL mà không sập Connection Pool.',
      tech: 'PostgreSQL / Prisma',
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Key Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium uppercase tracking-wider">
            <span>Tải chịu đựng (VPS)</span>
            <Gauge className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">1,000 VUs</span>
            <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              1 vCPU / 2GB
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            100% request được xử lý hợp lệ
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium uppercase tracking-wider">
            <span>Độ trễ trừ kho Redis</span>
            <Cpu className="w-4 h-4 text-rose-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">&lt; 2 ms</span>
            <span className="text-xs font-medium text-slate-600">Atomic</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Loại bỏ hoàn toàn Race Condition
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium uppercase tracking-wider">
            <span>Tỷ lệ bán lố (Oversell)</span>
            <ShieldAlert className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-600">0.00%</span>
            <span className="text-xs font-medium text-slate-600">
              Tuyệt đối
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Chặn chính xác tại ngưỡng Stock
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium uppercase tracking-wider">
            <span>Tối ưu tầng mạng</span>
            <Database className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">65,535</span>
            <span className="text-xs font-medium text-slate-600">
              SYN Backlog
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Kernel tuning & Host networking
          </p>
        </div>
      </div>

      {/* System Pipeline Flow */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="mb-6">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-600" />
            Luồng xử lý bất đồng bộ (High-Throughput Pipeline)
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Tách biệt luồng tranh chấp tồn kho tốc độ cao trên RAM khỏi tiến trình ghi đĩa PostgreSQL.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {steps.map((item, idx) => (
            <div
              key={item.step}
              className="relative flex flex-col justify-between p-5 rounded-xl bg-slate-50/80 border border-slate-200/80 hover:border-blue-300 hover:bg-white transition-all"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-mono font-bold text-slate-400">
                    STEP {item.step}
                  </span>
                  <span
                    className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${item.color}`}
                  >
                    {item.tech}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 mb-2">
                  {item.title}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {item.desc}
                </p>
              </div>

              {idx < steps.length - 1 && (
                <div className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-6 h-6 rounded-full bg-white border border-slate-200 items-center justify-center text-slate-400 shadow-xs">
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Interactive Live Order & Watcher Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Trải nghiệm đặt hàng trực tiếp (Live Flash Sale)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Gửi request thực tế tới API Backend trên VPS
              </p>
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Ready
            </span>
          </div>
        </div>

        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="mb-4 pb-3 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900">
              Giám sát tồn kho & Hàng đợi thời gian thực
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Đối chiếu số liệu Redis Cache và PostgreSQL
            </p>
          </div>
          <PerformanceWatcher />
        </div>
      </div>
    </div>
  );
}