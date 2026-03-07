import User from '../models/User.js';
import Attendance from '../models/Attendance.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

        const datasetDir = path.join(__dirname, '..', '..', 'dataset', userId);
        if (!fs.existsSync(datasetDir)) {
            console.log(`[BACKEND] Creating directory: ${datasetDir}`);
            fs.mkdirSync(datasetDir, { recursive: true });
        }

        images.forEach((image, index) => {
            const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
            const buffer = Buffer.from(base64Data, 'base64');
            const filePath = path.join(datasetDir, `${index + 1}.jpg`);
            fs.writeFileSync(filePath, buffer);
            if (index === 0 || index === 19) {
                console.log(`[BACKEND] Saved image to: ${filePath}`);
            }
        });

        user.faceDataRegistered = true;
        await user.save();

        console.log(`[BACKEND] Successfully uploaded 20 images for user ${userId}`);
        res.status(200).json({ message: 'Images uploaded successfully' });
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
