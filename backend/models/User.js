import mongoose from 'mongoose';

const userSchema = mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    userId: {
        type: String,
        required: true,
        unique: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    parentEmail: {
        type: String,
        required: false,
    },
    phone: {
        type: String,
        required: true,
    },
    parentPhone: {
        type: String,
        required: true,
    },
    faceDataRegistered: {
        type: Boolean,
        default: false,
    },
    faceImages: {
        type: [String],
        default: []
    }
}, {
    timestamps: true,
});

const User = mongoose.model('User', userSchema);
export default User;
