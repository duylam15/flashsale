import { Prisma, LoadTestResult } from '@prisma/client';
import prisma from '../../client'; // Kiểm tra lại đường dẫn import prisma client trong project của bạn

const createResult = async (
  data: Prisma.LoadTestResultUncheckedCreateInput
): Promise<LoadTestResult> => {
  return prisma.loadTestResult.create({
    data,
  });
};

const queryResults = async (
  filter: { sessionId?: number; tool?: any },
  options: { limit?: number; page?: number }
) => {
  const page = options.page ?? 1;
  const limit = options.limit ?? 20;
  const skip = (page - 1) * limit;

  const where: Prisma.LoadTestResultWhereInput = {};
  if (filter.sessionId) where.sessionId = filter.sessionId;
  if (filter.tool) where.tool = filter.tool;

  const [results, total] = await Promise.all([
    prisma.loadTestResult.findMany({
      where,
      skip,
      take: limit,
      orderBy: { executedAt: 'desc' },
      // Không select rawResult ở list để nhẹ payload khi load danh sách
      select: {
        id: true,
        name: true,
        description: true,
        tool: true,
        status: true,
        sessionId: true,
        targetEndpoint: true,
        vus: true,
        durationSeconds: true,
        totalRequests: true,
        successCount: true,
        failedCount: true,
        rps: true,
        p95LatencyMs: true,
        p99LatencyMs: true,
        executedAt: true,
      },
    }),
    prisma.loadTestResult.count({ where }),
  ]);

  return {
    results,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    totalResults: total,
  };
};

const getResultById = async (id: string): Promise<LoadTestResult | null> => {
  return prisma.loadTestResult.findUnique({
    where: { id },
    include: { session: true },
  });
};

export default {
  createResult,
  queryResults,
  getResultById,
};