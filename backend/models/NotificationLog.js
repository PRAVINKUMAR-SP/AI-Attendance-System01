import mongoose from 'mongoose';

const notificationLogSchema = mongoose.Schema({
    userId: {
        type: String,
        required: true,
    },
    name: {
        type: String,
    },
    type: {
        type: String, // 'Email' or 'SMS'
        required: true,
    },
    recipient: {
        type: String,
        required: true,
    },
    status: {
        type: String, // 'Success' or 'Failed'
        required: true,
    },
    error: {
        type: String,
    },
    timestamp: {
        type: Date,
        default: Date.now,
    }
}, {
    timestamps: true,
});

const NotificationLog = mongoose.model('NotificationLog', notificationLogSchema);
export default NotificationLog;
