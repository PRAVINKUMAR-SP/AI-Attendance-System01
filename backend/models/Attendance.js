import mongoose from 'mongoose';

const attendanceSchema = mongoose.Schema({
    userId: {
        type: String,
        required: true,
        ref: 'User'
    },
    name: {
        type: String,
        required: true,
    },
    date: {
        type: String, // YYYY-MM-DD
        required: true,
    },
    time: {
        type: String, // HH:MM
        required: true,
    },
    status: {
        type: String,
        required: true,
        default: 'Present'
    }
}, {
    timestamps: true,
});

// Enforce unique daily attendance per user at the database level
attendanceSchema.index({ userId: 1, date: 1 }, { unique: true });

const Attendance = mongoose.model('Attendance', attendanceSchema);
export default Attendance;
