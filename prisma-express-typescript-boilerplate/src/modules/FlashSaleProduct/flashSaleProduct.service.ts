import httpStatus from 'http-status';
import ApiError from '../../utils/ApiError';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const addProductToSession = async (body: any) => {
  const { sessionId, productId, salePrice, saleStock, userLimit } = body;

  // 1. Kiểm tra phiên Flash Sale có tồn tại không
  const session = await prisma.flashSaleSession.findUnique({ where: { id: sessionId } });
  if (!session) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Flash Sale Session not found');
  }

  // 2. Kiểm tra xem sản phẩm đã có trong phiên này chưa (tránh duplicate)
  const existingProduct = await prisma.flashSaleProduct.findFirst({
    where: { sessionId, productId }
  });
  if (existingProduct) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Product is already in this Flash Sale Session');
  }

  // 3. Kiểm tra kho hàng thực tế (Inventory)
  const inventory = await prisma.inventory.findUnique({ where: { productId } });
  if (!inventory) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Product inventory not found');
  }

  const availableStock = inventory.totalStock - inventory.reservedStock - inventory.soldStock;
  if (availableStock < saleStock) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Not enough stock in inventory. Requested: ${saleStock}, Available: ${availableStock}`
    );
  }

  // 4. Tạo cấu hình Flash Sale cho sản phẩm
  return prisma.flashSaleProduct.create({
    data: { sessionId, productId, salePrice, saleStock, userLimit },
    include: { product: true }
  });
};

const getProductsBySessionId = async (sessionId: number) => {
  return prisma.flashSaleProduct.findMany({
    where: { sessionId },
    include: {
      product: {
        include: { inventory: true } // Lấy kèm thông tin kho nếu cần show lên UI
      }
    }
  });
};

const getFlashSaleProductById = async (id: number) => {
  const fsp = await prisma.flashSaleProduct.findUnique({ where: { id } });
  if (!fsp) throw new ApiError(httpStatus.NOT_FOUND, 'Flash Sale Product not found');
  return fsp;
};

const updateProductInSession = async (id: number, updateBody: any) => {
  const fsp = await getFlashSaleProductById(id);

  // Nếu update saleStock, lý tưởng nhất cũng nên check lại với Inventory gốc
  // (Đoạn này có thể thêm logic tương tự bước 3 ở hàm addProductToSession)

  return prisma.flashSaleProduct.update({
    where: { id: fsp.id },
    data: updateBody
  });
};

const deleteProductFromSession = async (id: number) => {
  const fsp = await getFlashSaleProductById(id);

  return prisma.flashSaleProduct.delete({
    where: { id: fsp.id }
  });
};

export default {
  addProductToSession,
  getProductsBySessionId,
  updateProductInSession,
  deleteProductFromSession
};
