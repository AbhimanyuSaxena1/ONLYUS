import { Router } from 'express';
import {
  getVapidKey,
  subscribe,
  unsubscribe,
  testPushNotification,
} from '../controllers/pushController.js';
import { authenticateJwt } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authenticateJwt);

router.get('/vapid-key', getVapidKey);
router.post('/subscribe', subscribe);
router.post('/unsubscribe', unsubscribe);
router.post('/test', testPushNotification);

export default router;
