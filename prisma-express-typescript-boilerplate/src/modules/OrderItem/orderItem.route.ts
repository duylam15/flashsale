import express from 'express';
import auth from '../../middlewares/auth';
import validate from '../../middlewares/validate';
import orderItemValidation from './orderItem.validation';
import orderItemController from './orderItem.controller';

const router = express.Router();

router.route('/').get(
  auth('ADMIN'), // Giới hạn chỉ Admin mới được tra cứu toàn bộ list OrderItems
  validate(orderItemValidation.getOrderItems),
  orderItemController.getOrderItems
);

router
  .route('/:id')
  .get(auth('ADMIN'), validate(orderItemValidation.getOrderItem), orderItemController.getOrderItem);

export default router;
