import httpStatus from 'http-status';
import ApiError from '../../utils/ApiError';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const createSession = async (sessionBody: any) => {
  return prisma.flashSaleSession.create({
    data: {
      startTime: new Date(sessionBody.startTime),
      endTime: new Date(sessionBody.endTime),
      status: 'PENDING' // Mặc định khi tạo mới
    }
  });
};

const querySessions = async (filters: any, options: any) => {
  const page = options.page || 1;
  const limit = options.limit || 10;
  const skip = (page - 1) * limit;

  const where: any = {};
  if (filters.status) {
    where.status = filters.status;
  }

  const [sessions, total] = await Promise.all([
    prisma.flashSaleSession.findMany({
      where,
      skip,
      take: limit,
      orderBy: { startTime: 'asc' }, // Sắp xếp phiên sắp diễn ra lên đầu
      include: {
        products: {
          include: { product: true } // Lấy thông tin chi tiết của Product bên trong
        }
      }
    }),
    prisma.flashSaleSession.count({ where })
  ]);

  return { sessions, total, page, limit, totalPages: Math.ceil(total / limit) };
};

const getSessionById = async (id: number) => {
  const session = await prisma.flashSaleSession.findUnique({
    where: { id },
    include: {
      products: {
        include: { product: true }
      }
    }
  });
  if (!session) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Flash Sale Session not found');
  }
  return session;
};

const updateSessionById = async (id: number, updateBody: any) => {
  await getSessionById(id); // Kiểm tra tồn tại

  return prisma.flashSaleSession.update({
    where: { id },
    data: {
      ...(updateBody.startTime && { startTime: new Date(updateBody.startTime) }),
      ...(updateBody.endTime && { endTime: new Date(updateBody.endTime) }),
      ...(updateBody.status && { status: updateBody.status })
    }
  });
};

const deleteSessionById = async (id: number) => {
  await getSessionById(id);
  // Cascade delete sẽ tự động xóa các cấu hình FlashSaleProduct bên trong phiên này
  return prisma.flashSaleSession.delete({
    where: { id }
  });
};

export default {
  createSession,
  querySessions,
  getSessionById,
  updateSessionById,
  deleteSessionById
};
