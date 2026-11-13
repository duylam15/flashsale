'use client';

import { useState } from 'react';
import { Copy, Check, Download, Terminal, Sparkles } from 'lucide-react';

export default function K6PlaygroundTab() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/v1';

  const [vus, setVus] = useState(500);
  const [stock, setStock] = useState(100);
  const [testName, setTestName] = useState('Recruiter Live Test');
  const [copiedCmd, setCopiedCmd] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);

  const k6ScriptContent = `import http from 'k6/http';
import { check } from 'k6';
import { Counter } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || '${API_URL}';
const TOTAL_USERS = Number(__ENV.TOTAL_USERS || ${vus});
const PRODUCT_ID = Number(__ENV.PRODUCT_ID || 1);
const START_ID = Number(__ENV.START_ID || 1);
const FLASH_SALE_STOCK = Number(__ENV.FLASH_SALE_STOCK || ${stock});

const accepted = new Counter('flashsale_accepted');
const rejected = new Counter('flashsale_rejected');
const errors = new Counter('flashsale_errors');

export const options = {
  setupTimeout: '5m',
  scenarios: {
    flash_sale_spike: {
      executor: 'per-vu-iterations',
      vus: TOTAL_USERS,
      iterations: 1,
      maxDuration: '5m',
    },
  },
};

export function setup() {
  const warmupRes = http.post(
    \`\${BASE_URL}/orders/warmup-cache\`,
    JSON.stringify({ productIds: [PRODUCT_ID], stock: FLASH_SALE_STOCK }),
    { headers: { 'Content-Type': 'application/json' }, timeout: '60s' }
  );
  if (warmupRes.status !== 200) throw new Error(\`Warmup failed: \${warmupRes.status}\`);

  const tokenRes = http.post(
    \`\${BASE_URL}/auth/generate-tokens\`,
    JSON.stringify({ count: TOTAL_USERS, startId: START_ID }),
    { headers: { 'Content-Type': 'application/json' }, timeout: '60s' }
  );
  if (tokenRes.status !== 200) throw new Error(\`Generate tokens failed: \${tokenRes.status}\`);

  return { users: tokenRes.json('data.users') };
}

export default function (data) {
  const user = data.users[__VU - 1];
  if (!user || !user.token) {
    errors.add(1);
    return;
  }

  const res = http.post(
    \`\${BASE_URL}/orders/flash-sale\`,
    JSON.stringify({ productId: PRODUCT_ID, quantity: 1 }),
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: \`Bearer \${user.token}\`,
      },
      timeout: '30s',
    }
  );

  if (res.status === 201 || res.status === 202) accepted.add(1);
  else if (res.status === 400 || res.status === 409) rejected.add(1);
  else errors.add(1);

  check(res, {
    'Valid Response': (r) => [201, 202, 400, 409].includes(r.status),
  });
}

export function handleSummary(data) {
  const metrics = data.metrics;
  const acceptedCount = metrics.flashsale_accepted?.values?.count || 0;
  const rejectedCount = metrics.flashsale_rejected?.values?.count || 0;
  const errorCount = metrics.flashsale_errors?.values?.count || 0;

  const payload = {
    name: __ENV.TEST_NAME || '${testName}',
    description: \`External k6 test: \${TOTAL_USERS} VUs tranh \${FLASH_SALE_STOCK} slots\`,
    tool: 'K6',
    status: 'COMPLETED',
    targetEndpoint: 'POST /orders/flash-sale',
    vus: TOTAL_USERS,
    durationSeconds: Math.round((data.state?.testRunDurationMs || 0) / 1000),
    totalRequests: metrics.http_reqs?.values?.count || 0,
    successCount: acceptedCount + rejectedCount,
    failedCount: errorCount,
    rps: Number((metrics.http_reqs?.values?.rate || 0).toFixed(2)),
    p95LatencyMs: Number((metrics.http_req_duration?.values['p(95)'] || 0).toFixed(2)),
    p99LatencyMs: metrics.http_req_duration?.values['p(99)']
      ? Number(metrics.http_req_duration.values['p(99)'].toFixed(2))
      : null,
    rawResult: {
      customCounters: {
        flashsale_accepted: acceptedCount,
        flashsale_rejected: rejectedCount,
        flashsale_errors: errorCount,
      },
      metrics: data.metrics,
    },
  };

  http.post(\`\${BASE_URL}/load-test-results\`, JSON.stringify(payload), {
    headers: { 'Content-Type': 'application/json' },
  });

  return {
    stdout: JSON.stringify(payload.rawResult.customCounters, null, 2) + '\\n',
  };
}`;

  const cliCommand = `k6 run -e BASE_URL=${API_URL} -e TOTAL_USERS=${vus} -e FLASH_SALE_STOCK=${stock} -e TEST_NAME="${testName}" flash-sale.k6.js`;

  const copyText = (text: string, type: 'cmd' | 'script') => {
    navigator.clipboard.writeText(text);
    if (type === 'cmd') {
      setCopiedCmd(true);
      setTimeout(() => setCopiedCmd(false), 2000);
    } else {
      setCopiedScript(true);
      setTimeout(() => setCopiedScript(false), 2000);
    }
  };

  const downloadScript = () => {
    const blob = new Blob([k6ScriptContent], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'flash-sale.k6.js';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
        <div className="flex items-center gap-2 text-indigo-400 text-sm font-medium mb-2">
          <Sparkles className="h-4 w-4" /> Trải nghiệm thực tế dành cho Nhà tuyển dụng
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Tự chạy Load Test từ máy cá nhân của bạn</h2>
        <p className="text-sm text-slate-400">
          Bạn có thể cấu hình số lượng người dùng đồng thời (VUs) và tồn kho bên dưới, tải file script k6 về máy và chạy. 
          Sau khi chạy xong, kết quả sẽ tự động được đẩy lên VPS và hiển thị ngay tại <strong className="text-slate-200">Tab 2: Kết quả Test</strong>.
        </p>

        {/* Form cấu hình nhanh */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Số lượng Virtual Users (VUs)</label>
            <input
              type="number"
              min={10}
              max={5000}
              value={vus}
              onChange={(e) => setVus(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Tồn kho Flash Sale (Stock)</label>
            <input
              type="number"
              min={1}
              max={5000}
              value={stock}
              onChange={(e) => setStock(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Tên phiên Test (Hiển thị trên BXH)</label>
            <input
              type="text"
              value={testName}
              onChange={(e) => setTestName(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Bước 1 & 2: Tải file và chạy lệnh */}
        <div className="mt-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950 p-4">
            <div>
              <div className="text-sm font-medium text-white">Bước 1: Tải file script k6 đã cấu hình sẵn</div>
              <div className="text-xs text-slate-400">Yêu cầu máy đã cài sẵn Grafana k6 (winget install k6 hoặc brew install k6)</div>
            </div>
            <button
              onClick={downloadScript}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition cursor-pointer"
            >
              <Download className="h-4 w-4" /> Tải flash-sale.k6.js
            </button>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-sm font-medium text-white">
                <Terminal className="h-4 w-4 text-indigo-400" /> Bước 2: Chạy lệnh sau trong Terminal
              </div>
              <button
                onClick={() => copyText(cliCommand, 'cmd')}
                className="inline-flex items-center gap-1.5 rounded bg-slate-800 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-700 cursor-pointer"
              >
                {copiedCmd ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                {copiedCmd ? 'Đã copy' : 'Copy lệnh'}
              </button>
            </div>
            <code className="block overflow-x-auto rounded bg-black/60 p-3 font-mono text-xs text-amber-300">
              {cliCommand}
            </code>
          </div>
        </div>
      </div>

      {/* Code Preview */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3 bg-slate-900">
          <span className="font-mono text-xs text-slate-300">flash-sale.k6.js</span>
          <button
            onClick={() => copyText(k6ScriptContent, 'script')}
            className="inline-flex items-center gap-1.5 rounded bg-slate-800 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-700 cursor-pointer"
          >
            {copiedScript ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            {copiedScript ? 'Đã copy code' : 'Copy toàn bộ code'}
          </button>
        </div>
        <pre className="max-h-[450px] overflow-auto p-4 font-mono text-xs text-slate-300 bg-slate-950 leading-relaxed">
          {k6ScriptContent}
        </pre>
      </div>
    </div>
  );
}