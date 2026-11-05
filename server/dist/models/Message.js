import mongoose, { Schema } from 'mongoose';
const MessageSchema = new Schema({
    sender: {
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
    content: {
        type: String,
        default: '',
        trim: true,
    },
    messageType: {
        type: String,
        enum: ['text', 'image', 'call_log'],
        default: 'text',
    },
    attachment: {
        url: { type: String },
        filename: { type: String },
        size: { type: Number },
        mimeType: { type: String },
    },
    deliveredAt: {
        type: Date,
        default: null,
    },
    readAt: {
        type: Date,
        default: null,
    },
    replyTo: {
        type: Schema.Types.ObjectId,
        ref: 'Message',
        default: null,
    },
    deletedFor: [
        {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },
    ],
    isDeleted: {
        type: Boolean,
        default: false,
    },
}, {
    timestamps: true,
});
MessageSchema.index({ sender: 1, receiver: 1, createdAt: -1 });
export const Message = mongoose.model('Message', MessageSchema);
