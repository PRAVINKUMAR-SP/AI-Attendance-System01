import { Resend } from 'resend';
import NotificationLog from '../models/NotificationLog.js';

export const sendEmail = async (to, messageContent, userId = 'Unknown', name = 'Unknown') => {
    try {
        const apiKey = process.env.RESEND_API_KEY;
        const fromEmail = process.env.EMAIL_FROM_ADDRESS || 'onboarding@resend.dev'; 

        if (!apiKey) {
            console.log(`[Mock Email] To ${to}: ${messageContent}`);
            return;
        }

        const resend = new Resend(apiKey);

        const { data, error } = await resend.emails.send({
            from: `AI Attendance System <${fromEmail}>`,
            to: to, // Note: For Resend free tier, this MUST match the verified email
            subject: 'AI Attendance System Notification',
            text: `${messageContent}\n\nThank you.\nAI Attendance System`,
        });

        if (error) {
            throw new Error(error.message || 'Failed to send email via Resend SDK');
        }

        console.log(`[EMAIL SUCCESS] Message sent via Resend SDK: ${data.id}`);
        
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
