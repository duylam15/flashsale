import Joi from 'joi';

const createProduct = {
  body: Joi.object().keys({
    name: Joi.string().required(),
    description: Joi.string().required(),
    basePrice: Joi.number().min(0).required(),
    imageUrl: Joi.string().uri().optional(),
    initialStock: Joi.number().integer().min(0).required() // Bắt buộc khởi tạo kho
  })
};

const getProducts = {
  query: Joi.object().keys({
    name: Joi.string(),
    sortBy: Joi.string(),
    limit: Joi.number().integer().min(1).default(10),
    page: Joi.number().integer().min(1).default(1)
  })
};

const getProduct = {
  params: Joi.object().keys({
    productId: Joi.number().integer().required()
  })
};

const updateProduct = {
  params: Joi.object().keys({
    productId: Joi.number().integer().required()
  }),
  body: Joi.object()
    .keys({
      name: Joi.string(),
      description: Joi.string(),
      basePrice: Joi.number().min(0),
      imageUrl: Joi.string().uri()
    })
    .min(1)
};

const deleteProduct = {
  params: Joi.object().keys({
    productId: Joi.number().integer().required()
  })
};

export default {
  createProduct,
  getProducts,
  getProduct,
  updateProduct,
  deleteProduct
};
