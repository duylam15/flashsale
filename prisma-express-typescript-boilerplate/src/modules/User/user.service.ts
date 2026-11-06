import httpStatus from 'http-status';
import ApiError from '../../utils/ApiError';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs'; // Đừng quên cài đặt: npm i bcryptjs && npm i -D @types/bcryptjs

const prisma = new PrismaClient();

// Helper: Xóa field password khỏi object trả về
const excludePassword = (user: any) => {
  if (user) {
    delete user.password;
  }
  return user;
};

const isEmailTaken = async (email: string, excludeUserId?: number) => {
  const user = await prisma.user.findFirst({
    where: {
      email,
      NOT: excludeUserId ? { id: excludeUserId } : undefined
    }
  });
  return !!user;
};

const createUser = async (userBody: any) => {
  if (await isEmailTaken(userBody.email)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
  }

  // Mã hóa mật khẩu
  const hashedPassword = await bcrypt.hash(userBody.password, 10);

  const user = await prisma.user.create({
    data: {
      ...userBody,
      password: hashedPassword
    }
  });

  return excludePassword(user);
};

const queryUsers = async (filters: any, options: any) => {
  const page = options.page || 1;
  const limit = options.limit || 10;
  const skip = (page - 1) * limit;

  const where: any = {};
  if (filters.name) where.name = { contains: filters.name, mode: 'insensitive' };
  if (filters.email) where.email = filters.email;
  if (filters.role) where.role = filters.role;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      // Không lấy cột password
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isEmailVerified: true,
        createdAt: true,
        updatedAt: true
      }
    }),
    prisma.user.count({ where })
  ]);

  return { users, total, page, limit, totalPages: Math.ceil(total / limit) };
};

const getUserById = async (id: number) => {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  return excludePassword(user);
};

const updateUserById = async (id: number, updateBody: any) => {
  const user = await getUserById(id);

  if (updateBody.email && (await isEmailTaken(updateBody.email, id))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
  }

  const updateData = { ...updateBody };
  if (updateBody.password) {
    updateData.password = await bcrypt.hash(updateBody.password, 10);
  }

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: updateData
  });

  return excludePassword(updatedUser);
};

const deleteUserById = async (id: number) => {
  const user = await getUserById(id);
  // Khi xóa User, các Order liên quan có thể bị lỗi foreign key nếu không cài đặt onDelete: Cascade ở Prisma
  // Hãy đảm bảo bạn đã cân nhắc việc giữ lại Order của user (Soft delete) hay xóa hoàn toàn.
  const deletedUser = await prisma.user.delete({ where: { id: user.id } });
  return excludePassword(deletedUser);
};

export default {
  createUser,
  queryUsers,
  getUserById,
  updateUserById,
  deleteUserById
};
