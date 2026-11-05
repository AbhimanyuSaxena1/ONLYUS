import { Request } from 'express';

export type UserRole = 'user';

export interface IUser {
  _id: string;
  name: string;
  email: string;
  passwordHash: string;
  profilePicture: string;
  lastSeen: Date;
  isOnline: boolean;
  currentCallId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
  };
}

export type CallType = 'video' | 'audio';

export type CallStatus = 
  | 'initiated'
  | 'ringing'
  | 'accepted'
  | 'rejected'
  | 'busy'
  | 'missed'
  | 'ended'
  | 'failed';

export interface ICall {
  _id: string;
  caller: string;
  receiver: string;
  callType: CallType;
  status: CallStatus;
  startedAt: Date;
  endedAt?: Date | null;
  duration: number; // in seconds
  createdAt: Date;
}

export type MessageType = 'text' | 'image' | 'call_log';

export interface IMessageAttachment {
  url: string;
  filename?: string;
  size?: number;
  mimeType?: string;
}

export interface IMessage {
  _id: string;
  sender: string;
  receiver: string;
  content: string;
  messageType: MessageType;
  attachment?: IMessageAttachment;
  deliveredAt?: Date | null;
  readAt?: Date | null;
  replyTo?: string | null;
  deletedFor: string[];
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IDevice {
  _id: string;
  user: string;
  deviceName: string;
  pushSubscription: {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  };
  lastActive: Date;
  createdAt: Date;
}

export interface ICallInvitation {
  _id: string;
  caller: string;
  receiver: string;
  callType: CallType;
  status: 'pending' | 'accepted' | 'rejected' | 'expired' | 'canceled';
  expiresAt: Date;
  createdAt: Date;
}

// Socket Event Types
export interface ClientToServerEvents {
  'call:initiate': (data: { receiverId: string; callType: CallType }) => void;
  'call:accept': (data: { callId: string }) => void;
  'call:reject': (data: { callId: string; reason?: string }) => void;
  'call:busy': (data: { callId: string }) => void;
  'call:ended': (data: { callId: string }) => void;
  'call:offer': (data: { callId: string; sdp: any }) => void;
  'call:answer': (data: { callId: string; sdp: any }) => void;
  'call:ice-candidate': (data: { callId: string; candidate: any }) => void;
  'call:mute': (data: { callId: string; isMuted: boolean }) => void;
  'call:camera': (data: { callId: string; isCameraOff: boolean }) => void;
  'call:reconnect': (data: { callId: string }) => void;

  'message:send': (data: { receiverId: string; content: string; messageType?: MessageType; attachment?: IMessageAttachment; replyTo?: string }) => void;
  'message:delivered': (data: { messageId: string }) => void;
  'message:read': (data: { messageId: string }) => void;
  'message:typing': (data: { receiverId: string; isTyping: boolean }) => void;
  'message:delete': (data: { messageId: string }) => void;

  'user:status': (data: { status: string }) => void;
}

export interface ServerToClientEvents {
  'user:online': (data: { userId: string }) => void;
  'user:offline': (data: { userId: string; lastSeen: Date }) => void;
  'user:status': (data: { userId: string; status: string }) => void;
  'user:lastSeen': (data: { userId: string; lastSeen: Date }) => void;

  'call:incoming': (data: {
    callId: string;
    caller: { id: string; name: string; profilePicture: string };
    callType: CallType;
  }) => void;
  'call:accepted': (data: { callId: string }) => void;
  'call:rejected': (data: { callId: string; reason?: string }) => void;
  'call:busy': (data: { callId: string }) => void;
  'call:ended': (data: { callId: string; duration?: number }) => void;
  'call:missed': (data: { callId: string }) => void;
  'call:offer': (data: { callId: string; sdp: any }) => void;
  'call:answer': (data: { callId: string; sdp: any }) => void;
  'call:ice-candidate': (data: { callId: string; candidate: any }) => void;
  'call:mute': (data: { callId: string; isMuted: boolean }) => void;
  'call:camera': (data: { callId: string; isCameraOff: boolean }) => void;
  'call:reconnected': (data: { callId: string }) => void;

  'message:received': (message: IMessage) => void;
  'message:delivered': (data: { messageId: string; deliveredAt: Date }) => void;
  'message:read': (data: { messageId: string; readAt: Date }) => void;
  'message:typing': (data: { userId: string; isTyping: boolean }) => void;
  'message:deleted': (data: { messageId: string }) => void;

  'notification:incoming-call': (data: any) => void;
  'notification:new-message': (data: any) => void;
}
