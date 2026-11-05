import { Router } from 'express';
import {
  getMessages,
  sendMessage,
  uploadAttachment,
  markAsRead,
  deleteMessage,
} from '../controllers/messageController.js';
import { authenticateJwt } from '../middleware/authMiddleware.js';
import { uploadImage } from '../middleware/uploadMiddleware.js';

const router = Router();

router.use(authenticateJwt);

router.get('/', getMessages);
router.post('/', sendMessage);
router.post('/upload', uploadImage.single('image'), uploadAttachment);
router.post('/read', markAsRead);
router.delete('/:id', deleteMessage);

export default router;
