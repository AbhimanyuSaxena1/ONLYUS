import mongoose, { Document, Schema } from 'mongoose';

export interface ICallDocument extends Document {
  caller: mongoose.Types.ObjectId;
  receiver: mongoose.Types.ObjectId;
  callType: 'video' | 'audio';
  status: 'initiated' | 'ringing' | 'accepted' | 'rejected' | 'busy' | 'missed' | 'ended' | 'failed';
  startedAt: Date;
  endedAt?: Date | null;
  duration: number; // seconds
  createdAt: Date;
}

const CallSchema = new Schema<ICallDocument>(
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
      enum: ['initiated', 'ringing', 'accepted', 'rejected', 'busy', 'missed', 'ended', 'failed'],
      default: 'initiated',
      index: true,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    endedAt: {
      type: Date,
      default: null,
    },
    duration: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

CallSchema.index({ caller: 1, receiver: 1, createdAt: -1 });

export const Call = mongoose.model<ICallDocument>('Call', CallSchema);
