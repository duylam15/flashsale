'use client';

import React, { useEffect, useState } from 'react';

export interface MetricThresholds {
  maxWeightKb: number;       // Chuẩn vàng: < 500 KB
  warningWeightKb: number;   // Ngưỡng đỏ: > 1500 KB
  maxLoadTimeMs: number;     // Chuẩn load: < 2000 ms
  maxTtfbMs: number;         // Chuẩn TTFB: < 600 ms
  maxFcpMs: number;          // Chuẩn FCP: < 1800 ms
  maxLcpMs: number;          // Chuẩn LCP: < 2500 ms
  maxCls: number;            // Chuẩn CLS: < 0.1
  maxRequests: number;       // Chuẩn requests: < 35
}

const DEFAULT_THRESHOLDS: MetricThresholds = {
  maxWeightKb: 500,
  warningWeightKb: 1500,
  maxLoadTimeMs: 2500,
  maxTtfbMs: 600,
  maxFcpMs: 1800,
  maxLcpMs: 2500,
  maxCls: 0.1,
  maxRequests: 35,
};

interface ResourceBreakdown {
  [type: string]: { count: number; sizeKb: number };
}

interface ComprehensivePerfData {
  // Page Size & Requests
  totalTransferredKb: number;
  totalDecodedKb: number;
  requestCount: number;
  breakdown: ResourceBreakdown;

  // Timeline & Timings (ms)
  ttfb: number;
  domContentLoaded: number;
  loadTime: number;

  // Web Vitals
  fcp: number;
  lcp: number;
  cls: number;

  // Alerts & Diagnostics
  warnings: string[];
  heavyResources: { name: string; sizeKb: number; type: string }[];
  uncompressedCount: number;
}

