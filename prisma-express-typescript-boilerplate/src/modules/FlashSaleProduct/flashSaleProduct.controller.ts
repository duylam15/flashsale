import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import fspService from './flashSaleProduct.service';

const addProduct = catchAsync(async (req, res) => {
  const data = await fspService.addProductToSession(req.body);
  res.status(httpStatus.CREATED).send({ status: 'success', data });
});

const getSessionProducts = catchAsync(async (req, res) => {
  const sessionId = parseInt(req.params.sessionId, 10);
  const data = await fspService.getProductsBySessionId(sessionId);
  res.send({ status: 'success', data });
});

const updateProduct = catchAsync(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const data = await fspService.updateProductInSession(id, req.body);
  res.send({ status: 'success', data });
});

const removeProduct = catchAsync(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  await fspService.deleteProductFromSession(id);
  res.status(httpStatus.NO_CONTENT).send();
});

export default {
  addProduct,
  getSessionProducts,
  updateProduct,
  removeProduct
};
