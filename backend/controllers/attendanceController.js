import Attendance from '../models/Attendance.js';
import User from '../models/User.js';
import { sendEmail } from '../notifications/email.js';
import { sendSMS } from '../notifications/sms.js';
import { makeAbsenceCall } from '../notifications/voice.js';

// @desc    Mark attendance (Called by Python AI Engine)
// @route   POST /api/attendance/mark
// @access  Public
export const markAttendance = async (req, res) => {
    try {
        const { userId, date, time } = req.body;

        const user = await User.findOne({ userId });
        if (!user) {
            return res.status(404).json({ message: 'User not found in database' });
        }

        // Check if attendance already marked for today
        const existingAttendance = await Attendance.findOne({ userId, date });
        if (existingAttendance) {
            return res.status(400).json({ message: 'Attendance already marked for today' });
        }

        const attendance = await Attendance.create({
            userId,
            name: user.name,
            date,
            time,
            status: 'Present'
        });

        // Trigger Email and SMS Notification
        const emailMsg = `Hello ${user.name},\n\nYour attendance has been recorded for today.\n\nDate: ${date}\nTime: ${time}`;
        const smsMsg = `Hello ${user.name}, your attendance was marked at ${time} on ${date}.`;
        const parentSmsMsg = `Notification: Your ward ${user.name} has arrived at college. Time: ${time}.`;

        if (user.email) {
            console.log(`[NOTIFY] Sending Email to ${user.email}...`);
            await sendEmail(user.email, emailMsg);
        }

        if (user.parentEmail) {
            console.log(`[NOTIFY] Sending Parent Email to ${user.parentEmail}...`);
            const parentEmailMsg = `Notification: Your ward ${user.name} has arrived at college.\n\nTime: ${time}`;
            await sendEmail(user.parentEmail, parentEmailMsg);
        }

        if (user.phone && user.parentPhone && user.phone === user.parentPhone) {
            // Combined message for shared numbers
            const combinedMsg = `${smsMsg} [Parent Alert: Your ward has arrived.]`;
            console.log(`[NOTIFY] Sending Combined SMS to ${user.phone}...`);
            await sendSMS(user.phone, combinedMsg);
        } else {
            // Separate messages
            if (user.phone) {
                console.log(`[NOTIFY] Sending Student SMS to ${user.phone}...`);
                await sendSMS(user.phone, smsMsg);
            }
            if (user.parentPhone) {
                console.log(`[NOTIFY] Sending Parent SMS to ${user.parentPhone}...`);
                await sendSMS(user.parentPhone, parentSmsMsg);
            }
        }

        console.log(`[NOTIFY] Completed notifications for ${user.name}`);

        res.status(201).json(attendance);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all attendance records (For Admin Dashboard)
// @route   GET /api/attendance
// @access  Public
export const getAttendance = async (req, res) => {
    try {
        const records = await Attendance.find({}).sort({ createdAt: -1 });
        res.json(records);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete an attendance record
// @route   DELETE /api/attendance/:id
// @access  Public (Should be Protected in production)
export const deleteAttendance = async (req, res) => {
    try {
        const { id } = req.params;
        await Attendance.findByIdAndDelete(id);
        res.status(200).json({ message: 'Attendance record deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Manually add an attendance record
// @route   POST /api/attendance/manual
// @access  Public (Should be Protected in production)
export const addManualAttendance = async (req, res) => {
    try {
        const { userId, date, time } = req.body;
        const user = await User.findOne({ userId });
        if (!user) {
            return res.status(404).json({ message: 'User not found in database. Check ID.' });
        }

        const existingAttendance = await Attendance.findOne({ userId, date });
        if (existingAttendance) {
            return res.status(400).json({ message: 'Attendance already marked for this date' });
        }

        const attendance = await Attendance.create({
            userId,
            name: user.name,
            date,
            time,
            status: 'Present (Manual)'
        });

        // Trigger Email and SMS Notification for manual entry
        if (user.email) {
            sendEmail(user.email, user.name, date, time);
        }
        if (user.phone) {
            sendSMS(user.phone, user.name, time);
        }

        res.status(201).json(attendance);
    } catch (error) {
        res.status(501).json({ message: error.message });
    }
};

// @desc    Identify absent students and trigger alerts (Manual Session End)
// @route   POST /api/attendance/process-absences
// @access  Public
export const processDailyAbsences = async (req, res) => {
    try {
        const { date } = req.body; // e.g., '2026-03-06'

        // 1. Get all registered users
        const allUsers = await User.find({});
        console.log(`[ABSENCE CHECK] Total registered users in DB: ${allUsers.length}`);

        // 2. Get all present students for this date
        const presentRecords = await Attendance.find({ date });
        const presentUserIds = presentRecords.map(rec => rec.userId);
        console.log(`[ABSENCE CHECK] Date: ${date}, Present count: ${presentUserIds.length}`);
        console.log(`[ABSENCE CHECK] Present IDs: ${JSON.stringify(presentUserIds)}`);

        // 3. Find missing students
        const absentStudents = allUsers.filter(user => !presentUserIds.includes(user.userId));
        console.log(`[ABSENCE CHECK] Identified ${absentStudents.length} absent students.`);

        // 4. Trigger Alerts
        const timeNow = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });

        for (const student of absentStudents) {
            const emailMsg = `URGENT: ${student.name} is ABSENT today (${date}).\n\nPlease check with your ward.`;
            const smsMsg = `ALERT: Your ward ${student.name} is ABSENT today, ${date}. - AI System`;

            // Email Parent
            if (student.email) {
                sendEmail(student.email, emailMsg);
            }

            if (student.parentEmail) {
                const parentAbsenceMsg = `URGENT: Your ward ${student.name} is ABSENT today.`;
                sendEmail(student.parentEmail, parentAbsenceMsg);
            }

            // SMS Parent
            if (student.parentPhone) {
                sendSMS(student.parentPhone, smsMsg);
            }

            // Voice Call Parent
            if (student.parentPhone) {
                makeAbsenceCall(student.parentPhone, student.name);
            }
        }

        res.status(200).json({
            message: `Absence processing complete. Alerts sent to ${absentStudents.length} parents.`,
            absentCount: absentStudents.length,
            absentStudents: absentStudents.map(s => ({
                name: s.name,
                parentPhone: s.parentPhone,
                parentEmail: s.parentEmail,
                userId: s.userId
            }))
        });
    } catch (error) {
        console.error(`[ABSENCE ERROR] ${error.message}`);
        res.status(500).json({ message: error.message });
    }
};