export default function PerformanceWatcher({
  thresholds = DEFAULT_THRESHOLDS,
  autoExpand = false,
}: {
  thresholds?: MetricThresholds;
  autoExpand?: boolean;
}) {
  const [data, setData] = useState<ComprehensivePerfData | null>(null);
  const [isOpen, setIsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'breakdown' | 'issues'>('overview');
  const [isMinimized, setIsMinimized] = useState(!autoExpand);

  useEffect(() => {
    // Chỉ chạy trên browser
    if (typeof window === 'undefined' || !window.performance) return;

    let clsValue = 0;
    let lcpValue = 0;
    let fcpValue = 0;

    // 1. Lắng nghe FCP
    const fcpObserver = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntriesByName('first-contentful-paint')) {
        fcpValue = Math.round(entry.startTime);
      }
    });
    try {
      fcpObserver.observe({ type: 'paint', buffered: true });
    } catch (_) {}

    // 2. Lắng nghe LCP
    const lcpObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const lastEntry = entries[entries.length - 1];
      if (lastEntry) {
        lcpValue = Math.round(lastEntry.startTime);
      }
    });
    try {
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch (_) {}

    // 3. Lắng nghe CLS
    const clsObserver = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries() as any[]) {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      }
    });
    try {
      clsObserver.observe({ type: 'layout-shift', buffered: true });
    } catch (_) {}

    // 4. Đo lường toàn diện sau khi window load hoàn tất
    const collectMetrics = () => {
      setTimeout(() => {
        const [nav] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
        const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];

        const ttfb = nav ? Math.round(nav.responseStart - nav.requestStart) : 0;
        const domContentLoaded = nav ? Math.round(nav.domContentLoadedEventEnd - nav.startTime) : 0;
        const loadTime = nav ? Math.round(nav.loadEventEnd - nav.startTime) : 0;

        let totalTransferredBytes = nav?.transferSize || 0;
        let totalDecodedBytes = nav?.decodedBodySize || 0;
        const breakdown: ResourceBreakdown = {};
        const heavyResources: { name: string; sizeKb: number; type: string }[] = [];
        let uncompressedCount = 0;

        resources.forEach((r) => {
          const trans = r.transferSize || 0;
          const decoded = r.decodedBodySize || 0;
          totalTransferredBytes += trans;
          totalDecodedBytes += decoded;

          const type = r.initiatorType || 'other';
          if (!breakdown[type]) {
            breakdown[type] = { count: 0, sizeKb: 0 };
          }
          breakdown[type].count += 1;
          breakdown[type].sizeKb += trans / 1024;

          // Bắt các file quá nặng (> 150 KB)
          if (trans > 150 * 1024) {
            heavyResources.push({
              name: r.name.split('/').pop()?.split('?')[0] || r.name,
              sizeKb: Math.round(trans / 1024),
              type,
            });
          }

          // Kiểm tra tài nguyên text chưa nén (> 5 KB và transferSize xấp xỉ decodedSize)
          if (
            ['script', 'css', 'fetch', 'xmlhttprequest'].includes(type) &&
            decoded > 5120 &&
            trans >= decoded * 0.9
          ) {
            uncompressedCount++;
          }
        });

        const totalTransferredKb = Math.round(totalTransferredBytes / 1024);
        const totalDecodedKb = Math.round(totalDecodedBytes / 1024);
        const requestCount = resources.length + 1;
        const warnings: string[] = [];

        // Kiểm tra vi phạm ngưỡng
        if (totalTransferredKb > thresholds.warningWeightKb) {
          warnings.push(`Page Weight (${totalTransferredKb} KB) vượt mức NGUY HIỂM (> ${thresholds.warningWeightKb} KB).`);
        } else if (totalTransferredKb > thresholds.maxWeightKb) {
          warnings.push(`Page Weight (${totalTransferredKb} KB) vượt chuẩn lý tưởng (> ${thresholds.maxWeightKb} KB).`);
        }

        if (loadTime > thresholds.maxLoadTimeMs) {
          warnings.push(`Load Time (${loadTime} ms) chậm hơn quy định (< ${thresholds.maxLoadTimeMs} ms).`);
        }

        if (ttfb > thresholds.maxTtfbMs) {
          warnings.push(`TTFB (${ttfb} ms) phản hồi server chậm (< ${thresholds.maxTtfbMs} ms).`);
        }

        if (lcpValue > thresholds.maxLcpMs) {
          warnings.push(`LCP (${lcpValue} ms) tải khối nội dung chính quá chậm (< ${thresholds.maxLcpMs} ms).`);
        }

        if (clsValue > thresholds.maxCls) {
          warnings.push(`CLS (${clsValue.toFixed(3)}) có độ giật layout lớn (< ${thresholds.maxCls}).`);
        }

        if (requestCount > thresholds.maxRequests) {
          warnings.push(`Số lượng request (${requestCount}) hơi cao (< ${thresholds.maxRequests}).`);
        }

        if (uncompressedCount > 0) {
          warnings.push(`Có ${uncompressedCount} file text có dấu hiệu chưa bật nén GZIP/Brotli!`);
        }

        setData({
          totalTransferredKb,
          totalDecodedKb,
          requestCount,
          breakdown,
          ttfb,
          domContentLoaded,
          loadTime,
          fcp: fcpValue,
          lcp: lcpValue,
          cls: Number(clsValue.toFixed(3)),
          warnings,
          heavyResources,
          uncompressedCount,
        });

        // Debug Console Group
        console.groupCollapsed(`⚡ [PERF AUDIT]: ${totalTransferredKb} KB | Load: ${loadTime}ms | LCP: ${lcpValue}ms`);
        console.log('Metrics:', { ttfb, fcp: fcpValue, lcp: lcpValue, cls: clsValue, loadTime });
        console.table(breakdown);
        if (warnings.length > 0) console.warn('Cảnh báo:', warnings);
        console.groupEnd();
      }, 800);
    };

    if (document.readyState === 'complete') {
      collectMetrics();
    } else {
      window.addEventListener('load', collectMetrics);
      return () => {
        window.removeEventListener('load', collectMetrics);
        fcpObserver.disconnect();
        lcpObserver.disconnect();
        clsObserver.disconnect();
      };
    }
  }, [thresholds]);

  if (!data || !isOpen) return null;

  const hasIssues = data.warnings.length > 0;

  // Mini badge khi thu nhỏ
  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-[9999] font-sans">
        <button
          onClick={() => setIsMinimized(false)}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-full shadow-xl border text-xs font-bold transition-all hover:scale-105 active:scale-95 ${
            hasIssues
              ? 'bg-amber-500 text-white border-amber-600'
              : 'bg-emerald-600 text-white border-emerald-700'
          }`}
        >
          <span>{hasIssues ? '⚠️' : '⚡'}</span>
          <span>{data.totalTransferredKb} KB</span>
          <span>•</span>
          <span>{data.loadTime} ms</span>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-[9999] w-96 max-w-[calc(100vw-2rem)] font-sans text-xs shadow-2xl rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 overflow-hidden backdrop-blur-md">
      {/* Header */}
      <div
        className={`px-4 py-3 flex items-center justify-between font-bold border-b ${
          hasIssues
            ? 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400'
            : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
        }`}
      >
        <div className="flex items-center gap-2">
          <span>{hasIssues ? '⚠️ Cần tối ưu' : '⚡ Hiệu năng chuẩn'}</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-mono">
            {data.requestCount} reqs
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMinimized(true)}
            className="hover:text-gray-900 dark:hover:text-white px-1 text-base leading-none"
            title="Thu nhỏ"
          >
            ─
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="hover:text-gray-900 dark:hover:text-white px-1 text-base leading-none"
            title="Đóng"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 text-[11px]">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex-1 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'overview'
              ? 'border-blue-600 text-blue-600 font-bold dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          Tổng quan
        </button>
        <button
          onClick={() => setActiveTab('breakdown')}
          className={`flex-1 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'breakdown'
              ? 'border-blue-600 text-blue-600 font-bold dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          Phân loại ({Object.keys(data.breakdown).length})
        </button>
        <button
          onClick={() => setActiveTab('issues')}
          className={`flex-1 py-2 font-medium border-b-2 transition-colors relative ${
            activeTab === 'issues'
              ? 'border-blue-600 text-blue-600 font-bold dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          Vấn đề {data.warnings.length > 0 && `(${data.warnings.length})`}
        </button>
      </div>

      {/* Body Content */}
      <div className="p-4 max-h-80 overflow-y-auto space-y-3">
        {activeTab === 'overview' && (
          <div className="space-y-3">
            {/* Core Metrics Grid */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800">
                <span className="text-gray-400 block text-[10px] uppercase font-semibold">Page Weight</span>
                <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                  {data.totalTransferredKb} KB
                </span>
                <span className="text-[10px] text-gray-400 block">Raw: {data.totalDecodedKb} KB</span>
              </div>

              <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800">
                <span className="text-gray-400 block text-[10px] uppercase font-semibold">Load Time</span>
                <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                  {data.loadTime} ms
                </span>
                <span className="text-[10px] text-gray-400 block">DOM: {data.domContentLoaded} ms</span>
              </div>

              <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800">
                <span className="text-gray-400 block text-[10px] uppercase font-semibold">TTFB (Server)</span>
                <span className={`text-sm font-bold ${data.ttfb > thresholds.maxTtfbMs ? 'text-amber-500' : 'text-emerald-500'}`}>
                  {data.ttfb} ms
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800">
                <span className="text-gray-400 block text-[10px] uppercase font-semibold">LCP (Render chính)</span>
                <span className={`text-sm font-bold ${data.lcp > thresholds.maxLcpMs ? 'text-amber-500' : 'text-emerald-500'}`}>
                  {data.lcp || data.fcp || 'N/A'} ms
                </span>
              </div>
            </div>

            {/* Vitals Footer Info */}
            <div className="flex justify-between items-center px-1 text-[11px] text-gray-500">
              <span>FCP: <b>{data.fcp} ms</b></span>
              <span>CLS: <b>{data.cls}</b></span>
              <span>Requests: <b>{data.requestCount}</b></span>
            </div>
          </div>
        )}

        {activeTab === 'breakdown' && (
          <div className="space-y-2">
            {Object.entries(data.breakdown)
              .sort((a, b) => b[1].sizeKb - a[1].sizeKb)
              .map(([type, stat]) => {
                const percent = data.totalTransferredKb > 0 ? (stat.sizeKb / data.totalTransferredKb) * 100 : 0;
                return (
                  <div key={type} className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="font-semibold uppercase">{type} ({stat.count})</span>
                      <span className="text-gray-500">{stat.sizeKb.toFixed(1)} KB ({percent.toFixed(0)}%)</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-800 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-blue-500 h-full rounded-full" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })}
          </div>
        )}

        {activeTab === 'issues' && (
          <div className="space-y-3">
            {data.warnings.length === 0 && data.heavyResources.length === 0 ? (
              <div className="text-center py-4 text-emerald-500 font-medium">
                🎉 Không phát hiện vấn đề hiệu năng nào!
              </div>
            ) : (
              <>
                {data.warnings.map((warn, i) => (
                  <div key={i} className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 flex gap-2">
                    <span>⚠️</span>
                    <span>{warn}</span>
                  </div>
                ))}

                {data.heavyResources.length > 0 && (
                  <div className="mt-2">
                    <span className="font-semibold text-gray-500 block mb-1">Tài nguyên nặng ({'>'}150 KB):</span>
                    <div className="space-y-1">
                      {data.heavyResources.map((res, i) => (
                        <div key={i} className="flex justify-between p-1.5 rounded bg-gray-50 dark:bg-gray-800/50 text-[10px] font-mono">
                          <span className="truncate max-w-[200px]" title={res.name}>{res.name}</span>
                          <span className="font-bold text-red-500">{res.sizeKb} KB</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}