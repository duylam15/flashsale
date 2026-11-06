import Joi from 'joi';

const getInventory = {
  params: Joi.object().keys({
    productId: Joi.number().integer().required()
  })
};

const updateInventory = {
  params: Joi.object().keys({
    productId: Joi.number().integer().required()
  }),
  body: Joi.object().keys({
    totalStock: Joi.number().integer().min(0).required()
  })
};

export default {
  getInventory,
  updateInventory
};
