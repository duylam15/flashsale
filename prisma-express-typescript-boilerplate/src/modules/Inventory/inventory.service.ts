import httpStatus from 'http-status';
import ApiError from '../../utils/ApiError';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const getInventoryByProductId = async (productId: number) => {
  const inventory = await prisma.inventory.findUnique({
    where: { productId },
    include: { product: true }
  });

  if (!inventory) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Inventory not found for this product');
  }

  return inventory;
};

/**
 * Cập nhật tổng số lượng kho (Restock) an toàn với Optimistic Locking
 */
const updateInventoryStock = async (productId: number, totalStock: number) => {
  // 1. Lấy inventory hiện tại để biết version đang là bao nhiêu
  const currentInventory = await getInventoryByProductId(productId);

  // 2. Thử update với điều kiện version phải khớp
  const updateResult = await prisma.inventory.updateMany({
    where: {
      productId: productId,
      version: currentInventory.version // Khóa lạc quan (Optimistic Lock)
    },
    data: {
      totalStock: totalStock,
      version: { increment: 1 } // Tự động tăng version lên 1 sau khi update thành công
    }
  });

  // 3. Nếu count === 0 nghĩa là đã có luồng khác chen ngang thay đổi version
  if (updateResult.count === 0) {
    throw new ApiError(
      httpStatus.CONFLICT,
      'Data conflict: Inventory was updated by another process. Please refresh and try again.'
    );
  }

  // Trả về data mới nhất sau khi update thành công
  return getInventoryByProductId(productId);
};

export default {
  getInventoryByProductId,
  updateInventoryStock
};
