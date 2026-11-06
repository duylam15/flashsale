import express from 'express';
import auth, { authFlashSale } from '../../middlewares/auth';
import validate from '../../middlewares/validate';
import orderValidation from './order.validation';
import orderController from './order.controller';

const router = express.Router();

// ==========================================
// 1. ROUTES DÀNH CHO FLASH SALE
// ==========================================

// API cho Admin bơm tồn kho lên Redis (Cache Warming)
// Method: POST /v1/orders/warmup-cache
router
  .route('/warmup-cache')
  .post(
    orderController.warmUpCacheAPI
  );

router.route('/flash-sale').post(authFlashSale, orderController.flashSaleOrder);

// API cho User bấm "Mua ngay" trong đợt Flash Sale
// Method: POST /v1/orders/flash-sale

// ==========================================
// 2. ROUTES DÀNH CHO MUA HÀNG THÔNG THƯỜNG (E-COMMERCE CŨ)
// ==========================================

router
  .route('/')
  .post(
    auth(),
    validate(orderValidation.createOrder),
    orderController.createOrder
  )
  .get(
    auth(),
    validate(orderValidation.getOrders),
    orderController.getOrders
  );

router
  .route('/:orderId')
  .get(
    auth(),
    validate(orderValidation.getOrder),
    orderController.getOrder
  );

router
  .route('/:orderId/status')
  .patch(
    auth('ADMIN'),
    validate(orderValidation.updateOrderStatus),
    orderController.updateOrderStatus
  );

export default router;