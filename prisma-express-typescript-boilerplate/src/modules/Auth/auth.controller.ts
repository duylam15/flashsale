import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import authService from './auth.service';
import tokenService from './token.service';
import config from '../../config/config';
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

  // Giới hạn để tránh tạo quá nhiều token ngoài ý muốn
  if (
    !Number.isInteger(count) ||
    count < 1 ||
    count > 10000 ||
    !Number.isInteger(startId) ||
    startId < 1
  ) {
    return res.status(httpStatus.BAD_REQUEST).send({
      status: 'error',
      message: 'count phải từ 1 đến 3000 và startId phải >= 1',
    });
  }

  const users = Array.from({ length: count }, (_, i) => {
    const userId = startId + i;
    const tokens = tokenService.generateAuthTokens(userId);

    return {
      userId,
      token: tokens.access.token,
      expires: tokens.access.expires,
    };
  });

  return res.status(httpStatus.OK).send({
    status: 'success',
    data: {
      total: users.length,
      users,
    },
  });
});

export default {
  register,
  login,
  logout,
  generateTokens,
};