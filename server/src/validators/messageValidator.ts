import { z } from 'zod';

export const sendMessageSchema = z.object({
  receiverId: z.string().min(1, 'Receiver ID is required'),
  content: z.string().optional().default(''),
  messageType: z.enum(['text', 'image', 'call_log']).default('text'),
  replyTo: z.string().optional(),
});

export const callInvitationSchema = z.object({
  receiverId: z.string().min(1, 'Receiver ID is required'),
  callType: z.enum(['video', 'audio']),
});
