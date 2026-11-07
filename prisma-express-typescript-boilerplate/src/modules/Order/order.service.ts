import httpStatus from 'http-status';
import ApiError from '../../utils/ApiError';
import { PrismaClient } from '@prisma/client';
import redis from '../../config/redis';

const prisma = new PrismaClient();

interface OrderItemInput {
  productId: number;
  quantity: number;
}

// Định nghĩa Lua script kiểm tra tồn kho, chống mua trùng và đẩy vào Stream
const flashSaleScript = `
local stockKey = KEYS[1]
local userSetKey = KEYS[2]
local userId = ARGV[1]
local quantity = tonumber(ARGV[2])
local streamName = ARGV[3]
local productId = ARGV[4]

if redis.call('SISMEMBER', userSetKey, userId) == 1 then
    return -1
end

local currentStock = tonumber(redis.call('GET', stockKey))
if not currentStock or currentStock < quantity then
    return -2
end

redis.call('DECRBY', stockKey, quantity)
redis.call('SADD', userSetKey, userId)
redis.call('XADD', streamName, '*', 'userId', userId, 'productId', productId, 'quantity', quantity)

return 1
`;

export const orderService = {
  /**
   * 1. FLASH SALE ORDER (Redis Lua Script + Redis Streams - Siêu tốc)
   */
  async flashSaleOrder(userId: number, productId: number, quantity: number = 1) {
    const stockKey = `flashsale:stock:${productId}`;
    const userSetKey = `flashsale:buyers:${productId}`;
    const streamName = 'flash-sale-stream';

    // Gọi Lua Script atomic trên Redis
    const result = await redis.eval(
      flashSaleScript,
      2, // Số lượng KEYS truyền vào
      stockKey,
      userSetKey,
      userId.toString(),
      quantity,
      streamName,
      productId
    );

    // Xử lý kết quả trả về từ Lua script
    if (result === -1) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Bạn đã mua sản phẩm này trong chương trình Flash Sale rồi.');
    }
    if (result === -2) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Sản phẩm đã hết hàng hoặc số lượng không đủ.');
    }

    // Trả về thành công ngay lập tức để đạt performance cao (không block chờ ghi DB)
    return {
      success: true,
      message: 'Đặt hàng Flash Sale thành công! Đơn hàng đang được xử lý.',
      productId,
      quantity,
    };
  },

  /**
   * 2. TẠO ĐƠN HÀNG THƯỜNG (E-commerce cũ qua PostgreSQL)
   */
  async createOrder(userId: number, items: OrderItemInput[]) {
    if (!items || items.length === 0) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Cart items cannot be empty');
    }

    return prisma.$transaction(async (tx) => {
      const productIds = items.map((i) => i.productId);
      const products = await tx.product.findMany({
        where: { id: { in: productIds } },
      });
      const productMap = new Map(products.map((p) => [p.id, p]));
      let totalAmount = 0;
      const orderItemsData = [];

      for (const item of items) {
        const product = productMap.get(item.productId);
        if (!product) {
          throw new ApiError(httpStatus.NOT_FOUND, `Product not found for ID: ${item.productId}`);
        }
        const priceAtPurchase = product.basePrice;
        totalAmount += Number(priceAtPurchase) * item.quantity;
        orderItemsData.push({
          productId: item.productId,
          quantity: item.quantity,
          priceAtPurchase,
        });

        const affectedRows = await tx.$executeRaw`
          UPDATE "Inventory" 
          SET "reservedStock" = "reservedStock" + ${item.quantity}, "version" = "version" + 1 
          WHERE "productId" = ${item.productId} AND ("totalStock" - "reservedStock" - "soldStock") >= ${item.quantity}
        `;
        if (affectedRows === 0) {
          throw new ApiError(httpStatus.BAD_REQUEST, `Not enough stock for product: ${product.name}`);
        }
      }

      const order = await tx.order.create({
        data: {
          userId,
          totalAmount,
          status: 'PENDING',
          orderItems: {
            create: orderItemsData,
          },
        },
        include: { orderItems: true },
      });
      return order;
    }, {
      maxWait: 10000,
      timeout: 15000,
    });
  },

  /**
   * 3. HÀM CACHE WARMING: Đưa tồn kho từ DB lên Redis
   */
  /**
  * 4. HÀM CACHE WARMING: Đưa tồn kho từ DB lên Redis (Hỗ trợ set số lượng tuỳ chỉnh)
  */

  async setupFlashSaleCache(
    productIds: number[],
    customStock?: number
  ) {
    const startTime = Date.now();
    const TTL = 24 * 60 * 60;

    // 1. Kiểm tra dữ liệu đầu vào
    if (
      !Array.isArray(productIds) ||
      productIds.length === 0 ||
      productIds.some(
        (id) => !Number.isSafeInteger(id) || id <= 0
      )
    ) {
      throw new Error('productIds không hợp lệ');
    }

    if (
      customStock !== undefined &&
      customStock !== null &&
      (!Number.isSafeInteger(customStock) || customStock < 0)
    ) {
      throw new Error('customStock không hợp lệ');
    }

    const ids = [...new Set(productIds)];

    try {
      console.log(
        `[WARMUP] Bắt đầu khởi tạo ${ids.length} sản phẩm`
      );

      // 2. Xác định tồn kho cần nạp
      const stocks: Array<{
        productId: number;
        stock: number;
      }> = [];

      if (customStock !== undefined && customStock !== null) {
        // Chế độ test: sử dụng stock tùy chỉnh.
        // Chỉ dùng trong môi trường kiểm thử.
        for (const productId of ids) {
          stocks.push({
            productId,
            stock: customStock,
          });
        }
      } else {
        // Chế độ thông thường: lấy tồn kho từ PostgreSQL.
        const products = await prisma.product.findMany({
          where: {
            id: { in: ids },
          },
          include: {
            inventory: true,
          },
        });

        if (products.length !== ids.length) {
          throw new Error('Không tìm thấy đủ sản phẩm');
        }

        for (const product of products) {
          if (!product.inventory) {
            throw new Error(
              `Sản phẩm ${product.id} chưa có Inventory`
            );
          }

          const inventory = product.inventory;

          const availableStock = Math.max(
            0,
            inventory.totalStock -
            inventory.reservedStock -
            inventory.soldStock
          );

          stocks.push({
            productId: product.id,
            stock: availableStock,
          });
        }
      }

      // 3. Chỉ reset key của các sản phẩm đang warmup.
      // Pipeline giúp giảm số lần trao đổi mạng với Redis.
      const pipeline = redis.pipeline();

      for (const item of stocks) {
        const stockKey = `flashsale:stock:${item.productId}`;
        const buyersKey = `flashsale:buyers:${item.productId}`;

        pipeline.del(buyersKey);

        pipeline.set(
          stockKey,
          item.stock,
          'EX',
          TTL
        );
      }

      const results = await pipeline.exec();

      if (
        !results ||
        results.length !== ids.length * 2 ||
        results.some(([error]) => error !== null)
      ) {
        throw new Error('Cache warming thất bại');
      }

      const durationMs = Date.now() - startTime;

      console.log(
        `[WARMUP] Thành công | ` +
        `Products=${ids.length} | ` +
        `Duration=${durationMs}ms`
      );

      return {
        success: true,
        message: 'Đã khởi tạo Redis Cache thành công',
        products: stocks,
        durationMs,
      };
    } catch (error) {
      console.error('[WARMUP ERROR]', error);
      throw error;
    }
  },


  /**
   * 4. TRUY VẤN ĐƠN HÀNG
   */
  async queryOrders(filters: any, options: any) {
    const page = options.page || 1;
    const limit = options.limit || 10;
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where: filters,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { orderItems: { include: { product: true } } },
      }),
      prisma.order.count({ where: filters }),
    ]);

    return {
      orders,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  /**
   * 5. LẤY CHI TIẾT ĐƠN HÀNG THEO ID
   */
  async getOrderById(id: number) {
    const order = await prisma.order.findUnique({
      where: { id },
      include: { orderItems: { include: { product: true } }, user: true },
    });
    if (!order) throw new ApiError(httpStatus.NOT_FOUND, 'Order not found');
    return order;
  },

  /**
   * 6. Xử lý thanh toán thành công
   */
  async markOrderAsPaid(orderId: number) {
    return prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { orderItems: true },
      });
      if (!order || order.status !== 'PENDING') throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid order status');

      for (const item of order.orderItems) {
        await tx.inventory.update({
          where: { productId: item.productId },
          data: {
            reservedStock: { decrement: item.quantity },
            soldStock: { increment: item.quantity },
            version: { increment: 1 },
          },
        });
      }

      return tx.order.update({
        where: { id: orderId },
        data: { status: 'PAID' },
      });
    });
  },

  /**
   * 7. Hủy đơn hàng
   */
  async cancelOrder(orderId: number) {
    return prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { orderItems: true },
      });
      if (!order || order.status !== 'PENDING') {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Only PENDING orders can be cancelled');
      }

      for (const item of order.orderItems) {
        await tx.inventory.update({
          where: { productId: item.productId },
          data: {
            reservedStock: { decrement: item.quantity },
            version: { increment: 1 },
          },
        });
      }

      return tx.order.update({
        where: { id: orderId },
        data: { status: 'CANCELLED' },
      });
    });
  },
};

export default orderService;