'use client';

import React, { Suspense } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import {
  Zap,
  Layers,
  BarChart3,
  Terminal,
  Server,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';
import ArchitectureTab from '@/components/showcase/ArchitectureTab';
import TestResultsTab from '@/components/showcase/TestResultsTab';
import K6PlaygroundTab from '@/components/showcase/K6PlaygroundTab';

type TabKey = 'architecture' | 'results' | 'playground';

const TABS: { id: TabKey; label: string; icon: React.ReactNode; badge?: string }[] = [
  {
    id: 'architecture',
    label: 'Kiến trúc & Live Demo',
    icon: <Layers className="w-4 h-4" />,
  },
  {
    id: 'results',
    label: 'Lịch sử Load Test',
    icon: <BarChart3 className="w-4 h-4" />,
    badge: '1,000+ VUs',
  },
  {
    id: 'playground',
    label: 'K6 Script & Hướng dẫn',
    icon: <Terminal className="w-4 h-4" />,
  },
];

function ShowcaseContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Đọc tab hiện tại từ URL (?tab=...), mặc định là 'architecture'
  const rawTab = searchParams.get('tab') as TabKey | null;
  const activeTab: TabKey =
    rawTab && ['architecture', 'results', 'playground'].includes(rawTab)
      ? rawTab
      : 'architecture';

  const handleTabChange = (tabId: TabKey) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tabId);
    // Cập nhật URL không làm giật trang, giữ lịch sử trình duyệt để Back/Forward & F5
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-4 gap-3">
            {/* Brand & Title */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm shadow-blue-600/20">
                <Zap className="w-5 h-5 fill-current" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold tracking-tight text-slate-900">
                    Flash Sale Engine
                  </h1>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Live on VPS
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Node.js • Redis Atomic Lua • BullMQ • PostgreSQL
                </p>
              </div>
            </div>

            {/* Infrastructure Specs Pill */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 font-medium">
                <Server className="w-3.5 h-3.5 text-slate-500" />
                <span>VPS: 1 vCPU / 2GB RAM</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                <span>0% Overselling</span>
              </div>
              <a
                href="http://157.66.219.33:4000/v1/docs"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-medium transition-colors"
              >
                <span>API Docs</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </a>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex space-x-1 overflow-x-auto -mb-px" aria-label="Tabs">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`group inline-flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'border-blue-600 text-blue-600 bg-blue-50/40'
                      : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                  }`}
                >
                  <span
                    className={
                      isActive
                        ? 'text-blue-600'
                        : 'text-slate-400 group-hover:text-slate-600'
                    }
                  >
                    {tab.icon}
                  </span>
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span
                      className={`px-2 py-0.5 text-[11px] rounded-full font-semibold ${
                        isActive
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'architecture' && <ArchitectureTab />}
        {activeTab === 'results' && <TestResultsTab />}
        {activeTab === 'playground' && <K6PlaygroundTab />}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-5 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <p>High-Concurrency Flash Sale Benchmark & Architecture Showcase</p>
          <p className="font-mono text-slate-400">
            Target VPS: 157.66.219.33:4000
          </p>
        </div>
      </footer>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 text-sm">
          Đang tải giao diện hệ thống...
        </div>
      }
    >
      <ShowcaseContent />
    </Suspense>
  );
}