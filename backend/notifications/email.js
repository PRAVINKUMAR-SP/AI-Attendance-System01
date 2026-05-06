import nodemailer from 'nodemailer';
import NotificationLog from '../models/NotificationLog.js';
import dns from 'dns';

export const sendEmail = async (to, messageContent, userId = 'Unknown', name = 'Unknown') => {
    try {
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            console.log(`[Mock Email] To ${to}: ${messageContent}`);
            return;
        }

        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 587,
            secure: false, // STARTTLS
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
            tls: {
                rejectUnauthorized: false
            },
            // FORCE IPv4
            family: 4, 
            connectionTimeout: 20000,
            greetingTimeout: 20000,
            socketTimeout: 20000,
            dnsLookup: (hostname, options, callback) => {
                dns.lookup(hostname, { family: 4 }, callback);
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
