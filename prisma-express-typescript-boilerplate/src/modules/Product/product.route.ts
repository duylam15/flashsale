import express from 'express';
import auth from '../../middlewares/auth';
import validate from '../../middlewares/validate';
import productValidation from './product.validation';
import productController from './product.controller';

const router = express.Router();

router
  .route('/')
  .post(
    auth('ADMIN'), // Chỉ Admin được tạo sản phẩm
    validate(productValidation.createProduct),
    productController.createProduct
  )
  .get(
    validate(productValidation.getProducts),
    productController.getProducts // API này public, User hay Guest đều gọi được
  );

router
  .route('/:productId')
  .get(validate(productValidation.getProduct), productController.getProduct)
  .patch(auth('ADMIN'), validate(productValidation.updateProduct), productController.updateProduct)
  .delete(
    auth('ADMIN'),
    validate(productValidation.deleteProduct),
    productController.deleteProduct
  );

export default router;
