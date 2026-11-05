import mongoose, { Schema } from 'mongoose';
const DeviceSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    deviceName: {
        type: String,
        default: 'Unknown Device',
    },
    pushSubscription: {
        endpoint: {
            type: String,
            required: true,
            index: true,
        },
        keys: {
            p256dh: { type: String, required: true },
            auth: { type: String, required: true },
        },
    },
    lastActive: {
        type: Date,
        default: Date.now,
    },
}, {
    timestamps: true,
});
DeviceSchema.index({ user: 1, 'pushSubscription.endpoint': 1 }, { unique: true });
export const Device = mongoose.model('Device', DeviceSchema);
