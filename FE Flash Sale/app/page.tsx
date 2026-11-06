'use client';

import { useEffect, useMemo, useState } from 'react';

type Product = {
  id: number;
  name: string;
  basePrice: number;
  imageUrl?: string;
  inventory?: {
    totalStock: number;
    reservedStock: number;
    soldStock: number;
  };
};

type Metrics = {
  total?: number;
  completed?: number;
  success?: number;
  accepted?: number;
  rejected?: number;
  errors?: number;
  rps?: number;
  durationMs?: number;
  avgMs?: number;
  minMs?: number;
  maxMs?: number;
  p95Ms?: number;
  p90Ms?: number;
  medianMs?: number;
  medMs?: number;
  checksTotal?: number;
  checksSucceeded?: number;
  checksFailed?: number;
  httpReqs?: number;
  httpReqFailed?: number;
  httpFailed?: number;
  statuses?: Record<string, number>;
  worker?: {
    processed?: number;
  };
  database?: {
    ordersCreated?: number;
  };
};

type TestJob = {
  id: string;
  status: 'running' | 'completed' | 'failed';
  metrics?: Metrics;
  error?: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

const QUICK_SCENARIOS = [
  { label: 'Thiếu hàng', users: 3000, stock: 2000 },
  { label: 'Vừa đủ', users: 3000, stock: 3000 },
  { label: 'Dư hàng', users: 2000, stock: 3000 },
  { label: 'Stress', users: 5000, stock: 3000 },
];

const cx = (...arr: (string | false | undefined)[]) => arr.filter(Boolean).join(' ');

const fmtInt = (v?: number | null) =>
  v == null || !Number.isFinite(v) ? '—' : v.toLocaleString('vi-VN');

const fmtNum = (v?: number | null, digits = 2) =>
  v == null || !Number.isFinite(v)
    ? '—'
    : v.toLocaleString('vi-VN', {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      });

const fmtMs = (v?: number | null) => (v == null ? '—' : `${fmtNum(v)} ms`);
const fmtSec = (v?: number | null) => (v == null ? '—' : `${fmtNum(v / 1000)} s`);

function Tip({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex">
      <span className="ml-1 inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full border border-slate-600 text-[10px] text-slate-300">
        ?
      </span>
      <span className="pointer-events-none absolute left-1/2 top-6 z-20 hidden w-56 -translate-x-1/2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-[11px] leading-4 text-slate-200 shadow-xl group-hover:block">
        {text}
      </span>
    </span>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-slate-400">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function StatCard({
  label,
  value,
  tooltip,
  tone = 'default',
}: {
  label: string;
  value: string;
  tooltip: string;
  tone?: 'default' | 'good' | 'warn' | 'bad' | 'brand';
}) {
  const toneClass = {
    default: 'text-white border-slate-800 bg-slate-950/70',
    good: 'text-emerald-400 border-emerald-900/40 bg-emerald-950/20',
    warn: 'text-amber-400 border-amber-900/40 bg-amber-950/20',
    bad: 'text-rose-400 border-rose-900/40 bg-rose-950/20',
    brand: 'text-cyan-400 border-cyan-900/40 bg-cyan-950/20',
  }[tone];

  return (
    <div className={cx('rounded-xl border p-4', toneClass)}>
      <div className="flex items-center text-xs font-medium text-slate-400">
        <span>{label}</span>
        <Tip text={tooltip} />
      </div>
      <div className="mt-2 text-2xl font-bold tracking-tight">{value}</div>
    </div>
  );
}

export default function Page() {
  const [product, setProduct] = useState<Product | null>(null);
  const [loadingProduct, setLoadingProduct] = useState(true);

  const [users, setUsers] = useState(100);
  const [stock, setStock] = useState(100);
  const [startId, setStartId] = useState(1);
  const [jitter, setJitter] = useState(0);

  const [job, setJob] = useState<TestJob | null>(null);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState('');

  const valid =
    Number.isInteger(users) &&
    users >= 1 &&
    users <= 10000 &&
    Number.isInteger(stock) &&
    stock >= 0 &&
    Number.isInteger(startId) &&
    startId >= 1 &&
    Number.isFinite(jitter) &&
    jitter >= 0;

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API_URL}/v1/products/1`, { cache: 'no-store' });
        if (res.ok) {
          const json = await res.json();
          setProduct(json.data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingProduct(false);
      }
    };
    void load();
  }, []);

  const runTest = async () => {
    if (!product || running || !valid) return;

    setRunning(true);
    setJob(null);
    setMessage('Đang khởi tạo bài test...');

    try {
      const res = await fetch(`${API_URL}/v1/load-tests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ users, productId: product.id, startId, stock, jitter }),
      });

      const json = await res.json();
      if (!res.ok || !json?.data?.testId) {
        throw new Error(json?.message || 'Không thể khởi chạy K6');
      }

      const testId = json.data.testId;
      setMessage(`Đang test ${fmtInt(users)} VUs / ${fmtInt(stock)} sản phẩm...`);

      for (let i = 0; i < 120; i++) {
        await new Promise((r) => setTimeout(r, 1000));

        const statusRes = await fetch(`${API_URL}/v1/load-tests/${testId}`, {
          cache: 'no-store',
        });
        const statusJson = await statusRes.json();

        if (!statusRes.ok) {
          throw new Error(statusJson?.message || 'Không lấy được trạng thái bài test');
        }

        const current = statusJson.data as TestJob;
        setJob(current);

        if (current.status === 'completed') {
          setMessage('K6 đã hoàn thành.');
          setRunning(false);
          return;
        }

        if (current.status === 'failed') {
          throw new Error(current.error || 'Bài test thất bại');
        }
      }

      setMessage('Hết thời gian theo dõi. Kiểm tra Backend.');
    } catch (e) {
      setMessage(`Lỗi: ${e instanceof Error ? e.message : 'Không xác định'}`);
    } finally {
      setRunning(false);
    }
  };

  const m = job?.metrics;
  const accepted = m?.success ?? m?.accepted ?? 0;
  const rejected = m?.rejected ?? 0;
  const errors = m?.errors ?? 0;
  const total = m?.total ?? users;
  const completed = m?.completed ?? 0;
  const progress = Math.min(100, Math.max(0, (completed / Math.max(total, 1)) * 100));
  const expectedAccepted = Math.min(users, stock);
  const expectedRejected = Math.max(0, users - stock);
  const p95Pass = m?.p95Ms == null ? null : m.p95Ms < 1000;

  const inventoryCards = useMemo(() => {
    const inv = product?.inventory;
    return [
      {
        label: 'Tổng kho DB',
        value: fmtInt(inv?.totalStock),
        tooltip: 'Tổng số lượng sản phẩm đang có trong PostgreSQL.',
      },
      {
        label: 'Reserved',
        value: fmtInt(inv?.reservedStock),
        tooltip: 'Số lượng đang được giữ chỗ / reserved.',
      },
      {
        label: 'Sold',
        value: fmtInt(inv?.soldStock),
        tooltip: 'Số lượng đã bán trong hệ thống.',
      },
    ];
  }, [product]);

  const businessCards = [
    {
      label: 'Total Requests',
      value: fmtInt(m?.total),
      tooltip: 'Tổng số request đặt hàng mục tiêu của bài test.',
      tone: 'default' as const,
    },
    {
      label: 'Accepted',
      value: fmtInt(accepted),
      tooltip: 'Số request thành công, thường là HTTP 201/202.',
      tone: 'good' as const,
    },
    {
      label: 'Rejected',
      value: fmtInt(rejected),
      tooltip: 'Số request bị từ chối hợp lệ, thường là HTTP 400/409.',
      tone: 'warn' as const,
    },
    {
      label: 'System Errors',
      value: fmtInt(errors),
      tooltip: 'Số request lỗi hệ thống, lỗi kết nối hoặc phản hồi bất thường.',
      tone: 'bad' as const,
    },
  ];

  const perfCards = [
    {
      label: 'RPS',
      value: m?.rps == null ? '—' : `${fmtNum(m.rps, 1)} req/s`,
      tooltip: 'Requests per second - thông lượng trung bình của bài test.',
    },
    {
      label: 'Avg Latency',
      value: fmtMs(m?.avgMs),
      tooltip: 'Độ trễ trung bình của request.',
    },
    {
      label: 'P95 Latency',
      value: fmtMs(m?.p95Ms),
      tooltip: '95% request có độ trễ thấp hơn giá trị này.',
    },
    {
      label: 'P90 Latency',
      value: fmtMs(m?.p90Ms),
      tooltip: '90% request có độ trễ thấp hơn giá trị này.',
    },
    {
      label: 'Min Latency',
      value: fmtMs(m?.minMs),
      tooltip: 'Request nhanh nhất.',
    },
    {
      label: 'Max Latency',
      value: fmtMs(m?.maxMs),
      tooltip: 'Request chậm nhất.',
    },
    {
      label: 'Median',
      value: fmtMs(m?.medianMs ?? m?.medMs),
      tooltip: 'Độ trễ trung vị (median).',
    },
    {
      label: 'Duration',
      value: fmtSec(m?.durationMs),
      tooltip: 'Tổng thời gian chạy bài test.',
    },
  ];

  const checkCards = [
    {
      label: 'Checks Total',
      value: fmtInt(m?.checksTotal),
      tooltip: 'Tổng số check trong K6.',
    },
    {
      label: 'Checks Passed',
      value: fmtInt(m?.checksSucceeded),
      tooltip: 'Số check hợp lệ / passed.',
    },
    {
      label: 'Checks Failed',
      value: fmtInt(m?.checksFailed),
      tooltip: 'Số check failed.',
    },
    {
      label: 'HTTP Reqs',
      value: fmtInt(m?.httpReqs),
      tooltip: 'Tổng số HTTP request của toàn bộ bài test.',
    },
    {
      label: 'HTTP Failed',
      value: fmtInt(m?.httpReqFailed ?? m?.httpFailed),
      tooltip: 'Số request HTTP bị lỗi theo K6.',
    },
  ];

  const pipelineSteps = [
    {
      icon: '⚡',
      name: 'K6 Engine',
      desc: 'Requests hoàn tất',
      value: fmtInt(completed),
      tooltip: 'Số iteration / request mà K6 đã hoàn thành.',
    },
    {
      icon: '🌐',
      name: 'Express API',
      desc: 'Requests tiếp nhận',
      value: '—',
      tooltip: 'Nếu chưa có metrics riêng từ API thì chưa hiển thị được.',
    },
    {
      icon: '🔴',
      name: 'Redis Lua / Stream',
      desc: 'Accepted (HTTP)',
      value: fmtInt(accepted),
      tooltip: 'Số request được tầng Redis / API chấp nhận.',
    },
    {
      icon: '🔄',
      name: 'Async Worker',
      desc: 'Processed',
      value: fmtInt(m?.worker?.processed),
      tooltip: 'Số event worker đã xử lý xong.',
    },
    {
      icon: '🐘',
      name: 'PostgreSQL',
      desc: 'Orders Created',
      value: fmtInt(m?.database?.ordersCreated),
      tooltip: 'Số đơn hàng thực tế đã ghi xuống database.',
    },
  ];

  return (
    <main className="min-h-screen bg-[#020617] px-4 py-6 text-slate-100">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 p-6 shadow-2xl">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-400">
                Flash Sale · Load Testing
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">
                High-Concurrency Dashboard
              </h1>
              <p className="mt-2 text-sm text-slate-400">
                K6 → Express → Redis Lua/Stream → Worker → PostgreSQL
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm text-slate-300">
              <div>Expected Accepted: <span className="font-semibold text-emerald-400">{fmtInt(expectedAccepted)}</span></div>
              <div>Expected Rejected: <span className="font-semibold text-amber-400">{fmtInt(expectedRejected)}</span></div>
            </div>
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
          <Section title="🚀 Điều khiển K6" subtitle="Chọn số VUs, stock flash sale, start ID và jitter.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Virtual Users"
                tip="Số lượng user ảo tham gia bài test cùng lúc."
                value={users}
                onChange={setUsers}
                min={1}
                max={10000}
                disabled={running}
              />
              <Field
                label="Flash Sale Stock"
                tip="Số lượng sản phẩm sẽ được warmup vào Redis trước khi test."
                value={stock}
                onChange={setStock}
                min={0}
                disabled={running}
              />
              <Field
                label="Start User ID"
                tip="ID bắt đầu khi sinh token user cho K6."
                value={startId}
                onChange={setStartId}
                min={1}
                disabled={running}
              />
              <div>
                <div className="mb-2 flex items-center text-sm font-medium text-slate-300">
                  <span>Jitter (giây)</span>
                  <Tip text="Độ trễ ngẫu nhiên trước khi mỗi VU gửi request. 0 = đồng thời." />
                </div>
                <select
                  value={jitter}
                  disabled={running}
                  onChange={(e) => setJitter(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-500"
                >
                  <option value={0}>0 — Đồng thời</option>
                  <option value={1}>1 — Rải trong 1s</option>
                  <option value={3}>3 — Rải trong 3s</option>
                  <option value={5}>5 — Rải trong 5s</option>
                </select>
              </div>
            </div>

            <div className="mt-5">
              <div className="mb-2 text-sm font-medium text-slate-300">Kịch bản nhanh</div>
              <div className="grid grid-cols-2 gap-3">
                {QUICK_SCENARIOS.map((item) => {
                  const active = item.users === users && item.stock === stock;
                  return (
                    <button
                      key={item.label}
                      type="button"
                      disabled={running}
                      onClick={() => {
                        setUsers(item.users);
                        setStock(item.stock);
                      }}
                      className={cx(
                        'rounded-xl border p-3 text-left transition',
                        active
                          ? 'border-cyan-500 bg-cyan-500/10'
                          : 'border-slate-800 bg-slate-950 hover:border-slate-700'
                      )}
                    >
                      <div className="font-medium text-white">{item.label}</div>
                      <div className="mt-1 text-xs text-slate-400">
                        {fmtInt(item.users)} VUs / {fmtInt(item.stock)} SP
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              disabled={!valid || running || !product}
              onClick={runTest}
              className="mt-5 w-full rounded-xl bg-cyan-500 px-4 py-3 font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
            >
              {running ? 'ĐANG CHẠY K6...' : `BẮT ĐẦU TEST ${fmtInt(users)} VUs`}
            </button>

            {message && (
              <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-300">
                {message}
              </div>
            )}
          </Section>

          <div className="space-y-6">
            <Section title="📦 Sản phẩm & tồn kho" subtitle="Dữ liệu lấy từ PostgreSQL.">
              {loadingProduct ? (
                <div className="text-sm text-slate-400">Đang tải sản phẩm...</div>
              ) : !product ? (
                <div className="text-sm text-rose-400">Không tải được sản phẩm.</div>
              ) : (
                <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                    <div className="text-xs uppercase tracking-widest text-cyan-400">Product #{product.id}</div>
                    <div className="mt-2 text-xl font-semibold text-white">{product.name}</div>
                    <div className="mt-2 text-2xl font-bold text-emerald-400">
                      {Number(product.basePrice).toLocaleString('vi-VN')}đ
                    </div>
                    <p className="mt-3 text-sm text-slate-400">
                      Stock test trên Redis có thể khác stock thực trong PostgreSQL.
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                    {inventoryCards.map((card) => (
                      <StatCard
                        key={card.label}
                        label={card.label}
                        value={card.value}
                        tooltip={card.tooltip}
                      />
                    ))}
                  </div>
                </div>
              )}
            </Section>

            <Section title="📊 Kết quả kiểm thử K6" subtitle="Dữ liệu hiển thị từ endpoint /v1/load-tests/:testId">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-slate-300">
                  Trạng thái:{' '}
                  <span
                    className={cx(
                      'rounded-full px-3 py-1 text-xs font-semibold',
                      job?.status === 'completed' && 'bg-emerald-500/15 text-emerald-400',
                      job?.status === 'running' && 'bg-cyan-500/15 text-cyan-400',
                      job?.status === 'failed' && 'bg-rose-500/15 text-rose-400',
                      !job && 'bg-slate-800 text-slate-300'
                    )}
                  >
                    {job?.status === 'completed'
                      ? 'Hoàn thành'
                      : job?.status === 'running'
                      ? 'Đang chạy'
                      : job?.status === 'failed'
                      ? 'Thất bại'
                      : 'Chưa chạy'}
                  </span>
                </div>

                <div className="text-sm text-slate-400">
                  {fmtInt(completed)} / {fmtInt(total)} · {fmtNum(progress, 1)}%
                </div>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-cyan-500 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>

              <h3 className="mt-6 mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">
                Business Outcomes
              </h3>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {businessCards.map((card) => (
                  <StatCard
                    key={card.label}
                    label={card.label}
                    value={card.value}
                    tooltip={card.tooltip}
                    tone={card.tone}
                  />
                ))}
              </div>

              <h3 className="mt-6 mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">
                Throughput & Latency
              </h3>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {perfCards.map((card) => (
                  <StatCard
                    key={card.label}
                    label={card.label}
                    value={card.value}
                    tooltip={card.tooltip}
                    tone={card.label === 'RPS' ? 'brand' : card.label === 'P95 Latency' && p95Pass === false ? 'bad' : 'default'}
                  />
                ))}
              </div>

              <div
                className={cx(
                  'mt-4 rounded-xl border px-4 py-3 text-sm',
                  p95Pass == null && 'border-slate-800 bg-slate-950 text-slate-300',
                  p95Pass === true && 'border-emerald-900/50 bg-emerald-950/20 text-emerald-400',
                  p95Pass === false && 'border-rose-900/50 bg-rose-950/20 text-rose-400'
                )}
              >
                <span className="font-medium">Threshold P95 &lt; 1000 ms</span>
                <span className="ml-2">
                  {p95Pass == null ? 'Chưa có dữ liệu' : p95Pass ? 'ĐẠT' : 'KHÔNG ĐẠT'}
                </span>
              </div>

              <h3 className="mt-6 mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">
                K6 Checks / HTTP
              </h3>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                {checkCards.map((card) => (
                  <StatCard key={card.label} label={card.label} value={card.value} tooltip={card.tooltip} />
                ))}
              </div>

              {m?.statuses && Object.keys(m.statuses).length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {Object.entries(m.statuses).map(([code, count]) => (
                    <span
                      key={code}
                      className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-300"
                    >
                      HTTP {code}: <span className="font-semibold text-white">{fmtInt(count)}</span>
                    </span>
                  ))}
                </div>
              )}

              {job?.error && (
                <div className="mt-4 rounded-xl border border-rose-900/40 bg-rose-950/20 px-4 py-3 text-sm text-rose-300">
                  {job.error}
                </div>
              )}
            </Section>

            <Section title="🔄 Architecture Pipeline" subtitle="Các tầng chưa có metrics riêng sẽ hiển thị —.">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                {pipelineSteps.map((step) => (
                  <div key={step.name} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-2xl">{step.icon}</div>
                      <Tip text={step.tooltip} />
                    </div>
                    <div className="mt-3 text-sm font-semibold text-white">{step.name}</div>
                    <div className="mt-1 text-xs text-slate-400">{step.desc}</div>
                    <div className="mt-3 text-2xl font-bold text-cyan-400">{step.value}</div>
                  </div>
                ))}
              </div>
            </Section>
          </div>
        </div>
      </div>
    </main>
  );
}

function Field({
  label,
  tip,
  value,
  onChange,
  min,
  max,
  disabled,
}: {
  label: string;
  tip: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center text-sm font-medium text-slate-300">
        <span>{label}</span>
        <Tip text={tip} />
      </div>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-500"
      />
    </div>
  );
}