import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import userService from './user.service';

const createUser = catchAsync(async (req, res) => {
  const user = await userService.createUser(req.body);
  res.status(httpStatus.CREATED).send({ status: 'success', data: user });
});

const getUsers = catchAsync(async (req, res) => {
  const filters = {
    name: req.query.name,
    email: req.query.email,
    role: req.query.role
  };
  const options = {
    limit: parseInt(req.query.limit as string, 10),
    page: parseInt(req.query.page as string, 10)
  };

  const result = await userService.queryUsers(filters, options);
  res.send({ status: 'success', data: result });
});

const getUser = catchAsync(async (req, res) => {
  const userId = parseInt(req.params.userId, 10);
  const user = await userService.getUserById(userId);
  res.send({ status: 'success', data: user });
});

const updateUser = catchAsync(async (req, res) => {
  const userId = parseInt(req.params.userId, 10);
  const user = await userService.updateUserById(userId, req.body);
  res.send({ status: 'success', data: user });
});

const deleteUser = catchAsync(async (req, res) => {
  const userId = parseInt(req.params.userId, 10);
  await userService.deleteUserById(userId);
  res.status(httpStatus.NO_CONTENT).send();
});

export default {
  createUser,
  getUsers,
  getUser,
  updateUser,
  deleteUser
};
