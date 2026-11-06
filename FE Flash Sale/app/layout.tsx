import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import PerformanceWatcher from '@/components/PerformanceWatcher';

const inter = Inter({
  subsets: ['vietnamese'], // Chỉ tải ký tự tiếng Việt, loại bỏ các ngôn ngữ khác
  display: 'swap',
  weight: ['400', '600', '700'], // Chỉ khai báo các độ dày thực sự dùng
});

export const metadata: Metadata = {
  title: 'Flash Sale App',
  description: 'Săn deal chớp nhoáng mỗi ngày',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi"className={`${inter.className}`}>
      <body>
        
        <main className="min-h-screen">
          {children}
        </main>
        {
          <PerformanceWatcher
            autoExpand={false} // Mặc định thu nhỏ thành pill góc dưới
            thresholds={{
              maxWeightKb: 500,       // Quá 500 KB sẽ cảnh báo
              warningWeightKb: 1500,  // Quá 1.5 MB báo lỗi đỏ
              maxLoadTimeMs: 2000,    // Quá 2s load time
              maxTtfbMs: 600,         // Quá 600ms TTFB
              maxFcpMs: 1800,         // FCP
              maxLcpMs: 2500,         // LCP
              maxCls: 0.1,            // Layout shift
              maxRequests: 30,        // Giới hạn 30 requests
            }}
          />}
      </body>
    </html>
  );
}