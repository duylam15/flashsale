'use client';

import React, { useState } from 'react';
import {
  Cpu,
  Database,
  Terminal,
  Container,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Check,
  BookOpen,
  Lightbulb,
  Code2,
} from 'lucide-react';

type TopicKey = 'redis' | 'database' | 'network' | 'devops';

interface KnowledgeSection {
  title: string;
  problem: string;
  solution: string;
  codeTitle: string;
  language: string;
  code: string;
}

interface TopicData {
  id: TopicKey;
  label: string;
  badge: string;
  icon: React.ReactNode;
  accentColor: string;
  activeTabClass: string;
  overview: string;
  sections: KnowledgeSection[];
  interviewTakeaways: string[];
}

const TOPICS: TopicData[] = [
  {
    id: 'redis',
    label: 'Redis & Lua Script',
    badge: 'In-Memory Atomic',
    icon: <Cpu className="w-4 h-4" />,
    accentColor: 'text-rose-600 bg-rose-50 border-rose-200',
    activeTabClass: 'border-rose-600 text-rose-700 bg-rose-50/60',
    overview:
      'Giải quyết bài toán tranh chấp tài nguyên (Race Condition) khi hàng nghìn người dùng cùng bấm mua ở một thời điểm và đệm dữ liệu trước khi ghi xuống ổ đĩa.',
    sections: [
      {
        title: '1. Chống bán lố (0% Oversell) bằng Redis Lua Script',
        problem:
          'Nếu tách rời lệnh đọc tồn kho (GET) và trừ kho (DECR) ở tầng Node.js, nhiều request đồng thời sẽ cùng đọc được stock = 1 tại cùng một mili-giây, dẫn đến ghi nhận nhiều đơn hơn số hàng thực có.',
        solution:
          'Gom toàn bộ logic kiểm tra mua trùng (SISMEMBER), kiểm tra tồn kho, trừ kho (DECRBY) và đẩy vào hàng đợi (XADD) vào một Lua Script. Redis thực thi Lua Script theo cơ chế đơn luồng (Single-threaded) và nguyên tử (Atomic), đảm bảo không request nào có thể xen ngang.',
        codeTitle: 'flashSale.lua — Thực thi nguyên tử trên RAM',
        language: 'lua',
        code: `-- KEYS[1]: flashsale:stock:<productId>
-- KEYS[2]: flashsale:buyers:<productId>
if redis.call('SISMEMBER', KEYS[2], ARGV[1]) == 1 then
    return -1 -- Chặn user mua trùng
end

local currentStock = tonumber(redis.call('GET', KEYS[1]))
local quantity = tonumber(ARGV[2])

if not currentStock or currentStock < quantity then
    return -2 -- Chặn chính xác tại ngưỡng hết hàng
end

redis.call('DECRBY', KEYS[1], quantity)
redis.call('SADD', KEYS[2], ARGV[1])
redis.call('XADD', ARGV[3], 'MAXLEN', '~', 100000, '*',
    'userId', ARGV[1], 'productId', ARGV[4], 'quantity', quantity)
return 1`,
      },
      {
        title: '2. Đệm bất đồng bộ & Chống mất đơn với Redis Streams',
        problem:
          'Nếu dùng Pub/Sub thông thường, tin nhắn sẽ bị mất nếu Worker đang khởi động lại hoặc quá tải. Nếu ghi thẳng PostgreSQL ngay trong API request, kết nối sẽ bị treo chờ I/O ổ đĩa.',
        solution:
          'Sử dụng Redis Streams kết hợp Consumer Group (XREADGROUP). API trả ngay HTTP 201/202 sau khi XADD thành công. Worker nền chủ động kéo từng lô tin nhắn (COUNT 100) và chỉ gửi tín hiệu xác nhận XACK sau khi PostgreSQL đã commit transaction.',
        codeTitle: 'flashSale.worker.ts — Consumer Group & XACK',
        language: 'typescript',
        code: `const response = await workerRedis.xreadgroup(
  'GROUP', 'order-processing-group', \`worker-\${process.pid}\`,
  'BLOCK', 5000, 'COUNT', 100,
  'STREAMS', 'flash-sale-stream', '>'
);

// Sau khi prisma.$transaction(...) thành công mới xác nhận XACK
await redis.xack('flash-sale-stream', 'order-processing-group', messageId);`,
      },
    ],
    interviewTakeaways: [
      'Tại sao dùng Lua Script thay vì Redis MULTI/EXEC? Vì MULTI/EXEC không hỗ trợ đọc giá trị giữa chừng để rẽ nhánh điều kiện (if currentStock < quantity) trước khi quyết định trừ kho.',
      'Tại sao chọn Redis Streams thay vì Redis List (LPUSH/BRPOP)? Streams hỗ trợ Consumer Group, lưu lại lịch sử message (PEL) và cơ chế XACK giúp không mất dữ liệu khi Worker crash.',
    ],
  },
  {
    id: 'database',
    label: 'PostgreSQL & Prisma',
    badge: 'ACID & Pooling',
    icon: <Database className="w-4 h-4" />,
    accentColor: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    activeTabClass: 'border-emerald-600 text-emerald-700 bg-emerald-50/60',
    overview:
      'Bảo vệ Database trước lưu lượng truy cập đột biến và đảm bảo tính toàn vẹn dữ liệu giữa bảng đơn hàng (Order) và bảng tồn kho (Inventory).',
    sections: [
      {
        title: '1. Điều tiết tốc độ ghi (Backpressure) & Connection Pooling',
        problem:
          'Khi 1,000+ VUs bắn đồng loạt, nếu mở 1,000 kết nối trực tiếp tới PostgreSQL (Neon DB), hệ thống sẽ lập tức sập vì vượt quá giới hạn max_connections và cạn kiệt RAM trên VPS.',
        solution:
          'Tách biệt luồng nhận tải (Redis) khỏi luồng lưu trữ (PostgreSQL). Cấu hình Connection Pool qua PgBouncer với giới hạn connection_limit phù hợp trên Prisma để tái sử dụng kết nối và điều tiết tốc độ ghi theo sức chịu đựng của DB.',
        codeTitle: '.env — Cấu hình Connection Pool cho Neon PostgreSQL',
        language: 'bash',
        code: `DATABASE_URL="postgresql://user:pass@ep-host-pooler.aws.neon.tech/flashsale?sslmode=require&pgbouncer=true&connection_limit=50&pool_timeout=30"`,
      },
      {
        title: '2. Toàn vẹn dữ liệu với ACID Transaction & Optimistic Lock',
        problem:
          'Việc tạo bản ghi Order, OrderItems và cập nhật số lượng soldStock trong bảng Inventory phải thành công hoặc thất bại cùng nhau, tránh tình trạng có đơn hàng nhưng không trừ kho.',
        solution:
          'Bọc toàn bộ thao tác ghi trong prisma.$transaction. Đối với luồng đặt hàng thường (non-flashsale), kết hợp điều kiện kiểm tra tồn kho trực tiếp trong câu lệnh UPDATE nguyên tử kèm tăng biến version (Optimistic Concurrency Control).',
        codeTitle: 'order.service.ts — Atomic SQL Update & Transaction',
        language: 'typescript',
        code: `await prisma.$transaction(async (tx) => {
  await tx.order.create({
    data: {
      userId: numUserId,
      totalAmount,
      status: 'PAID',
      orderItems: {
        create: { productId: numProductId, quantity: numQuantity, priceAtPurchase },
      },
    },
  });

  await tx.inventory.update({
    where: { productId: numProductId },
    data: { soldStock: { increment: numQuantity }, version: { increment: 1 } },
  });
});`,
      },
    ],
    interviewTakeaways: [
      'Eventual Consistency (Nhất quán cuối cùng): Tồn kho trên Redis giảm ngay lập tức (< 2ms), còn PostgreSQL cập nhật trễ hơn vài trăm mili-giây thông qua Worker.',
      'Optimistic Locking dùng cột version giúp tránh khóa cứng dòng dữ liệu (Row-level Lock) lâu như SELECT ... FOR UPDATE.',
    ],
  },
  {
    id: 'network',
    label: 'Linux & Network',
    badge: 'Kernel Tuning',
    icon: <Terminal className="w-4 h-4" />,
    accentColor: 'text-indigo-600 bg-indigo-50 border-indigo-200',
    activeTabClass: 'border-indigo-600 text-indigo-700 bg-indigo-50/60',
    overview:
      'Tối ưu hóa hệ điều hành Ubuntu trên VPS cấu hình khiêm tốn (1 vCPU / 2GB RAM) để không bị nghẽn cổ chai ở tầng TCP/IP khi nhận 1,000+ kết nối đồng thời.',
    sections: [
      {
        title: '1. Khắc phục lỗi Connection Timeout (connectex) bằng Kernel Tuning',
        problem:
          'Khi chạy k6 Load Test từ 1,000 VUs trở lên, nhiều request bị từ chối ngay từ bước bắt tay TCP (TCP 3-Way Handshake) dù CPU vẫn còn trống, do hàng chờ kết nối mặc định của Linux quá nhỏ.',
        solution:
          'Mở rộng kích thước hàng chờ SYN Backlog (tcp_max_syn_backlog) và hàng chờ socket đã hoàn tất bắt tay (somaxconn) lên 10,240. Đồng thời bật tcp_tw_reuse=1 để hệ điều hành tái sử dụng nhanh các socket đang ở trạng thái TIME_WAIT.',
        codeTitle: '/etc/sysctl.conf — Tối ưu thông số mạng nhân Linux',
        language: 'bash',
        code: `# Mở rộng hàng chờ kết nối TCP đồng thời
net.core.somaxconn = 10240
net.ipv4.tcp_max_syn_backlog = 10240

# Tái sử dụng nhanh các socket ở trạng thái TIME_WAIT
net.ipv4.tcp_tw_reuse = 1
net.ipv4.ip_local_port_range = 1024 65535

# Áp dụng cấu hình ngay lập tức
# sudo sysctl -p`,
      },
      {
        title: '2. Nâng giới hạn File Descriptors (ulimit -n)',
        problem:
          'Trong Linux, mỗi kết nối mạng (TCP socket), kết nối Redis hay file log đều được tính là một File Descriptor. Mức mặc định 1,024 khiến Node.js và Nginx văng lỗi EMFILE (Too many open files) khi chịu tải cao.',
        solution:
          'Nâng giới hạn soft và hard của nofile lên 65,535 trong /etc/security/limits.conf và cấu hình worker_rlimit_nofile tương ứng trên Nginx.',
        codeTitle: '/etc/security/limits.conf — Mở rộng giới hạn kết nối',
        language: 'bash',
        code: `* soft nofile 65535
* hard nofile 65535
root soft nofile 65535
root hard nofile 65535`,
      },
    ],
    interviewTakeaways: [
      'Hiểu rõ hành trình một request đi qua OS trước khi chạm vào code Node.js: NIC -> TCP SYN Queue -> Accept Queue (somaxconn) -> Nginx -> Node.js Event Loop.',
      'Biết cách đọc metrics k6 (http_req_connecting vs http_req_waiting) để phân biệt lỗi nghẽn mạng tầng OS với lỗi chậm xử lý ở tầng Application.',
    ],
  },
  {
    id: 'devops',
    label: 'Docker & CI/CD',
    badge: 'Production Deploy',
    icon: <Container className="w-4 h-4" />,
    accentColor: 'text-blue-600 bg-blue-50 border-blue-200',
    activeTabClass: 'border-blue-600 text-blue-700 bg-blue-50/60',
    overview:
      'Đóng gói ứng dụng chuẩn hóa, định tuyến tên miền bảo mật HTTPS với Nginx và tự động hóa quy trình triển khai lên VPS qua GitHub Actions.',
    sections: [
      {
        title: '1. Reverse Proxy & SSL Termination với Nginx',
        problem:
          'Không thể mở trực tiếp các cổng nội bộ (3000, 4000) ra Internet và cần mã hóa HTTPS cho cả giao diện Frontend lẫn API Backend trên cùng một máy chủ VPS.',
        solution:
          'Cấu hình Nginx làm Reverse Proxy đứng trước các container, điều hướng netto.id.vn về cổng 3000 (Next.js) và api.netto.id.vn về cổng 4000 (Express), tích hợp chứng chỉ SSL miễn phí từ Let’s Encrypt (Certbot) và bật HTTP Keep-Alive.',
        codeTitle: '/etc/nginx/sites-available/flashsale — Định tuyến & Proxy',
        language: 'nginx',
        code: `server {
    server_name api.netto.id.vn;

    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}`,
      },
      {
        title: '2. Pipeline CI/CD tự động với GitHub Actions & Docker Hub',
        problem:
          'Việc SSH thủ công vào VPS 2GB RAM để chạy npm install và npm run build dễ gây tràn RAM (OOM Killer) làm treo server đang chạy.',
        solution:
          'Chuyển toàn bộ quá trình build Docker image sang runner của GitHub Actions, đẩy image lên Docker Hub, sau đó tự động SSH vào VPS để pull image mới và khởi động lại container với thời gian gián đoạn tối thiểu.',
        codeTitle: '.github/workflows/deploy.yml — Luồng triển khai tự động',
        language: 'yaml',
        code: `jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build & Push Docker Image
        run: |
          docker build -t username/flashsale-api:latest .
          docker push username/flashsale-api:latest
      - name: Deploy to VPS via SSH
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: \${{ secrets.VPS_HOST }}
          script: |
            docker pull username/flashsale-api:latest
            docker compose up -d --force-recreate api`,
      },
    ],
    interviewTakeaways: [
      'Build Docker image trên CI runner giúp giải phóng hoàn toàn gánh nặng CPU/RAM cho con VPS production 2GB RAM.',
      'Tách biệt môi trường qua Docker network giúp Redis không bị lộ cổng ra public Internet, tăng tính bảo mật hệ thống.',
    ],
  },
];

