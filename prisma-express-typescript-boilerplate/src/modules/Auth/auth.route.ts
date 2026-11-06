import express from 'express';
import validate from '../../middlewares/validate';
import userValidation from '../User/user.validation'; // Tái sử dụng validate của bảng User
import authController from './auth.controller';

const router = express.Router();

router.post('/register', validate(userValidation.createUser), authController.register);
router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.post('/generate-tokens', authController.generateTokens);

export default router;
