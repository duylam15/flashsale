import express from 'express';
import validate from '../../middlewares/validate';
import loadTestResultValidation from './loadTestResult.validation';
import loadTestResultController from './loadTestResult.controller';

const router = express.Router();

router
  .route('/')
  .post(
    validate(loadTestResultValidation.createLoadTestResult),
    loadTestResultController.createLoadTestResult
  )
  .get(
    validate(loadTestResultValidation.getLoadTestResults),
    loadTestResultController.getLoadTestResults
  );

router
  .route('/:id')
  .get(
    validate(loadTestResultValidation.getLoadTestResultById),
    loadTestResultController.getLoadTestResult
  );

export default router;