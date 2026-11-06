import express from 'express';
import loadTestController from './loadTest.controller';

const router = express.Router();

router.post('/', loadTestController.startBackendLoadTest);
router.get('/:testId', loadTestController.getBackendTestStatus);

export default router;