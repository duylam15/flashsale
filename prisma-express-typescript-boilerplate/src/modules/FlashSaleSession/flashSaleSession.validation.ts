import Joi from 'joi';

const createSession = {
  body: Joi.object().keys({
    startTime: Joi.date().iso().required(),
    endTime: Joi.date().iso().min(Joi.ref('startTime')).required().messages({
      'date.min': '"endTime" must be later than "startTime"'
    })
  })
};

const getSessions = {
  query: Joi.object().keys({
    status: Joi.string().valid('PENDING', 'ACTIVE', 'ENDED'),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer()
  })
};

const getSession = {
  params: Joi.object().keys({
    sessionId: Joi.number().integer().required()
  })
};

const updateSession = {
  params: Joi.object().keys({
    sessionId: Joi.number().integer().required()
  }),
  body: Joi.object()
    .keys({
      startTime: Joi.date().iso(),
      endTime: Joi.date().iso().min(Joi.ref('startTime')).messages({
        'date.min': '"endTime" must be later than "startTime"'
      }),
      status: Joi.string().valid('PENDING', 'ACTIVE', 'ENDED')
    })
    .min(1)
};

const deleteSession = {
  params: Joi.object().keys({
    sessionId: Joi.number().integer().required()
  })
};

export default {
  createSession,
  getSessions,
  getSession,
  updateSession,
  deleteSession
};
