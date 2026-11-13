'use client';

import { useState } from 'react';
import { Layers, BarChart3, Terminal } from 'lucide-react';
import ArchitectureTab from '@/components/showcase/ArchitectureTab';
import TestResultsTab from '@/components/showcase/TestResultsTab';
import K6PlaygroundTab from '@/components/showcase/K6PlaygroundTab';

type TabKey = 'architecture' | 'results' | 'k6';

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<TabKey>('architecture');

  const tabs = [
    {
      key: 'architecture' as TabKey,
      label: '1. Kiến trúc & Mô hình',
      icon: Layers,
    },
    {
      key: 'results' as TabKey,
      label: '2. Kết quả Benchmark',
      icon: BarChart3,
    },
    {
      key: 'k6' as TabKey,
      label: '3. Tự chạy Test (k6)',
      icon: Terminal,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between py-4 gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 font-bold text-white shadow-lg shadow-indigo-500/20">
                FS
              </div>
              <div>
                <h1 className="text-base font-bold text-white leading-tight">Flash Sale System</h1>
                <p className="text-xs text-slate-400">Redis Lua • BullMQ • PostgreSQL</p>
              </div>
            </div>

            {/* Navigation Tabs */}
            <nav className="flex space-x-1 rounded-xl bg-slate-900 p-1 border border-slate-800">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs sm:text-sm font-medium transition cursor-pointer ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
        {activeTab === 'architecture' && <ArchitectureTab />}
        {activeTab === 'results' && <TestResultsTab />}
        {activeTab === 'k6' && <K6PlaygroundTab />}
      </main>
    </div>
  );
}