import nodemailer from 'nodemailer';
import NotificationLog from '../models/NotificationLog.js';
import dns from 'dns';

export const sendEmail = async (to, messageContent, userId = 'Unknown', name = 'Unknown') => {
    try {
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            console.log(`[Mock Email] To ${to}: ${messageContent}`);
            return;
        }

        // Network Heartbeat Test
        try {
            await new Promise((resolve, reject) => {
                dns.lookup('smtp.gmail.com', { family: 4 }, (err, address) => {
                    if (err) reject(new Error(`DNS Lookup Failed: ${err.message}`));
                    else resolve(address);
                });
            });
            console.log("[HEARTBEAT] smtp.gmail.com is reachable via IPv4");
        } catch (netErr) {
            console.error("[HEARTBEAT ERROR]", netErr.message);
            await NotificationLog.create({
                userId, name, type: 'NetworkCheck', recipient: 'google.com',
                status: 'Failed', error: netErr.message
            });
        }

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
            tls: {
                rejectUnauthorized: false
            }
        });

        const mailOptions = {
            from: `"AI Attendance System" <${process.env.EMAIL_USER}>`,
            to: to,
            subject: 'AI Attendance System Notification',
            text: `${messageContent}\n\nThank you.\nAI Attendance System`,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`[EMAIL SUCCESS] Message sent: ${info.messageId}`);
        
        // Log Success to DB
        await NotificationLog.create({
            userId,
            name,
            type: 'Email',
            recipient: to,
            status: 'Success'
        });
    } catch (error) {
        console.error(`[EMAIL ERROR] Failed to send email to ${to}:`, error.message);
        
        // Log Failure to DB
        try {
            await NotificationLog.create({
                userId,
                name,
                type: 'Email',
                recipient: to,
                status: 'Failed',
                error: error.message
            });
        } catch (dbErr) {
            console.error("Critical: Failed to log notification failure:", dbErr.message);
        }
    }
};
