import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import orderService from './order.service';
import { Request, Response } from 'express';

// 1. API cho Admin bơm tồn kho lên Redis (Cache Warming)
export const warmUpCacheAPI = async (req: Request, res: Response) => {
  try {
    const { productIds, stock } = req.body; // 👈 Cho phép truyền thêm stock từ request body
    
    // Truyền stock vào service (nếu có)
    await orderService.setupFlashSaleCache(productIds, stock);
    
    return res.status(200).json({ 
      status: 'success',
      message: `Đã bơm tồn kho ${stock ? `(SL: ${stock})` : 'từ DB'} lên Redis thành công!` 
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Lỗi Cache Warming', error: error.message });
  }
};

// 2. API Flash Sale cho User bấm mua (Xử lý qua Redis Lua + Streams)
const flashSaleOrder = catchAsync(async (req: any, res: Response) => {
  const userId = req.user.id;
  const { productId, quantity } = req.body;

  // Gọi service chạy qua Redis Lua + Streams
  const result = await orderService.flashSaleOrder(userId, productId, quantity || 1);

  return res.status(httpStatus.CREATED).send({
    status: 'success',
    data: result,
  });
});

// 3. API Mua hàng thông thường (E-commerce cũ qua PostgreSQL)
const createOrder = catchAsync(async (req: any, res: Response) => {
  const userId = req.user.id;
  const order = await orderService.createOrder(userId, req.body.items);
  res.status(httpStatus.CREATED).send({ status: 'success', data: order });
});

const getOrders = catchAsync(async (req: any, res: Response) => {
  const filters: any = { status: req.query.status };
  if (req.user.role === 'USER') {
    filters.userId = req.user.id;
  }
  const options = {
    limit: parseInt(req.query.limit as string, 10),
    page: parseInt(req.query.page as string, 10),
  };
  const result = await orderService.queryOrders(filters, options);
  res.send({ status: 'success', data: result });
});

const getOrder = catchAsync(async (req: any, res: Response) => {
  const orderId = parseInt(req.params.orderId, 10);
  const order = await orderService.getOrderById(orderId);
  if (req.user.role === 'USER' && order.userId !== req.user.id) {
    return res.status(httpStatus.FORBIDDEN).send({ message: 'Forbidden' });
  }
  res.send({ status: 'success', data: order });
});

const updateOrderStatus = catchAsync(async (req: Request, res: Response) => {
  const orderId = parseInt(req.params.orderId, 10);
  const { status } = req.body;
  let order;
  if (status === 'PAID') {
    order = await orderService.markOrderAsPaid(orderId);
  } else if (status === 'CANCELLED') {
    order = await orderService.cancelOrder(orderId);
  }
  res.send({ status: 'success', data: order });
});

// Export đầy đủ các hàm
export default {
  createOrder,
  getOrders,
  getOrder,
  updateOrderStatus,
  warmUpCacheAPI,
  flashSaleOrder,
};