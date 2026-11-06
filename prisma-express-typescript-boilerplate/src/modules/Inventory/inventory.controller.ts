import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import inventoryService from './inventory.service';

const getInventory = catchAsync(async (req, res) => {
  const productId = parseInt(req.params.productId, 10);
  const inventory = await inventoryService.getInventoryByProductId(productId);

  res.send({ status: 'success', data: inventory });
});

const updateInventory = catchAsync(async (req, res) => {
  const productId = parseInt(req.params.productId, 10);
  const { totalStock } = req.body;

  const updatedInventory = await inventoryService.updateInventoryStock(productId, totalStock);

  res.send({ status: 'success', data: updatedInventory });
});

export default {
  getInventory,
  updateInventory
};