export default function EngineeringNotesTab() {
  const [activeTopic, setActiveTopic] = useState<TopicKey>('redis');
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);

  const currentTopic =
    TOPICS.find((t) => t.id === activeTopic) || TOPICS[0];

  const handleCopy = async (code: string, key: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedIndex(key);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch {
      // Bỏ qua nếu trình duyệt chặn clipboard
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Sub-tabs Navigation */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-600" />
                Kiến thức kỹ thuật & Giải pháp thiết kế hệ thống
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Tổng hợp các bài toán thực tế, quyết định kiến trúc và cấu hình tối ưu đã áp dụng để xây dựng hệ thống Flash Sale.
              </p>
            </div>
            <span className="text-xs font-medium text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
              4 Chuyên đề cốt lõi
            </span>
          </div>

          {/* Clickable Topic Tabs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
            {TOPICS.map((topic) => {
              const isActive = topic.id === activeTopic;
              return (
                <button
                  key={topic.id}
                  type="button"
                  onClick={() => setActiveTopic(topic.id)}
                  className={`flex items-center justify-between p-3.5 rounded-xl border-2 text-left transition-all cursor-pointer ${
                    isActive
                      ? `${topic.activeTabClass} shadow-xs`
                      : 'border-slate-200/80 bg-slate-50/50 text-slate-600 hover:bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`p-2 rounded-lg border ${
                        isActive
                          ? topic.accentColor
                          : 'bg-white text-slate-500 border-slate-200'
                      }`}
                    >
                      {topic.icon}
                    </div>
                    <div>
                      <div className="text-xs sm:text-sm font-bold leading-tight">
                        {topic.label}
                      </div>
                      <div className="text-[11px] opacity-75 mt-0.5">
                        {topic.badge}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Topic Overview Banner */}
        <div className="px-6 py-4 bg-slate-50/80 border-b border-slate-200/80 flex items-start gap-3">
          <span
            className={`mt-0.5 px-2.5 py-0.5 rounded-md text-xs font-semibold border shrink-0 ${currentTopic.accentColor}`}
          >
            {currentTopic.badge}
          </span>
          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
            {currentTopic.overview}
          </p>
        </div>

        {/* Problem -> Solution -> Code Sections */}
        <div className="p-6 space-y-8">
          {currentTopic.sections.map((sec, idx) => {
            const copyKey = `${currentTopic.id}-${idx}`;
            return (
              <div
                key={sec.title}
                className="rounded-xl border border-slate-200 bg-white overflow-hidden"
              >
                {/* Section Title */}
                <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900">
                    {sec.title}
                  </h3>
                  <span className="text-[11px] font-mono text-slate-400">
                    0{idx + 1}
                  </span>
                </div>

                <div className="p-5 space-y-4">
                  {/* Problem & Solution 2-column grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200/80">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 mb-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        Vấn đề gặp phải (Bottleneck)
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed">
                        {sec.problem}
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200/80">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 mb-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Giải pháp áp dụng
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed">
                        {sec.solution}
                      </p>
                    </div>
                  </div>

                  {/* Code / Config Snippet */}
                  <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
                    <div className="px-4 py-2 bg-slate-800/90 border-b border-slate-700 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
                        <Code2 className="w-3.5 h-3.5 text-blue-400" />
                        <span>{sec.codeTitle}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(sec.code, copyKey)}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-300 hover:text-white bg-slate-700/70 hover:bg-slate-700 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
                      >
                        {copiedIndex === copyKey ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400">Đã chép</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                    <pre className="p-4 text-xs font-mono text-slate-100 overflow-x-auto leading-relaxed">
                      <code>{sec.code}</code>
                    </pre>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Key Takeaways / Interview Highlights */}
          <div className="rounded-xl bg-blue-50/70 border border-blue-200 p-5">
            <div className="flex items-center gap-2 text-xs font-bold text-blue-900 uppercase tracking-wider mb-2.5">
              <Lightbulb className="w-4 h-4 text-blue-600" />
              Điểm nhấn kỹ thuật trọng tâm ({currentTopic.label})
            </div>
            <ul className="space-y-2">
              {currentTopic.interviewTakeaways.map((point, index) => (
                <li
                  key={index}
                  className="text-xs text-slate-700 leading-relaxed flex items-start gap-2"
                >
                  <span className="text-blue-600 font-bold mt-0.5">•</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}