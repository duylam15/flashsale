import httpStatus from 'http-status';
import ApiError from '../../utils/ApiError';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 1. Tạo Product kèm theo Inventory (Transaction)
const createProduct = async (data: any) => {
  const { initialStock, ...productData } = data;

  return prisma.product.create({
    data: {
      ...productData,
      inventory: {
        create: {
          totalStock: initialStock,
          reservedStock: 0,
          soldStock: 0,
          version: 1 // Khởi tạo version
        }
      }
    },
    include: { inventory: true }
  });
};

// 2. Lấy danh sách Product (Có phân trang)
const queryProducts = async (filters: any, options: any) => {
  const page = options.page || 1;
  const limit = options.limit || 10;
  const skip = (page - 1) * limit;

  const where = filters.name
    ? { name: { contains: filters.name, mode: 'insensitive' as const } }
    : {};

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take: limit,
      include: { inventory: true }
    }),
    prisma.product.count({ where })
  ]);

  return { products, total, page, limit, totalPages: Math.ceil(total / limit) };
};

// 3. Lấy chi tiết Product
const getProductById = async (id: number) => {
  const product = await prisma.product.findUnique({
    where: { id },
    include: { inventory: true }
  });
  if (!product) throw new ApiError(httpStatus.NOT_FOUND, 'Product not found');
  return product;
};

// 4. Update Product
const updateProductById = async (id: number, updateBody: any) => {
  await getProductById(id); // Check exists
  return prisma.product.update({
    where: { id },
    data: updateBody
  });
};

// 5. Delete Product
const deleteProductById = async (id: number) => {
  await getProductById(id);
  // Cascade delete sẽ tự động xóa Inventory liên quan
  return prisma.product.delete({ where: { id } });
};

// =========================================================================
// GIẢI QUYẾT RACE CONDITION (Dùng cho module Order/FlashSale sau này)
// =========================================================================
const reserveProductStock = async (productId: number, quantity: number) => {
  const MAX_RETRIES = 3; // Thử lại tối đa 3 lần nếu có conflict version

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    // Bước 1: Lấy Inventory hiện tại (để lấy version)
    const inventory = await prisma.inventory.findUnique({ where: { productId } });
    if (!inventory) throw new ApiError(httpStatus.NOT_FOUND, 'Inventory not found');

    const availableStock = inventory.totalStock - inventory.reservedStock - inventory.soldStock;
    if (availableStock < quantity) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Not enough stock available');
    }

    // Bước 2: Thử update với Optimistic Locking
    const updatedResult = await prisma.inventory.updateMany({
      where: {
        productId: productId,
        version: inventory.version // Đảm bảo version chưa bị thay đổi bởi request khác
      },
      data: {
        reservedStock: { increment: quantity }, // Giữ chỗ hàng
        version: { increment: 1 } // Tăng version
      }
    });

    // Nếu count > 0 nghĩa là update thành công (không có ai chen ngang)
    if (updatedResult.count > 0) {
      return true;
    }

    // Nếu count === 0 nghĩa là version đã bị thay đổi, vòng lặp sẽ retry
  }

  // Nếu quá 3 lần vẫn trượt, ném lỗi hệ thống bận
  throw new ApiError(httpStatus.CONFLICT, 'System is busy, please try again');
};

export default {
  createProduct,
  queryProducts,
  getProductById,
  updateProductById,
  deleteProductById,
  reserveProductStock
};
