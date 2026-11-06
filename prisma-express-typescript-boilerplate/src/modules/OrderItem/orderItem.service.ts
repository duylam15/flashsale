import httpStatus from 'http-status';
import ApiError from '../../utils/ApiError';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const queryOrderItems = async (filters: any, options: any) => {
  const page = options.page || 1;
  const limit = options.limit || 10;
  const skip = (page - 1) * limit;

  const [orderItems, total] = await Promise.all([
    prisma.orderItem.findMany({
      where: filters,
      skip,
      take: limit,
      // cast include to any to avoid strict generated type mismatch for relation name
      include: ({
        product: true, // Lấy thông tin sản phẩm
        order: { select: { userId: true, status: true, createdAt: true } } // Lấy thông tin cơ bản của đơn hàng
      } as any)
    }),
    prisma.orderItem.count({ where: filters })
  ]);

  return { orderItems, total, page, limit, totalPages: Math.ceil(total / limit) };
};

const getOrderItemById = async (id: number) => {
  const orderItem = await prisma.orderItem.findUnique({
    where: { id },
    include: ({ product: true, order: true } as any)
  });

  if (!orderItem) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Order Item not found');
  }

  return orderItem;
};

export default {
  queryOrderItems,
  getOrderItemById
};
