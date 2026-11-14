'use client';

import React, { useState } from 'react';
import { Copy, Check, Terminal, Play, Info } from 'lucide-react';

const K6_SCRIPT_CONTENT = `import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://157.66.219.33:4000/v1';
const TOTAL_USERS = Number(__ENV.TOTAL_USERS || 1000);
const FLASH_SALE_STOCK = Number(__ENV.FLASH_SALE_STOCK || 500);
const JITTER = Number(__ENV.JITTER || 3);

const accepted = new Counter('flashsale_accepted');
const rejected = new Counter('flashsale_rejected');
const errors = new Counter('flashsale_errors');

export const options = {
  scenarios: {
    flash_sale_spike: {
      executor: 'per-vu-iterations',
      vus: TOTAL_USERS,
      iterations: 1,
      maxDuration: '2m',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<2000'],
  },
};

export function setup() {
  http.post(\`\${BASE_URL}/orders/warmup-cache\`, JSON.stringify({
    productIds: [1],
    stock: FLASH_SALE_STOCK,
  }), { headers: { 'Content-Type': 'application/json' } });

  const res = http.post(\`\${BASE_URL}/auth/generate-tokens\`, JSON.stringify({
    count: TOTAL_USERS,
    startId: 1,
  }), { headers: { 'Content-Type': 'application/json' } });

  return { users: res.json('data.users') };
}

export default function (data) {
  if (JITTER > 0) sleep(Math.random() * JITTER);
  const user = data.users[__VU - 1];

  const res = http.post(\`\${BASE_URL}/orders/flash-sale\`, JSON.stringify({
    productId: 1,
    quantity: 1,
  }), {
    headers: {
      'Content-Type': 'application/json',
      Authorization: \`Bearer \${user.token}\`,
    },
  });

  if (res.status === 201 || res.status === 202) accepted.add(1);
  else if (res.status === 400 || res.status === 409) rejected.add(1);
  else errors.add(1);

  check(res, {
    'Handled Properly': (r) => [201, 202, 400, 409].includes(r.status),
  });
}`;

export default function K6PlaygroundTab() {
  const [copiedCmd, setCopiedCmd] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const cliCommand = `k6 run -e BASE_URL=http://157.66.219.33:4000/v1 -e TOTAL_USERS=1000 -e FLASH_SALE_STOCK=500 -e JITTER=3 ./flashtestk6vps.js`;

  const copyToClipboard = (text: string, type: 'cmd' | 'code') => {
    navigator.clipboard.writeText(text);
    if (type === 'cmd') {
      setCopiedCmd(true);
      setTimeout(() => setCopiedCmd(false), 2000);
    } else {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Guide Box */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-blue-50 text-blue-600 mt-0.5">
            <Info className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Hướng dẫn tự chạy Load Test kiểm chứng
            </h2>
            <p className="text-sm text-slate-600 mt-1 leading-relaxed">
              Kịch bản dưới đây tự động nạp tồn kho vào Redis (<code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded font-mono text-slate-800">/warmup-cache</code>), sinh 1,000 JWT tokens (<code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded font-mono text-slate-800">/generate-tokens</code>) và bắn đồng thời vào VPS. Sau khi chạy xong, kết quả sẽ tự động xuất hiện ở tab <strong>Lịch sử Load Test</strong>.
            </p>
          </div>
        </div>

        {/* CLI Command Card */}
        <div className="mt-5">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
            1. Lệnh chạy nhanh trên Terminal (Đã cài đặt Grafana k6)
          </label>
          <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto">
            <div className="flex items-center gap-2.5 whitespace-nowrap">
              <Play className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>{cliCommand}</span>
            </div>
            <button
              onClick={() => copyToClipboard(cliCommand, 'cmd')}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-sans font-medium transition-colors shrink-0 cursor-pointer"
            >
              {copiedCmd ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Đã chép</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy lệnh</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* K6 Script Viewer */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-slate-600" />
            <span className="text-sm font-bold text-slate-800 font-mono">
              flashtestk6vps.js
            </span>
          </div>
          <button
            onClick={() => copyToClipboard(K6_SCRIPT_CONTENT, 'code')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-medium transition-colors cursor-pointer"
          >
            {copiedCode ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-600">Đã chép code</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Script</span>
              </>
            )}
          </button>
        </div>

        <pre className="p-6 text-xs font-mono text-slate-800 bg-slate-50/40 overflow-x-auto leading-relaxed">
          <code>{K6_SCRIPT_CONTENT}</code>
        </pre>
      </div>
    </div>
  );
}