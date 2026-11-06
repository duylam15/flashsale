import passport from 'passport';
import httpStatus from 'http-status';
import ApiError from '../utils/ApiError';
import { roleRights } from '../config/roles';
import { NextFunction, Request, Response } from 'express';
import { User } from '@prisma/client';
import jwt from 'jsonwebtoken';

const verifyCallback =
  (
    req: any,
    resolve: (value?: unknown) => void,
    reject: (reason?: unknown) => void,
    requiredRights: string[]
  ) =>
  async (err: unknown, user: User | false, info: unknown) => {
    if (err || info || !user) {
      return reject(new ApiError(httpStatus.UNAUTHORIZED, 'Please authenticate'));
    }
    req.user = user;

    if (requiredRights.length) {
      const userRights = roleRights.get(user.role) ?? [];
      const hasRequiredRights = requiredRights.every((requiredRight) =>
        userRights.includes(requiredRight)
      );
      if (!hasRequiredRights && req.params.userId !== user.id) {
        return reject(new ApiError(httpStatus.FORBIDDEN, 'Forbidden'));
      }
    }

    resolve();
  };

const auth =
  (...requiredRights: string[]) =>
  async (req: Request, res: Response, next: NextFunction) => {
    return new Promise((resolve, reject) => {
      passport.authenticate(
        'jwt',
        { session: false },
        verifyCallback(req, resolve, reject, requiredRights)
      )(req, res, next);
    })
      .then(() => next())
      .catch((err) => next(err));
  };


/**
 * Middleware xác thực siêu nhẹ dành riêng cho Flash Sale.
 * CHỈ verify chữ ký của Token (chạy trên RAM), TUYỆT ĐỐI KHÔNG gọi Database.
 */
export const authFlashSale = (req: any, res: Response, next: NextFunction) => {
  try {
    // 1. Lấy token từ header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(httpStatus.UNAUTHORIZED).json({ message: 'Vui lòng đăng nhập!' });
    }

    const token = authHeader.split(' ')[1];

    // 2. Verify token bằng Secret Key (Giống hệt secret key bạn đang dùng để tạo token)
    // Thay 'YOUR_JWT_SECRET' bằng process.env.JWT_SECRET hoặc config.jwt.secret của bạn
    const secretKey = process.env.JWT_SECRET || 'YOUR_JWT_SECRET'; 
    const payload: any = jwt.verify(token, secretKey);

    // 3. Gắn thẳng ID từ payload vào req.user
    // Lưu ý: Tùy thuộc vào lúc generate token bạn lưu ID ở field nào (thường là 'sub' hoặc 'id')
    req.user = { 
      id: payload.sub || payload.id 
    };

    // 4. Cho phép đi tiếp vào Controller
    next();
  } catch (error) {
    return res.status(httpStatus.UNAUTHORIZED).json({ message: 'Token không hợp lệ hoặc đã hết hạn' });
  }
};

export default auth;
