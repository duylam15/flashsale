import express from 'express';
import auth from '../../middlewares/auth';
import validate from '../../middlewares/validate';
import fspValidation from './flashSaleProduct.validation';
import fspController from './flashSaleProduct.controller';

const router = express.Router();

router.route('/').post(
  // auth('ADMIN'), // Chỉ Admin được set sản phẩm vào Flash Sale
  validate(fspValidation.addProduct),
  fspController.addProduct
);

// Route lấy danh sách sản phẩm trong 1 phiên (Public cho user xem)
router
  .route('/session/:sessionId')
  .get(validate(fspValidation.getSessionProducts), fspController.getSessionProducts);

router
  .route('/:id')
  .patch(auth('ADMIN'), validate(fspValidation.updateProduct), fspController.updateProduct)
  .delete(auth('ADMIN'), validate(fspValidation.removeProduct), fspController.removeProduct);

export default router;
