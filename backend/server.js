import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB from './config/db.js';
import path from 'path';
import { fileURLToPath } from 'url';

import userRoutes from './routes/userRoutes.js';
import attendanceRoutes from './routes/attendanceRoutes.js';

import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');

dotenv.config();

connectDB();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors({
    origin: process.env.FRONTEND_URL || "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use('/dataset', express.static(path.join(__dirname, '..', 'dataset')));

app.use('/api/users', userRoutes);
app.use('/api/attendance', attendanceRoutes);

app.get('/', (req, res) => {
    res.send('AI Attendance System API v2.1 is running...');
});

// Test email endpoint for diagnostics
app.get('/api/test-email', async (req, res) => {
    try {
        const nodemailer = await import('nodemailer');
        
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            return res.json({ 
                success: false, 
                error: 'EMAIL_USER or EMAIL_PASS not set',
                EMAIL_USER: process.env.EMAIL_USER ? 'SET' : 'MISSING',
                EMAIL_PASS: process.env.EMAIL_PASS ? 'SET' : 'MISSING'
            });
        }

        const transporter = nodemailer.default.createTransport({
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
            tls: { rejectUnauthorized: false }
        });

        const info = await transporter.sendMail({
            from: `"AI Attendance System" <${process.env.EMAIL_USER}>`,
            to: process.env.EMAIL_USER,
            subject: 'AI Attendance - Email Test',
            text: 'If you received this, email is working! ✅'
        });

        res.json({ success: true, messageId: info.messageId, response: info.response });
    } catch (error) {
        res.json({ success: false, error: error.message, code: error.code });
    }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`[ENV CHECK] EMAIL_USER: ${process.env.EMAIL_USER ? 'SET ✅' : 'MISSING ❌'}`);
    console.log(`[ENV CHECK] EMAIL_PASS: ${process.env.EMAIL_PASS ? 'SET ✅' : 'MISSING ❌'}`);
    console.log(`[ENV CHECK] TWILIO_ACCOUNT_SID: ${process.env.TWILIO_ACCOUNT_SID ? 'SET ✅' : 'MISSING ❌'}`);
    console.log(`[ENV CHECK] MONGO_URI: ${process.env.MONGO_URI ? 'SET ✅' : 'MISSING ❌'}`);
    console.log(`[BUILD VERSION] v2.1 - 2026-05-06 critical fix deployed`);
});
