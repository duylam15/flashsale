import httpStatus from 'http-status';
import ApiError from '../../utils/ApiError';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import userService from '../User/user.service'; // Tái sử dụng hàm createUser từ module User

const prisma = new PrismaClient();

const loginUserWithEmailAndPassword = async (email: string, password: string) => {
  // Lấy user từ DB (bao gồm cả password để check)
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Incorrect email or password');
  }

  // Loại bỏ password trước khi trả về
  const { password: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
};

export default {
  loginUserWithEmailAndPassword,
  register: userService.createUser // Gọi thẳng qua service của User
};
