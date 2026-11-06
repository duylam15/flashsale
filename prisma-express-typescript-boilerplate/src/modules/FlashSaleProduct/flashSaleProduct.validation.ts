import Joi from 'joi';

const addProduct = {
  body: Joi.object().keys({
    sessionId: Joi.number().integer().required(),
    productId: Joi.number().integer().required(),
    salePrice: Joi.number().min(0).required(),
    saleStock: Joi.number().integer().min(1).required(),
    userLimit: Joi.number().integer().min(1).default(1)
  })
};

const getSessionProducts = {
  params: Joi.object().keys({
    sessionId: Joi.number().integer().required()
  })
};

const updateProduct = {
  params: Joi.object().keys({
    id: Joi.number().integer().required()
  }),
  body: Joi.object()
    .keys({
      salePrice: Joi.number().min(0),
      saleStock: Joi.number().integer().min(1),
      userLimit: Joi.number().integer().min(1)
    })
    .min(1)
};

const removeProduct = {
  params: Joi.object().keys({
    id: Joi.number().integer().required()
  })
};

export default {
  addProduct,
  getSessionProducts,
  updateProduct,
  removeProduct
};
