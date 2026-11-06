import prisma from '../client';
import { Strategy as JwtStrategy, ExtractJwt, VerifyCallback } from 'passport-jwt';
import config from './config';
import { TokenType } from '@prisma/client';
import { Request } from 'express'; // Thêm dòng này để định nghĩa kiểu cho req

// 1. Tạo hàm trích xuất token từ Cookie
const cookieExtractor = (req: Request) => {
  let token = null;
  if (req && req.cookies) {
    token = req.cookies['accessToken']; // Trùng với tên cookie bạn đã set ở hàm Login
  }
  return token;
};

// 2. Cập nhật lại cấu hình
const jwtOptions = {
  secretOrKey: config.jwt.secret,
  // Dùng từ mảng các Extractor: Ưu tiên Header trước, nếu trống thì tìm trong Cookie
  jwtFromRequest: ExtractJwt.fromExtractors([
    ExtractJwt.fromAuthHeaderAsBearerToken(),
    cookieExtractor
  ])
};

const jwtVerify: VerifyCallback = async (payload, done) => {
  try {
    if (payload.type !== TokenType.ACCESS) {
      throw new Error('Invalid token type');
    }
    const user = await prisma.user.findUnique({
      select: {
        id: true,
        email: true,
        name: true,
        role: true // Nên lấy thêm role để middleware auth(role) hoạt động được
      },
      where: { id: payload.sub }
    });

    if (!user) {
      return done(null, false);
    }

    done(null, user);
  } catch (error) {
    done(error, false);
  }
};

export const jwtStrategy = new JwtStrategy(jwtOptions, jwtVerify);
