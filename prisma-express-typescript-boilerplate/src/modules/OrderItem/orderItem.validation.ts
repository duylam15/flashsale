import Joi from 'joi';

const getOrderItems = {
  query: Joi.object().keys({
    orderId: Joi.number().integer(),
    productId: Joi.number().integer(),
    sortBy: Joi.string(),
    limit: Joi.number().integer().min(1),
    page: Joi.number().integer().min(1)
  })
};

const getOrderItem = {
  params: Joi.object().keys({
    id: Joi.number().integer().required()
  })
};

export default {
  getOrderItems,
  getOrderItem
};
