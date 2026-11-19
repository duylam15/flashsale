# ⚡ Flash Sale Benchmark Engine

A high-concurrency e-commerce flash sale simulator and interactive observability dashboard designed to benchmark and prevent inventory overselling under heavy traffic spikes.

🌐 **Live Demo:** [https://netto.id.vn](https://netto.id.vn)

---

## 🎯 Overview

During flash sales, thousands of concurrent requests compete for limited stock within milliseconds. Standard read-then-write database queries fail under race conditions, leading to negative inventory (overselling) and database lock contention.

**Flash Sale Benchmark Engine** solves this by decoupling high-throughput inventory gating from database persistence, while providing a light-mode Next.js dashboard to visualize system architecture, engineering notes, and empirical `k6` load-testing results.

---

## 🏗 System Architecture & Concurrency Control

1. **Atomic Inventory Gating (Redis + Lua):**
   - Executes stock check-and-decrement inside a single-threaded atomic Redis Lua script (`EVAL`), guaranteeing zero race conditions without distributed lock overhead.
2. **Asynchronous Order Persistence (Redis Streams):**
   - Accepted purchase requests are pushed to Redis Streams and consumed by background workers that batch-write orders into PostgreSQL via Prisma, keeping API response times low.
3. **Interactive Benchmark Dashboard (Next.js):**
   - Visualizes request throughput, latency percentiles (`p95`), accepted vs. rejected orders, and architecture trade-offs with URL-synced tab navigation (`?tab=...`).

---

## 🛠 Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | Next.js, TypeScript, React, Tailwind CSS |
| **Backend** | Node.js, Express.js, TypeScript, Prisma ORM |
| **Database & Cache** | PostgreSQL, Redis (Lua Scripts & Redis Streams) |
| **Load Testing** | k6 |
| **Infrastructure** | Docker, Docker Compose, Nginx, Certbot SSL, Cloudflare, Ubuntu VPS (1 vCPU, 2GB RAM) |

---

## 📊 Empirical Load Test Benchmark (`k6`)

**Test Scenario:** `1,000` concurrent Virtual Users (VUs) competing for `500` limited items in a simultaneous burst on a resource-constrained **1 vCPU, 2GB RAM Ubuntu VPS**.

| Metric | Result | Notes |
| :--- | :--- | :--- |
| **Peak Concurrency** | `1,000 VUs` | Simultaneous burst (`1,000` iterations) |
| **Throughput** | `93.48 RPS` | Sustained across `1,002` total HTTP requests |
| **p(95) Duration (All)** | `2.20 s` | `1.33 s` average (`1.63 s` p95 for successful orders) |
| **Checks Pass Rate** | `100%` | `1,000 / 1,000` assertions passed |
| **Accepted Orders** | `500` | Exact match with initial stock (`flashsale_accepted`) |
| **Rejected Requests** | `500` | Cleanly rejected (`409` Out of Stock, `flashsale_rejected`) |
| **System / 5xx Errors** | `0` | `flashsale_errors: 0` — zero crashes or timeouts |
| **Overselling Rate** | `0%` | Strict inventory consistency maintained |

### 🔍 Engineering Analysis & Bottleneck Observations
- **Zero Race Conditions:** Out of `1,000` concurrent purchase attempts, exactly `500` succeeded and `500` were cleanly rejected with `0` unhandled server errors, proving atomic consistency under heavy contention.
- **1 vCPU Connection Queueing:** Under a sudden `1,000` VU burst on a single vCPU, `http_req_connecting` / `http_req_blocked` averaged `591 ms` (`3.12 s` at p95) due to OS-level TCP accept queue saturation before requests reached the Node.js event loop.

---

## 🚀 Getting Started (Local Development)

### Prerequisites
- Node.js `v20+`
- Docker & Docker Compose

### 1. Clone the repository
```bash
git clone [https://github.com/duylam15/flashsale.git](https://github.com/duylam15/flashsale.git)
cd flashsale
