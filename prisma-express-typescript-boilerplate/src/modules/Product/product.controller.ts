import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import productService from './product.service';

const createProduct = catchAsync(async (req, res) => {
  const product = await productService.createProduct(req.body);
  res.status(httpStatus.CREATED).send({ status: 'success', data: product });
});

const getProducts = catchAsync(async (req, res) => {
  // Lấy các field phục vụ filter/pagination
  const filters = { name: req.query.name };
  const options = {
    limit: parseInt(req.query.limit as string, 10),
    page: parseInt(req.query.page as string, 10)
  };

  const result = await productService.queryProducts(filters, options);
  res.send({ status: 'success', data: result });
});

const getProduct = catchAsync(async (req, res) => {
  const productId = parseInt(req.params.productId, 10);
  const product = await productService.getProductById(productId);
  res.send({ status: 'success', data: product });
});

const updateProduct = catchAsync(async (req, res) => {
  const productId = parseInt(req.params.productId, 10);
  const product = await productService.updateProductById(productId, req.body);
  res.send({ status: 'success', data: product });
});

const deleteProduct = catchAsync(async (req, res) => {
  const productId = parseInt(req.params.productId, 10);
  await productService.deleteProductById(productId);
  res.status(httpStatus.NO_CONTENT).send();
});

export default {
  createProduct,
  getProducts,
  getProduct,
  updateProduct,
  deleteProduct
};
