'use client';

import React, { useState } from 'react';
import {
  Cpu,
  Database,
  Layers,
  ShieldAlert,
  ArrowRight,
  CheckCircle2,
  Gauge,
  Server,
} from 'lucide-react';
import OrderSection from '@/components/OrderSection';
import PerformanceWatcher from '@/components/PerformanceWatcher';

interface StepItem {
  step: string;
  title: string;
  desc: string;
  tech: string;
  color: string;
  image: string;
  fallbackIcon: React.ReactNode;
}

function StepCard({
  item,
  showArrow,
}: {
  item: StepItem;
  showArrow: boolean;
}) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="relative flex flex-col justify-between p-5 rounded-xl bg-white border border-slate-200 shadow-xs hover:border-blue-400 hover:shadow-md transition-all">
      <div>
        {/* Header: STEP + Tech Badge */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-mono font-bold text-slate-400">
            STEP {item.step}
          </span>
          <span
            className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${item.color}`}
          >
            {item.tech}
          </span>
        </div>

        {/* Logo Image + Title */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-center shrink-0 p-1.5 overflow-hidden">
            {!imgError ? (
              <img
                src={item.image}
                alt={item.tech}
                className="w-full h-full object-contain"
                onError={() => setImgError(true)}
              />
            ) : (
              item.fallbackIcon
            )}
          </div>
          <h3 className="text-sm font-bold text-slate-900 leading-snug">
            {item.title}
          </h3>
        </div>

        {/* Description */}
        <p className="text-xs text-slate-600 leading-relaxed">{item.desc}</p>
      </div>

      {/* Mũi tên nối sang bước tiếp theo */}
      {showArrow && (
        <div className="hidden lg:flex absolute -right-3.5 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-white border border-slate-300 items-center justify-center text-blue-600 shadow-sm">
          <ArrowRight className="w-4 h-4" />
        </div>
      )}
    </div>
  );
}

export default function ArchitectureTab() {
  const steps: StepItem[] = [
    {
      step: '01',
      title: 'API Gateway & Auth',
      desc: 'Express + JWT xác thực nhanh token người dùng và kiểm tra định dạng request trước khi chạm vào tầng dữ liệu.',
      tech: 'Node.js / Express',
      color: 'bg-blue-50 text-blue-700 border-blue-200',
      image: '/images/architecture/nodejs.png',
      fallbackIcon: <Server className="w-6 h-6 text-blue-600" />,
    },
    {
      step: '02',
      title: 'Atomic Stock Control',
      desc: 'Thực thi Lua Script đơn luồng trên Redis: kiểm tra trùng user, kiểm tra tồn kho và trừ kho nguyên tử trong < 2ms.',
      tech: 'Redis Lua Script',
      color: 'bg-rose-50 text-rose-700 border-rose-200',
      image: '/images/architecture/redis-lua.png',
      fallbackIcon: <Cpu className="w-6 h-6 text-rose-600" />,
    },
    {
      step: '03',
      title: 'Async Queue Buffering',
      desc: 'Đẩy đơn hàng hợp lệ vào Redis Stream và trả ngay HTTP 201/202 cho khách, giải phóng kết nối tức thì.',
      tech: 'Redis Streams Worker',
      color: 'bg-amber-50 text-amber-700 border-amber-200',
      image: '/images/architecture/redis-streams.png',
      fallbackIcon: <Layers className="w-6 h-6 text-amber-600" />,
    },
    {
      step: '04',
      title: 'Persistent Storage',
      desc: 'Worker nền đọc Stream (XREADGROUP), điều tiết tốc độ ghi để lưu đơn hàng an toàn xuống PostgreSQL và xác nhận XACK.',
      tech: 'PostgreSQL / Prisma',
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      image: '/images/architecture/postgresql.png',
      fallbackIcon: <Database className="w-6 h-6 text-emerald-600" />,
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

        {/* Khung sơ đồ nền chấm nhẹ giống Draw.io */}
        <div
          className="p-4 sm:p-5 rounded-xl border border-slate-200/80"
          style={{
            backgroundColor: '#f8fafc',
            backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)',
            backgroundSize: '18px 18px',
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {steps.map((item, idx) => (
              <StepCard
                key={item.step}
                item={item}
                showArrow={idx < steps.length - 1}
              />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}