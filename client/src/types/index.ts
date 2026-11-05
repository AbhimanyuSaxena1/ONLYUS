export interface User {
  id: string;
  _id?: string;
  name: string;
  email: string;
  profilePicture?: string;
  isOnline: boolean;
  lastSeen?: string | Date;
  currentCallId?: string | null;
}

export type CallType = 'video' | 'audio';

export type CallStatus = 
  | 'idle'
  | 'initiating'
  | 'ringing'
  | 'incoming'
  | 'connecting'
  | 'connected'
  | 'busy'
  | 'rejected'
  | 'ended'
  | 'missed';

export interface CallRecord {
  _id: string;
  caller: User | string;
  receiver: User | string;
  callType: CallType;
  status: string;
  startedAt: string | Date;
  endedAt?: string | Date | null;
  duration: number;
  createdAt: string;
}

export type MessageType = 'text' | 'image' | 'call_log';

export interface MessageAttachment {
  url: string;
  filename?: string;
  size?: number;
  mimeType?: string;
}

export interface Message {
  _id: string;
  sender: string | User;
  receiver: string | User;
  content: string;
  messageType: MessageType;
  attachment?: MessageAttachment;
  deliveredAt?: string | Date | null;
  readAt?: string | Date | null;
  replyTo?: Message | string | null;
  deletedFor?: string[];
  isDeleted?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CallInvitation {
  _id: string;
  caller: User;
  receiver: User;
  callType: CallType;
  status: 'pending' | 'accepted' | 'rejected' | 'expired' | 'canceled';
  expiresAt: string;
}
