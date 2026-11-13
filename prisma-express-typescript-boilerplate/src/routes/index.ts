import express from 'express';

// Cập nhật đường dẫn import trỏ đến các file .route.ts trong thư mục modules
import userRoute from '../modules/User/user.route'; // Sửa lại tên file nếu của bạn khác
import authRoute from '../modules/Auth/auth.route'; // Sửa lại tên file nếu của bạn khác
import productRoute from '../modules/Product/product.route';
import orderRoute from '../modules/Order/order.route';
import orderItemRoute from '../modules/OrderItem/orderItem.route';
import inventoryRoute from '../modules/Inventory/inventory.route';
import flashSaleProductRoute from '../modules/FlashSaleProduct/flashSaleProduct.route';
// import flashSaleSessionRoute from '../modules/FlashSaleSession/flashSaleSession.route';
import loadTestRoute from '../modules/LoadTest/loadTest.route';
import loadTestResultRoute from '../modules/LoadTestResult/loadTestResult.route';
const router = express.Router();

const defaultRoutes = [
  {
    path: '/auth',
    route: authRoute
  },
  {
    path: '/users',
    route: userRoute
  },
  {
    path: '/products',
    route: productRoute
  },
  {
    path: '/orders',
    route: orderRoute
  },
  {
    path: '/order-items',
    route: orderItemRoute
  },
  {
    path: '/inventories',
    route: inventoryRoute
  },
  {
    path: '/flash-sale-products',
    route: flashSaleProductRoute
  },
  // {
  //   path: '/flash-sale-sessions',
  //   route: flashSaleSessionRoute
  // },
  {
  path: '/load-test-results',
  route: loadTestResultRoute,
},
  {
    path: '/load-tests',
    route: loadTestRoute
  }
];

defaultRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

export default router;
