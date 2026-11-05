import { Response } from 'express';
import { Message } from '../models/Message.js';
import { AuthenticatedRequest } from '../types/index.js';
import { sendMessageSchema } from '../validators/messageValidator.js';
import { sendPushToUser } from '../services/pushService.js';
import { User } from '../models/User.js';

export const getMessages = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const currentUserId = req.user!.id;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 50;
    const skip = (page - 1) * limit;

    const messages = await Message.find({
      $or: [
        { sender: currentUserId },
        { receiver: currentUserId },
      ],
      deletedFor: { $ne: currentUserId },
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('replyTo', 'content sender messageType attachment')
      .lean();

    // Mark unread messages sent to current user as delivered
    await Message.updateMany(
      {
        receiver: currentUserId,
        deliveredAt: null,
      },
      {
        $set: { deliveredAt: new Date() },
      }
    );

    res.json({
      success: true,
      data: messages.reverse(),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const sendMessage = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const currentUserId = req.user!.id;
    const validated = sendMessageSchema.parse(req.body);

    const message = await Message.create({
      sender: currentUserId,
      receiver: validated.receiverId,
      content: validated.content,
      messageType: validated.messageType,
      replyTo: validated.replyTo || null,
      deliveredAt: null,
      readAt: null,
    });

    // Send push notification if receiver device is registered
    const sender = await User.findById(currentUserId);
    const senderName = sender ? sender.name : 'OnlyUs';

    await sendPushToUser(validated.receiverId, {
      title: senderName,
      body: validated.messageType === 'image' ? '📷 Sent a photo' : (validated.content || 'Sent a message'),
      data: {
        type: 'new_message',
        messageId: message._id.toString(),
        senderId: currentUserId,
        url: '/chat',
      },
    });

    res.status(201).json({
      success: true,
      data: message,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const uploadAttachment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: 'No file uploaded' });
      return;
    }

    const fileUrl = `/uploads/${req.file.filename}`;

    res.json({
      success: true,
      data: {
        url: fileUrl,
        filename: req.file.originalname,
        size: req.file.size,
        mimeType: req.file.mimetype,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const markAsRead = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const currentUserId = req.user!.id;
    const now = new Date();

    await Message.updateMany(
      {
        receiver: currentUserId,
        readAt: null,
      },
      {
        $set: {
          readAt: now,
          deliveredAt: now,
        },
      }
    );

    res.json({ success: true, message: 'Messages marked as read' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteMessage = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const currentUserId = req.user!.id;
    const { id } = req.params;

    const message = await Message.findById(id);
    if (!message) {
      res.status(404).json({ success: false, message: 'Message not found' });
      return;
    }

    // Add current user to deletedFor
    if (!message.deletedFor.map((d: any) => d.toString()).includes(currentUserId)) {
      message.deletedFor.push(currentUserId as any);
      await message.save();
    }

    res.json({ success: true, message: 'Message deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
