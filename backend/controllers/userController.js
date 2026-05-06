import User from '../models/User.js';
import Attendance from '../models/Attendance.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v2 as cloudinary } from 'cloudinary';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// @desc    Register new user
// @route   POST /api/users/register
// @access  Public
export const registerUser = async (req, res) => {
    try {
        const { name, userId, email, parentEmail, phone, parentPhone } = req.body;

        const userExists = await User.findOne({
            $or: [{ userId }, { email }]
        });

        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const user = await User.create({
            name,
            userId,
            email,
            parentEmail,
            phone,
            parentPhone,
        });

        if (user) {
            res.status(201).json({
                _id: user._id,
                name: user.name,
                userId: user.userId,
                email: user.email,
                parentEmail: user.parentEmail,
                phone: user.phone,
                parentPhone: user.parentPhone,
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all users
// @route   GET /api/users
// @access  Public (Should be Protected in production)
export const getUsers = async (req, res) => {
    try {
        const users = await User.find({});
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Upload images for user (Called by React frontend)
// @route   POST /api/users/upload-images
// @access  Public
export const uploadImages = async (req, res) => {
    try {
        const { userId, images } = req.body;
        console.log(`[BACKEND] Received upload request for user: ${userId} with ${images?.length || 0} images`);

        if (!userId || !images || !Array.isArray(images)) {
            console.log(`[BACKEND] Error: Invalid data provided for ${userId}`);
            return res.status(400).json({ message: 'Invalid data provided' });
        }

        const user = await User.findOne({ userId });
        if (!user) {
            console.log(`[BACKEND] Error: User ${userId} not found in database`);
            return res.status(404).json({ message: 'User not found' });
        }

        const uploadPromises = images.map((image, index) => {
            return cloudinary.uploader.upload(image, {
                folder: `ai_attendance/dataset/${userId}`,
                public_id: `${index + 1}`,
                overwrite: true
            });
        });

        const uploadResults = await Promise.all(uploadPromises);
        const imageUrls = uploadResults.map(result => result.secure_url);

        user.faceImages = imageUrls;
        user.faceDataRegistered = true;
        await user.save();

        console.log(`[BACKEND] Successfully uploaded 20 images to Cloudinary for user ${userId}`);
        res.status(200).json({ message: 'Images uploaded to Cloud successfully' });
    } catch (error) {
        console.error(`[BACKEND] Upload Error: ${error.message}`);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete user and their face data dataset
// @route   DELETE /api/users/:userId
// @access  Public (Should be Protected in production)
export const deleteUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await User.findOne({ userId });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Delete from Database
        await User.findOneAndDelete({ userId });

        // Delete all associated attendance records
        await Attendance.deleteMany({ userId });
        console.log(`[BACKEND] Deleted all attendance records for user: ${userId}`);

        // Delete dataset folder
        const datasetDir = path.join(__dirname, '..', '..', 'dataset', userId);
        if (fs.existsSync(datasetDir)) {
            fs.rmSync(datasetDir, { recursive: true, force: true });
            console.log(`[BACKEND] Deleted dataset directory: ${datasetDir}`);
        }

        res.status(200).json({ message: 'User, attendance logs, and dataset deleted successfully' });
    } catch (error) {
        console.error(`[BACKEND] Delete Error: ${error.message}`);
        res.status(500).json({ message: error.message });
    }
};
