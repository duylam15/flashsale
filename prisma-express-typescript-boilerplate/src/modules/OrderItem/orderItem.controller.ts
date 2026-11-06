import catchAsync from '../../utils/catchAsync';
import orderItemService from './orderItem.service';

const getOrderItems = catchAsync(async (req, res) => {
  const filters: any = {};
  if (req.query.orderId) filters.orderId = parseInt(req.query.orderId as string, 10);
  if (req.query.productId) filters.productId = parseInt(req.query.productId as string, 10);

  const options = {
    limit: parseInt(req.query.limit as string, 10),
    page: parseInt(req.query.page as string, 10)
  };

  const result = await orderItemService.queryOrderItems(filters, options);
  res.send({ status: 'success', data: result });
});

const getOrderItem = catchAsync(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const orderItem = await orderItemService.getOrderItemById(id);
  res.send({ status: 'success', data: orderItem });
});

export default {
  getOrderItems,
  getOrderItem
};
