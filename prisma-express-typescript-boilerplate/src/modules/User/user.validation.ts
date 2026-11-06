import Joi from 'joi';

// Hàm custom để check độ mạnh mật khẩu (Tùy chọn)
const password = (value: string, helpers: any) => {
  if (value.length < 8) {
    return helpers.message('password must be at least 8 characters');
  }
  if (!value.match(/\d/) || !value.match(/[a-zA-Z]/)) {
    return helpers.message('password must contain at least 1 letter and 1 number');
  }
  return value;
};

const createUser = {
  body: Joi.object().keys({
    email: Joi.string().required().email(),
    password: Joi.string().required().custom(password),
    name: Joi.string().required(),
    role: Joi.string().valid('USER', 'ADMIN').default('USER')
  })
};

const getUsers = {
  query: Joi.object().keys({
    name: Joi.string(),
    email: Joi.string(),
    role: Joi.string(),
    sortBy: Joi.string(),
    limit: Joi.number().integer().default(10),
    page: Joi.number().integer().default(1)
  })
};

const getUser = {
  params: Joi.object().keys({
    userId: Joi.number().integer().required()
  })
};

const updateUser = {
  params: Joi.object().keys({
    userId: Joi.number().integer().required()
  }),
  body: Joi.object()
    .keys({
      email: Joi.string().email(),
      password: Joi.string().custom(password),
      name: Joi.string(),
      role: Joi.string().valid('USER', 'ADMIN')
    })
    .min(1)
};

const deleteUser = {
  params: Joi.object().keys({
    userId: Joi.number().integer().required()
  })
};

export default {
  createUser,
  getUsers,
  getUser,
  updateUser,
  deleteUser
};
