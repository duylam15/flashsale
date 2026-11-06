import Joi from 'joi';

const createOrder = {
  body: Joi.object().keys({
    items: Joi.array()
      .items(
        Joi.object().keys({
          productId: Joi.number().integer().required(),
          quantity: Joi.number().integer().min(1).required()
        })
      )
      .min(1)
      .required()
  })
};

const getOrders = {
  query: Joi.object().keys({
    status: Joi.string().valid('PENDING', 'PAID', 'CANCELLED'),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer()
  })
};

const getOrder = {
  params: Joi.object().keys({
    orderId: Joi.number().integer().required()
  })
};

const updateOrderStatus = {
  params: Joi.object().keys({
    orderId: Joi.number().integer().required()
  }),
  body: Joi.object().keys({
    status: Joi.string().valid('PAID', 'CANCELLED').required()
  })
};

export default {
  createOrder,
  getOrders,
  getOrder,
  updateOrderStatus
};
