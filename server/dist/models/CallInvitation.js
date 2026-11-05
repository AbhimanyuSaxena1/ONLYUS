import mongoose, { Schema } from 'mongoose';
const CallInvitationSchema = new Schema({
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
}, {
    timestamps: true,
});
export const CallInvitation = mongoose.model('CallInvitation', CallInvitationSchema);
