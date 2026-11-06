import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import cors from 'cors';
import passport from 'passport';
import httpStatus from 'http-status';
import cookieParser from 'cookie-parser';

import config from './config/config';
import morgan from './config/morgan';
import xss from './middlewares/xss';
import { jwtStrategy } from './config/passport';
import { authLimiter } from './middlewares/rateLimiter';
import routes from './routes';
import { errorConverter, errorHandler } from './middlewares/error';
import ApiError from './utils/ApiError';
import './config/redis'; // (Nhớ đổi đường dẫn cho đúng thư mục của bạn)

const app = express();

// Request logging
if (config.env !== 'test') {
  app.use(morgan.successHandler);
  app.use(morgan.errorHandler);
}

// Security HTTP headers
app.use(helmet());

// ✅ Giới hạn kích thước payload (1MB) chống tràn RAM / DoS
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

app.use(cookieParser());
app.use(xss());

// ✅ Gzip / Deflate compression có ngưỡng tối thiểu 1 KB
app.use(
  compression({
    threshold: 1024,
    level: 6,
  })
);

// CORS
app.use(cors());
app.options('*', cors());

// Authentication
app.use(passport.initialize());
passport.use('jwt', jwtStrategy);

// Rate limiter cho auth endpoints ở môi trường Production
if (config.env === 'production') {
  app.use('/v1/auth', authLimiter);
}

// Health check
app.get('/', (req, res) => {
  res.status(httpStatus.OK).json({
    status: 'success',
    message: 'Server is up and running!',
  });
});

// API Routes
app.use('/v1', routes);

// 404 handler cho unknown route
app.use((req, res, next) => {
  next(new ApiError(httpStatus.NOT_FOUND, 'Not found'));
});

// Error handling
app.use(errorConverter);
app.use(errorHandler);

export default app;