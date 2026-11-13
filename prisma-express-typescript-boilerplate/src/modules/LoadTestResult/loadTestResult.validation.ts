import Joi from 'joi';
import { TestTool, TestStatus } from '@prisma/client';

const createLoadTestResult = {
  body: Joi.object().keys({
    name: Joi.string().required(),
    description: Joi.string().allow('', null),
    tool: Joi.string()
      .valid(...Object.values(TestTool))
      .default(TestTool.K6),
    status: Joi.string()
      .valid(...Object.values(TestStatus))
      .default(TestStatus.COMPLETED),
    sessionId: Joi.number().integer().allow(null),
    targetEndpoint: Joi.string().required(),
    vus: Joi.number().integer().min(1).required(),
    durationSeconds: Joi.number().min(0).required(),
    totalRequests: Joi.number().integer().min(0).required(),
    successCount: Joi.number().integer().min(0).required(),
    failedCount: Joi.number().integer().min(0).required(),
    rps: Joi.number().min(0).required(),
    p95LatencyMs: Joi.number().min(0).required(),
    p99LatencyMs: Joi.number().min(0).allow(null),
    rawResult: Joi.object().required(),
    environmentMeta: Joi.object().allow(null),
    executedAt: Joi.date().iso(),
  }),
};

const getLoadTestResults = {
  query: Joi.object().keys({
    sessionId: Joi.number().integer(),
    tool: Joi.string().valid(...Object.values(TestTool)),
    limit: Joi.number().integer().min(1).max(100).default(20),
    page: Joi.number().integer().min(1).default(1),
  }),
};

const getLoadTestResultById = {
  params: Joi.object().keys({
    id: Joi.string().uuid().required(),
  }),
};

export default {
  createLoadTestResult,
  getLoadTestResults,
  getLoadTestResultById,
};