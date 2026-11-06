import express from 'express';
import auth from '../../middlewares/auth';
import validate from '../../middlewares/validate';
import sessionValidation from './flashSaleSession.validation';
// ✅ Sửa thành import * as để hỗ trợ tất cả các hàm named export trong controller
import * as sessionController from './flashSaleSession.controller';

const router = express.Router();

// ==========================================
// 1. ROUTES DÀNH CHO K6 LOAD TESTING
// ==========================================

router.post(
  '/load-tests',
  auth('ADMIN'), 
  sessionController.startLoadTest
);

router.get(
  '/load-tests/:testId',
  auth('ADMIN'), 
  sessionController.getLoadTestStatus
);

// ==========================================
// 2. ROUTES DÀNH CHO FLASH SALE SESSIONS
// ==========================================

router
  .route('/')
  .post(
    auth('ADMIN'), 
    validate(sessionValidation.createSession),
    sessionController.createSession
  )
  .get(
    validate(sessionValidation.getSessions),
    sessionController.getSessions
  );

router
  .route('/:sessionId')
  .get(
    validate(sessionValidation.getSession),
    sessionController.getSession
  )
  .patch(
    auth('ADMIN'), 
    validate(sessionValidation.updateSession),
    sessionController.updateSession
  )
  .delete(
    auth('ADMIN'), 
    validate(sessionValidation.deleteSession),
    sessionController.deleteSession
  );

export default router;