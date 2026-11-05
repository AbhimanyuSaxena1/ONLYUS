import { Response } from 'express';
import { Call } from '../models/Call.js';
import { CallInvitation } from '../models/CallInvitation.js';
import { AuthenticatedRequest } from '../types/index.js';
import { callInvitationSchema } from '../validators/messageValidator.js';
import { sendPushToUser } from '../services/pushService.js';
import { User } from '../models/User.js';
import { getIceServers } from '../config/turn.js';

export const getCallHistory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const currentUserId = req.user!.id;

    const calls = await Call.find({
      $or: [{ caller: currentUserId }, { receiver: currentUserId }],
    })
      .sort({ createdAt: -1 })
      .limit(30)
      .populate('caller', 'name profilePicture')
      .populate('receiver', 'name profilePicture')
      .lean();

    res.json({
      success: true,
      data: calls,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createCallInvitation = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const callerId = req.user!.id;
    const validated = callInvitationSchema.parse(req.body);

    const caller = await User.findById(callerId);
    if (!caller) {
      res.status(404).json({ success: false, message: 'Caller not found' });
      return;
    }

    // Expiration: 45 seconds
    const expiresAt = new Date(Date.now() + 45 * 1000);

    const invitation = await CallInvitation.create({
      caller: callerId,
      receiver: validated.receiverId,
      callType: validated.callType,
      status: 'pending',
      expiresAt,
    });

    // Send high-priority Web Push notification for incoming call
    await sendPushToUser(validated.receiverId, {
      title: `Incoming ${validated.callType === 'video' ? 'Video' : 'Audio'} Call`,
      body: `${caller.name} is calling you on OnlyUs`,
      data: {
        type: 'incoming_call',
        callId: invitation._id.toString(),
        callerId,
        callerName: caller.name,
        callType: validated.callType,
        url: `/?incomingCall=${invitation._id}&type=${validated.callType}`,
      },
      actions: [
        { action: 'accept', title: 'Accept' },
        { action: 'decline', title: 'Decline' },
      ],
    });

    res.status(201).json({
      success: true,
      data: invitation,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getCallInvitation = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const invitation = await CallInvitation.findById(id)
      .populate('caller', 'name profilePicture')
      .populate('receiver', 'name profilePicture');

    if (!invitation) {
      res.status(404).json({ success: false, message: 'Invitation expired or not found' });
      return;
    }

    if (new Date() > invitation.expiresAt) {
      invitation.status = 'expired';
      await invitation.save();
      res.status(410).json({ success: false, message: 'Call invitation has expired' });
      return;
    }

    res.json({
      success: true,
      data: invitation,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getWebRtcConfig = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const iceServers = getIceServers();
    res.json({
      success: true,
      data: {
        iceServers,
        iceCandidatePoolSize: 10,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
