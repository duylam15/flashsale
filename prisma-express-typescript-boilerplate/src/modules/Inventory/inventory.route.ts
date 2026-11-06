import express from 'express';
import auth from '../../middlewares/auth';
import validate from '../../middlewares/validate';
import inventoryValidation from './inventory.validation';
import inventoryController from './inventory.controller';

const router = express.Router();

router
  .route('/:productId')
  .get(
    auth('ADMIN'), // Chỉ Admin mới được tra cứu chi tiết xuất/nhập/tồn kho
    validate(inventoryValidation.getInventory),
    inventoryController.getInventory
  )
  .patch(
    auth('ADMIN'), // Chỉ Admin mới được phép điều chỉnh tổng tồn kho (Restock)
    validate(inventoryValidation.updateInventory),
    inventoryController.updateInventory
  );

export default router;
