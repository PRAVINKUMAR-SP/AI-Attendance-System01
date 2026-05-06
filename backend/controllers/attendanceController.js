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

        // Use direct string comparison to avoid timezone shifts
        const normalizedDate = date; // Frontend already sends YYYY-MM-DD

        // Check if attendance already marked for today
        const existingAttendance = await Attendance.findOne({ userId, date: normalizedDate });
        if (existingAttendance) {
            return res.status(400).json({ message: 'Attendance already marked for today' });
        }

        const attendance = await Attendance.create({
            userId,
            name: user.name,
            date: date, // Explicitly use the date sent by the frontend
            time: time, // Explicitly use the time sent by the frontend
            status: 'Present'
        });

        // Trigger Notifications in Background (Non-blocking)
        const emailMsg = `Hello ${user.name},\n\nYour attendance has been recorded for today.\n\nDate: ${normalizedDate}\nTime: ${time}`;
        const smsMsg = `Hello ${user.name}, your attendance was marked at ${time} on ${normalizedDate}.`;
        const parentSmsMsg = `Notification: Your ward ${user.name} has arrived at college. Time: ${time}.`;

        // We don't 'await' these so the response returns to user immediately
        if (user.email) sendEmail(user.email, emailMsg).catch(err => console.error("Email fail:", err.message));
        if (user.parentEmail) {
            const pMsg = `Notification: Your ward ${user.name} has arrived at college.\n\nTime: ${time}`;
            sendEmail(user.parentEmail, pMsg).catch(err => console.error("Parent Email fail:", err.message));
        }

        if (user.phone) {
            sendSMS(user.phone, smsMsg).catch(err => console.error("SMS fail:", err.message));
            if (user.parentPhone && user.parentPhone !== user.phone) {
                sendSMS(user.parentPhone, parentSmsMsg).catch(err => console.error("Parent SMS fail:", err.message));
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
            const emailMsg = `Hello ${user.name},\n\nYour attendance for ${date} has been manually recorded.\n\nTime: ${time}`;
            sendEmail(user.email, emailMsg);
        }
        if (user.phone) {
            const smsMsg = `Hello ${user.name}, your attendance for ${date} was manually marked at ${time}.`;
            sendSMS(user.phone, smsMsg);
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
        const { date } = req.body;
        const searchDate = (date || '').toString().trim();
        console.log(`[ABSENCE CHECK] Received date from frontend: "${searchDate}"`);

        // 1. Get all registered users
        const allUsers = await User.find({});
        console.log(`[ABSENCE CHECK] Total registered users: ${allUsers.length}`);

        // 2. Get ALL records and filter with a Multi-Layer Matcher
        const todayRecords = await Attendance.find({});
        const presentRecords = todayRecords.filter(rec => {
            if (rec.status !== 'Present' && !rec.status.includes('Present')) return false;
            
            const dbDate = rec.date ? rec.date.toString().trim() : '';
            // Try exact match first
            if (dbDate === searchDate) return true;
            
            // Try fuzzy date match as fallback
            try {
                const recISO = new Date(dbDate).toISOString().split('T')[0];
                return recISO === searchDate;
            } catch (e) {
                return false;
            }
        });
        
        const presentUserIds = [...new Set(presentRecords.map(rec => rec.userId))];
        console.log(`[ABSENCE CHECK] Date Search: ${searchDate}, Found Unique Present: ${presentUserIds.length}`);

        // 3. Find missing students
        const absentStudents = allUsers.filter(user => !presentUserIds.includes(user.userId));
        console.log(`[ABSENCE CHECK] Identified ${absentStudents.length} absent students.`);

        // 4. Trigger Alerts (Non-blocking)
        const timeNow = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });

        for (const student of absentStudents) {
            // Check if record already exists
            const exists = await Attendance.findOne({ userId: student.userId, date: searchDate });
            if (!exists) {
                await Attendance.create({
                    userId: student.userId,
                    name: student.name,
                    date: searchDate,
                    time: timeNow,
                    status: 'Absent'
                });
            }

            const emailMsg = `URGENT: ${student.name} is ABSENT today (${searchDate}).\n\nPlease check with your ward.`;
            const smsMsg = `ALERT: Your ward ${student.name} is ABSENT today, ${searchDate}. - AI System`;

            // Background Notifications
            if (student.email) sendEmail(student.email, emailMsg).catch(err => console.error("Absence Email fail:", err.message));
            if (student.parentEmail) sendEmail(student.parentEmail, emailMsg).catch(err => console.error("Absence Parent Email fail:", err.message));
            if (student.parentPhone) sendSMS(student.parentPhone, smsMsg).catch(err => console.error("Absence SMS fail:", err.message));
        }

        res.status(200).json({
            message: `Absence processing complete. Alerts sent to ${absentStudents.length} parents.`,
            presentCount: presentUserIds.length,
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

// @desc    Get monthly attendance sheet
// @route   GET /api/attendance/sheet
// @access  Public
export const getAttendanceSheet = async (req, res) => {
    try {
        const { month } = req.query; // YYYY-MM
        if (!month) {
            return res.status(400).json({ message: 'Month is required (YYYY-MM)' });
        }

        const users = await User.find({}).sort({ name: 1 });
        const attendanceRecords = await Attendance.find({
            date: { $regex: `^${month}` }
        });

        // Get total days in the specified month
        const [year, monthNum] = month.split('-').map(Number);
        const daysInMonth = new Date(year, monthNum, 0).getDate();

        const sheetData = users.map(user => {
            const userAttendance = {};
            let presentCount = 0;

            // Initialize all days as null
            for (let i = 1; i <= daysInMonth; i++) {
                const dayStr = i.toString().padStart(2, '0');
                userAttendance[dayStr] = null; 
            }

            // Fill in actual attendance
            const userRecords = attendanceRecords.filter(rec => rec.userId === user.userId);
            userRecords.forEach(rec => {
                const day = rec.date.split('-')[2];
                userAttendance[day] = rec.status;
                if (rec.status.includes('Present')) {
                    presentCount++;
                }
            });

            const percentage = ((presentCount / daysInMonth) * 100).toFixed(1);

            return {
                userId: user.userId,
                name: user.name,
                attendance: userAttendance,
                presentCount,
                totalDays: daysInMonth,
                percentage
            };
        });

        res.json({
            month,
            daysInMonth,
            data: sheetData
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

