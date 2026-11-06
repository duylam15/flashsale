import express from 'express';
import auth from '../../middlewares/auth';
import validate from '../../middlewares/validate';
import userValidation from './user.validation';
import userController from './user.controller';

const router = express.Router();

// Tất cả các route quản trị User đều yêu cầu quyền ADMIN
router
  .route('/')
  .post(auth('ADMIN'), validate(userValidation.createUser), userController.createUser)
  .get(auth('ADMIN'), validate(userValidation.getUsers), userController.getUsers);

router
  .route('/:userId')
  .get(auth('ADMIN'), validate(userValidation.getUser), userController.getUser)
  .patch(auth('ADMIN'), validate(userValidation.updateUser), userController.updateUser)
  .delete(auth('ADMIN'), validate(userValidation.deleteUser), userController.deleteUser);

export default router;
