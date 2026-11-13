import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import ApiError from '../../utils/ApiError';
import loadTestResultService from './loadTestResult.service';

const createLoadTestResult = catchAsync(async (req: Request, res: Response) => {
  const result = await loadTestResultService.createResult(req.body);
  res.status(httpStatus.CREATED).send({
    message: 'Lưu kết quả load test thành công',
    data: result,
  });
});

const getLoadTestResults = catchAsync(async (req: Request, res: Response) => {
  const { sessionId, tool, limit, page } = req.query;
  const filter = {
    sessionId: sessionId ? Number(sessionId) : undefined,
    tool: tool as string | undefined,
  };
  const options = {
    limit: limit ? Number(limit) : 20,
    page: page ? Number(page) : 1,
  };
  const data = await loadTestResultService.queryResults(filter, options);
  res.status(httpStatus.OK).send({ data });
});

const getLoadTestResult = catchAsync(async (req: Request, res: Response) => {
  const result = await loadTestResultService.getResultById(req.params.id);
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Không tìm thấy kết quả test');
  }
  res.status(httpStatus.OK).send({ data: result });
});

export default {
  createLoadTestResult,
  getLoadTestResults,
  getLoadTestResult,
};