import mongoose, { Document, Schema } from 'mongoose';

export interface ICallInvitationDocument extends Document {
  caller: mongoose.Types.ObjectId;
  receiver: mongoose.Types.ObjectId;
  callType: 'video' | 'audio';
  status: 'pending' | 'accepted' | 'rejected' | 'expired' | 'canceled';
  expiresAt: Date;
  createdAt: Date;
}

const CallInvitationSchema = new Schema<ICallInvitationDocument>(
  {
    caller: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    receiver: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    callType: {
      type: String,
      enum: ['video', 'audio'],
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'expired', 'canceled'],
      default: 'pending',
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // TTL index auto-expires document after expiresAt
    },
  },
  {
    timestamps: true,
  }
);

export const CallInvitation = mongoose.model<ICallInvitationDocument>(
  'CallInvitation',
  CallInvitationSchema
);
