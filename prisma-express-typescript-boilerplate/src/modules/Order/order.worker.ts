import { Redis } from 'ioredis';
import httpStatus from 'http-status';
import ApiError from '../../utils/ApiError';
import { PrismaClient } from '@prisma/client';
import redis from '../../config/redis';

const prisma = new PrismaClient();

const STREAM_NAME = 'flash-sale-stream';
const CONSUMER_GROUP = 'order-processing-group';
const CONSUMER_NAME = `worker-${process.pid}`;

async function setupConsumerGroup() {
  try {
    await redis.xgroup('CREATE', STREAM_NAME, CONSUMER_GROUP, '0', 'MKSTREAM');
  } catch (error) {
    // Nhóm có thể đã tồn tại, bỏ qua lỗi này
  }
}

export async function startFlashSaleWorker() {
  await setupConsumerGroup();
  console.log(`🚀 Flash Sale Worker started: ${CONSUMER_NAME}`);

  while (true) {
    try {
      // Đọc tin nhắn từ Stream theo cơ chế Consumer Group
      const response = await (redis as any).xreadgroup(
        'GROUP',
        CONSUMER_GROUP,
        CONSUMER_NAME,
        'BLOCK',
        5000,
        'COUNT',
        100,
        'STREAMS',
        STREAM_NAME,
        '>'
      );

      if (response) {
        for (const [stream, messages] of response) {
          for (const [messageId, fields] of messages) {
            if (!fields) continue;

            const data: Record<string, string> = {};
            for (let i = 0; i < fields.length; i += 2) {
              data[fields[i]] = fields[i + 1];
            }

            const { userId, productId, quantity } = data;
            const numUserId = Number(userId);
            const numProductId = Number(productId);
            const numQuantity = parseInt(quantity, 10);

            try {
              // Giao dịch DB: Tạo Order trong PostgreSQL
              await prisma.$transaction(async (tx) => {
                const product = await tx.product.findUnique({
                  where: { id: numProductId },
                });

                if (!product) {
                  throw new Error(`Product not found: ${numProductId}`);
                }

                const priceAtPurchase = product.basePrice;
                const totalAmount = Number(priceAtPurchase) * numQuantity;

                await tx.order.create({
                  data: {
                    userId: numUserId,
                    totalAmount,
                    status: 'PAID',
                    orderItems: {
                      create: {
                        productId: numProductId,
                        quantity: numQuantity,
                        priceAtPurchase,
                      },
                    },
                  },
                });
              });

              // Xác nhận đã xử lý xong message (XACK)
              await redis.xack(STREAM_NAME, CONSUMER_GROUP, messageId);
            } catch (dbError) {
              console.error(`Lỗi khi ghi DB cho message ${messageId}:`, dbError);
            }
          }
        }
      }
    } catch (err: any) {
      console.error('Lỗi ở Worker loop:', err.message || err);
      
      // 🛑 QUAN TRỌNG: Thêm độ trễ 3 giây khi gặp sự cố mạng/Redis ngắt kết nối
      // để tránh vòng lặp vô tận gây quá tải CPU và rác log.
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }
}