import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import Attendance from './models/Attendance.js';

dotenv.config();

const checkUsers = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const users = await User.find({});
        console.log('--- REGISTERED USERS ---');
        users.forEach(u => {
            console.log(`ID: ${u.userId} | Name: ${u.name} | Email: ${u.email} | Phone: ${u.phone} | Parent: ${u.parentPhone}`);
        });

        console.log('\n--- ATTENDANCE FOR TODAY (2026-03-06) ---');
        const today = '2026-03-06';
        const records = await Attendance.find({ date: today });
        records.forEach(r => {
            console.log(`ID: ${r.userId} | Name: ${r.name} | Time: ${r.time} | Status: ${r.status}`);
        });
        console.log('------------------------');

        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
};

checkUsers();
