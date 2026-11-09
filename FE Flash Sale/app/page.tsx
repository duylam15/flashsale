'use client';

import { useState } from 'react';

type Metrics = {
  total?: number;
  completed?: number;
  success?: number;
  accepted?: number;
  rejected?: number;
  errors?: number;
  rps?: number | null;
  durationMs?: number | null;
  avgMs?: number | null;
  minMs?: number | null;
  maxMs?: number | null;
  p95Ms?: number | null;
  p90Ms?: number | null;
  medianMs?: number | null;
  medMs?: number | null;
  checksTotal?: number | null;
  checksSucceeded?: number | null;
  checksFailed?: number | null;
  httpReqs?: number | null;
  httpReqFailed?: number | null;
  httpFailed?: number | null;
  statuses?: Record<string, number>;
  worker?: { processed?: number };
  database?: { ordersCreated?: number };
};

type TestJob = {
  id: string;
  status: 'running' | 'completed' | 'failed';
  metrics?: Metrics;
  error?: string;
  warning?: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
const PRODUCT_ID = 1;
const START_ID = 1;
const JITTER = 0;

const SCENARIOS = [
  { label: 'Thiếu hàng', users: 3000, stock: 2000 },
  { label: 'Vừa đủ', users: 3000, stock: 3000 },
  { label: 'Dư hàng', users: 2000, stock: 3000 },
  { label: 'Stress test', users: 5000, stock: 3000 },
];

const fmtInt = (value?: number | null) =>
  value == null || !Number.isFinite(value)
    ? '—'
    : value.toLocaleString('vi-VN');

const fmtNum = (value?: number | null, digits = 2) =>
  value == null || !Number.isFinite(value)
    ? '—'
    : value.toLocaleString('vi-VN', {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      });

const fmtMs = (value?: number | null) =>
  value == null ? '—' : `${fmtNum(value)} ms`;

const fmtSec = (value?: number | null) =>
  value == null ? '—' : `${fmtNum(value / 1000)} s`;

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg">
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      {description && <p className="mt-1 text-sm text-slate-400">{description}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function StatCard({
  label,
  value,
  tooltip,
  tone = 'normal',
}: {
  label: string;
  value: string;
  tooltip: string;
  tone?: 'normal' | 'green' | 'yellow' | 'red' | 'blue';
}) {
  const colors = {
    normal: 'border-slate-800 text-white bg-slate-950/70',
    green: 'border-emerald-900/50 text-emerald-400 bg-emerald-950/20',
    yellow: 'border-amber-900/50 text-amber-400 bg-amber-950/20',
    red: 'border-rose-900/50 text-rose-400 bg-rose-950/20',
    blue: 'border-cyan-900/50 text-cyan-400 bg-cyan-950/20',
  };

  return (
    <div className={`rounded-xl border p-4 ${colors[tone]}`} title={tooltip}>
      <div className="text-xs font-medium text-slate-400">{label}</div>
      <div className="mt-2 break-words text-2xl font-bold tabular-nums">{value}</div>
    </div>
  );
}

function FlowNode({
  number,
  name,
  description,
  color = 'cyan',
}: {
  number: string;
  name: string;
  description: string;
  color?: 'cyan' | 'green' | 'amber';
}) {
  const accents = {
    cyan: 'border-cyan-700/50 bg-cyan-950/20',
    green: 'border-emerald-700/50 bg-emerald-950/20',
    amber: 'border-amber-700/50 bg-amber-950/20',
  };
  return (
    <div className={`rounded-xl border px-4 py-3 ${accents[color]}`}>
      <div className="text-xs font-semibold text-slate-400">BƯỚC {number}</div>
      <div className="mt-1 font-semibold text-white">{name}</div>
      <p className="mt-1 text-xs leading-5 text-slate-300">{description}</p>
    </div>
  );
}

function Arrow() {
  return <div className="py-1 text-center text-xl text-cyan-400">↓</div>;
}

function ProcessDiagram() {
  return (
    <div className="mx-auto max-w-4xl">
      <FlowNode
        number="01"
        name="Dashboard → POST /v1/load-tests"
        description="Nhập Virtual Users và Flash Sale Stock; Backend khởi chạy K6."
      />
      <Arrow />
      <FlowNode
        number="02"
        name="K6 Setup"
        description="POST /orders/warmup-cache nạp tồn kho Redis; POST /auth/generate-tokens chuẩn bị token cho các VU."
      />
      <Arrow />
      <FlowNode
        number="03"
        name="K6 gửi request → Express API"
        description="Mỗi VU gửi POST /orders/flash-sale; Express xác thực JWT và gọi Order Service."
      />
      <Arrow />
      <FlowNode
        number="04"
        name="Redis Lua (atomic)"
        description="Kiểm tra mua trùng / tồn kho; nếu hợp lệ thì trừ stock, đánh dấu người mua và XADD vào Redis Stream."
      />

      <div className="my-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-emerald-800/50 bg-emerald-950/10 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-emerald-400">
            Nhánh phản hồi HTTP và đo hiệu năng
          </p>
          <FlowNode
            number="05A"
            name="Express → K6"
            description="API trả 201/202 (Accepted), 400/409 (Rejected) hoặc lỗi khác. K6 đo latency và ghi Counter."
            color="green"
          />
          <Arrow />
          <FlowNode
            number="06A"
            name="K6 Summary JSON"
            description="K6 tổng hợp Accepted, Rejected, Errors, RPS, P90, P95, Checks và Duration."
            color="green"
          />
        </div>

        <div className="rounded-2xl border border-amber-800/50 bg-amber-950/10 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-amber-400">
            Nhánh xử lý đơn hàng bất đồng bộ
          </p>
          <FlowNode
            number="05B"
            name="Redis Stream → Worker"
            description="Worker dùng XREADGROUP đọc message đã được chấp nhận và xử lý đơn hàng."
            color="amber"
          />
          <Arrow />
          <FlowNode
            number="06B"
            name="PostgreSQL → XACK"
            description="Worker ghi Order bằng Prisma, sau đó XACK message nếu xử lý thành công."
            color="amber"
          />
        </div>
      </div>

      <FlowNode
        number="07"
        name="GET /v1/load-tests/:testId → Dashboard"
        description="Backend đọc K6 Summary và trả metrics; Frontend polling endpoint để hiển thị kết quả. Số đơn DB cần metric riêng, không suy ra từ Accepted."
      />
    </div>
  );
}

export default function Page() {
  const [users, setUsers] = useState(100);
  const [stock, setStock] = useState(100);
  const [running, setRunning] = useState(false);
  const [job, setJob] = useState<TestJob | null>(null);
  const [message, setMessage] = useState('');

  const valid =
    Number.isInteger(users) && users >= 1 && users <= 10000 &&
    Number.isInteger(stock) && stock >= 0 && stock <= 1000000;

  async function runTest() {
    if (running || !valid) return;

    setRunning(true);
    setJob(null);
    setMessage('Đang chuẩn bị Warmup Cache và tạo token...');

    try {
      const response = await fetch(`${API_URL}/v1/load-tests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          users,
          stock,
          productId: PRODUCT_ID,
          startId: START_ID,
          jitter: JITTER,
        }),
      });

      const result = await response.json();
      if (!response.ok || !result?.data?.testId) {
        throw new Error(result?.message || 'Không thể khởi chạy K6');
      }

      const testId: string = result.data.testId;
      setMessage(`Đang chạy ${fmtInt(users)} VUs / ${fmtInt(stock)} sản phẩm...`);

      for (let i = 0; i < 360; i++) {
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const statusResponse = await fetch(
          `${API_URL}/v1/load-tests/${testId}`,
          { cache: 'no-store' }
        );
        const statusResult = await statusResponse.json();
        if (!statusResponse.ok) {
          throw new Error(statusResult?.message || 'Không lấy được trạng thái K6');
        }

        const current = statusResult.data as TestJob;
        setJob(current);
        if (current.status === 'completed') {
          setMessage('K6 đã hoàn thành. Xem kết quả bên dưới.');
          return;
        }
        if (current.status === 'failed') {
          throw new Error(current.error || 'Bài kiểm thử thất bại');
        }
      }

      setMessage('Hết thời gian theo dõi. Hãy kiểm tra Backend.');
    } catch (error) {
      setMessage(`Lỗi: ${error instanceof Error ? error.message : 'Không xác định'}`);
    } finally {
      setRunning(false);
    }
  }

  const m = job?.metrics;
  const accepted = m?.accepted ?? m?.success;
  const rejected = m?.rejected;
  const errors = m?.errors;
  const total = m?.total ?? users;
  const completed = m?.completed ?? 0;
  const progress = Math.max(0, Math.min(100, completed / Math.max(total, 1) * 100));
  const p95Pass = m?.p95Ms == null ? null : m.p95Ms < 1000;

  const businessCards: Array<{
    label: string; value: string; tooltip: string;
    tone: 'normal' | 'green' | 'yellow' | 'red';
  }> = [
    { label: 'Total Requests', value: fmtInt(m?.total), tooltip: 'Số lượt đặt hàng mục tiêu.', tone: 'normal' },
    { label: 'Accepted', value: fmtInt(accepted), tooltip: 'Số yêu cầu API chấp nhận (201/202), chưa chắc đã ghi DB.', tone: 'green' },
    { label: 'Rejected', value: fmtInt(rejected), tooltip: 'Yêu cầu bị từ chối hợp lệ (400/409).', tone: 'yellow' },
    { label: 'System Errors', value: fmtInt(errors), tooltip: 'Lỗi kết nối hoặc phản hồi ngoài danh sách hợp lệ.', tone: 'red' },
  ];

  const performanceCards = [
    { label: 'RPS', value: m?.rps == null ? '—' : `${fmtNum(m.rps, 1)} req/s`, tooltip: 'Thông lượng trung bình của toàn bài test.' },
    { label: 'Avg Latency', value: fmtMs(m?.avgMs), tooltip: 'Thời gian phản hồi trung bình.' },
    { label: 'P95 Latency', value: fmtMs(m?.p95Ms), tooltip: 'Phân vị 95% của thời gian phản hồi.' },
    { label: 'P90 Latency', value: fmtMs(m?.p90Ms), tooltip: 'Phân vị 90% của thời gian phản hồi.' },
    { label: 'Min Latency', value: fmtMs(m?.minMs), tooltip: 'Thời gian phản hồi nhỏ nhất được K6 ghi nhận.' },
    { label: 'Max Latency', value: fmtMs(m?.maxMs), tooltip: 'Thời gian phản hồi lớn nhất được K6 ghi nhận.' },
    { label: 'Median (P50)', value: fmtMs(m?.medianMs ?? m?.medMs), tooltip: 'Thời gian phản hồi trung vị.' },
    { label: 'Duration', value: fmtSec(m?.durationMs), tooltip: 'Thời lượng bài test theo số liệu Backend.' },
  ];

  const checkCards = [
    { label: 'Checks Total', value: fmtInt(m?.checksTotal), tooltip: 'Tổng số phép kiểm tra K6.' },
    { label: 'Checks Passed', value: fmtInt(m?.checksSucceeded), tooltip: 'Số phép kiểm tra đạt.' },
    { label: 'Checks Failed', value: fmtInt(m?.checksFailed), tooltip: 'Số phép kiểm tra không đạt.' },
    { label: 'HTTP Reqs', value: fmtInt(m?.httpReqs), tooltip: 'Tổng số HTTP request, có thể gồm cả setup.' },
    { label: 'HTTP Failed', value: fmtInt(m?.httpReqFailed ?? m?.httpFailed), tooltip: 'Số request K6 đánh dấu thất bại.' },
  ];

  return (
    <main className="min-h-screen bg-[#020617] px-4 py-7 text-slate-100">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="grid gap-6 xl:grid-cols-[350px_minmax(0,1fr)]">
          <Section
            title="Điều khiển K6"
            description="Chọn số người dùng ảo và số lượng hàng để kiểm thử."
          >
            <div className="space-y-4">
              <div>
                <label htmlFor="vu" className="mb-2 block text-sm text-slate-300">Virtual Users</label>
                <input
                  id="vu"
                  type="number"
                  min={1}
                  max={10000}
                  disabled={running}
                  value={users}
                  onChange={(e) => setUsers(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-500 disabled:opacity-60"
                />
              </div>
              <div>
                <label htmlFor="stock" className="mb-2 block text-sm text-slate-300">Flash Sale Stock</label>
                <input
                  id="stock"
                  type="number"
                  min={0}
                  max={1000000}
                  disabled={running}
                  value={stock}
                  onChange={(e) => setStock(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-500 disabled:opacity-60"
                />
              </div>

              <div>
                <p className="mb-2 text-sm font-medium text-slate-300">Kịch bản nhanh</p>
                <div className="grid grid-cols-2 gap-2">
                  {SCENARIOS.map((scenario) => (
                    <button
                      key={scenario.label}
                      type="button"
                      disabled={running}
                      onClick={() => {
                        setUsers(scenario.users);
                        setStock(scenario.stock);
                      }}
                      className={`rounded-xl border p-3 text-left text-sm transition disabled:opacity-60 ${
                        users === scenario.users && stock === scenario.stock
                          ? 'border-cyan-500 bg-cyan-500/10'
                          : 'border-slate-800 bg-slate-950 hover:border-slate-600'
                      }`}
                    >
                      <span className="block font-semibold text-white">{scenario.label}</span>
                      <span className="mt-1 block text-xs text-slate-400">
                        {fmtInt(scenario.users)} VUs / {fmtInt(scenario.stock)} SP
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                disabled={!valid || running}
                onClick={runTest}
                className="w-full rounded-xl bg-cyan-500 px-4 py-3 font-bold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
              >
                {running ? 'ĐANG CHẠY K6...' : `BẮT ĐẦU TEST ${fmtInt(users)} VUs`}
              </button>

              {message && (
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-sm text-slate-300">
                  {message}
                </div>
              )}
            </div>
          </Section>

          <Section
            title="📊 Kết quả kiểm thử K6xx"
            description="Dữ liệu lấy từ GET /v1/load-tests/:testId."
          >
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
              <div>
                Trạng thái:{' '}
                <span className={`font-semibold ${
                  job?.status === 'failed' ? 'text-rose-400' :
                  job?.status === 'completed' ? 'text-emerald-400' :
                  job?.status === 'running' ? 'text-cyan-400' : 'text-slate-400'
                }`}>
                  {job?.status === 'completed'
                    ? 'Hoàn thành'
                    : job?.status === 'running'
                      ? 'Đang chạy'
                      : job?.status === 'failed'
                        ? 'Thất bại'
                        : 'Chưa chạy'}
                </span>
              </div>
              <div className="text-slate-400">
                {fmtInt(completed)} / {fmtInt(total)} · {fmtNum(progress, 1)}%
              </div>
            </div>

            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-cyan-500 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>

            <h3 className="mb-3 mt-6 text-sm font-semibold uppercase tracking-wide text-slate-400">Business Outcomes</h3>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {businessCards.map((card) => <StatCard key={card.label} {...card} />)}
            </div>

            <h3 className="mb-3 mt-6 text-sm font-semibold uppercase tracking-wide text-slate-400">Throughput & Latency</h3>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {performanceCards.map((card) => (
                <StatCard
                  key={card.label}
                  {...card}
                  tone={card.label === 'RPS' ? 'blue' : card.label === 'P95 Latency' && p95Pass === false ? 'red' : 'normal'}
                />
              ))}
            </div>

            <div className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
              p95Pass === true
                ? 'border-emerald-900/50 bg-emerald-950/20 text-emerald-400'
                : p95Pass === false
                  ? 'border-rose-900/50 bg-rose-950/20 text-rose-400'
                  : 'border-slate-800 bg-slate-950 text-slate-400'
            }`}>
              <span className="font-semibold">Threshold P95 &lt; 1000 ms:</span>{' '}
              {p95Pass == null ? 'Chưa có dữ liệu' : p95Pass ? 'ĐẠT' : 'KHÔNG ĐẠT'}
            </div>

            <h3 className="mb-3 mt-6 text-sm font-semibold uppercase tracking-wide text-slate-400">K6 Checks / HTTP</h3>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {checkCards.map((card) => <StatCard key={card.label} {...card} />)}
            </div>

            {m?.statuses && Object.keys(m.statuses).length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {Object.entries(m.statuses).map(([status, count]) => (
                  <span key={status} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs">
                    HTTP {status}: <strong>{fmtInt(count)}</strong>
                  </span>
                ))}
              </div>
            )}

          </Section>
        </div>

        <Section
          title="🔄 Sơ đồ logic kiểm thử Flash Sale"
          description="Hai luồng chạy song song: K6 nhận phản hồi HTTP để đo hiệu năng, còn Worker ghi đơn hàng vào PostgreSQL qua Redis Stream."
        >
          <ProcessDiagram />
        </Section>
      </div>
    </main>
  );
}
