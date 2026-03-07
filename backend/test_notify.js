import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import Attendance from './models/Attendance.js';
import { markAttendance } from './controllers/attendanceController.js';

dotenv.config();

const testNotify = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        // Delete existing attendance for today to allow re-marking
        console.log(`[TEST] Deleting existing attendance for 713122 on 2026-03-06...`);
        await Attendance.deleteOne({ userId: '713122', date: '2026-03-06' });

        // Mock req/res
        const req = {
            body: {
                userId: '713122',
                date: '2026-03-06',
                time: '11:00'
            }
        };
        const res = {
            status: (code) => {
                console.log(`Response Status: ${code}`);
                return res;
            },
            json: (data) => {
                console.log(`Response JSON: ${JSON.stringify(data, null, 2)}`);
                return res;
            }
        };

        console.log('--- TESTING NOTIFICATION FOR SARARAJ (713122) ---');
        await markAttendance(req, res);
        console.log('--------------------------------------------------');

        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
};

testNotify();
