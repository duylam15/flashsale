import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import authService from './auth.service';
import tokenService from './token.service';
import config from '../../config/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient(); // Khởi tạo Prisma Client

// Cấu hình chuẩn cho Cookie
const cookieOptions = {
  httpOnly: true, // Chống XSS (Client script không đọc được cookie này)
  secure: config.env === 'production', // Gửi qua HTTPS ở production
  sameSite: 'strict' as const,
  maxAge: 30 * 24 * 60 * 60 * 1000, // Sống 30 ngày (Đã sửa lại dấu nhân *)
};

const register = catchAsync(async (req, res) => {
  const user = await authService.register(req.body);
  const tokens = tokenService.generateAuthTokens(user.id);

  // Tự động set cookie vào Postman/Browser
  res.cookie('accessToken', tokens.access.token, cookieOptions);

  res.status(httpStatus.CREATED).send({ status: 'success', data: { user, tokens } });
});

const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;
  const user = await authService.loginUserWithEmailAndPassword(email, password);
  const tokens = tokenService.generateAuthTokens(user.id);

  // Tự động set cookie vào Postman/Browser
  res.cookie('accessToken', tokens.access.token, cookieOptions);

  res.send({ status: 'success', data: { user, tokens } });
});

const logout = catchAsync(async (req, res) => {
  // Xóa cookie để đăng xuất
  res.clearCookie('accessToken');
  res.status(httpStatus.NO_CONTENT).send();
});

const generateTokens = catchAsync(async (req, res) => {
  const count = Number(req.body.count) || 100;
  const startId = Number(req.body.startId) || 1;

  // 1. Chuẩn bị password hash chung cho user mock
  const defaultPassword = await bcrypt.hash('password123', 10);

  // 2. Chuẩn bị danh sách user và token
  const usersToInsert = [];
  const result = [];

  for (let i = 0; i < count; i++) {
    const currentUserId = startId + i;

    usersToInsert.push({
      id: currentUserId,
      email: `mock_user_${currentUserId}@example.com`,
      name: `Test User ${currentUserId}`,
      password: defaultPassword,
    });

    const tokens = tokenService.generateAuthTokens(currentUserId);
    result.push({
      userId: currentUserId,
      token: tokens.access.token,
      expires: tokens.access.expires,
    });
  }

  // 3. Chèn vào database, bỏ qua nếu user đã tồn tại (skipDuplicates)
  await prisma.user.createMany({
    data: usersToInsert,
    skipDuplicates: true,
  });

  res.status(httpStatus.OK).send({
    status: 'success',
    data: {
      total: result.length,
      users: result,
    },
  });
});

export default {
  register,
  login,
  logout,
  generateTokens,
};