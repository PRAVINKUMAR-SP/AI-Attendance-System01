import NotificationLog from '../models/NotificationLog.js';

export const sendEmail = async (to, messageContent, userId = 'Unknown', name = 'Unknown') => {
    try {
        const apiKey = process.env.RESEND_API_KEY;
        const fromEmail = process.env.EMAIL_FROM_ADDRESS || 'onboarding@resend.dev'; // Resend's default testing domain

        if (!apiKey) {
            console.log(`[Mock Email] To ${to}: ${messageContent}`);
            return;
        }

        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: `AI Attendance System <${fromEmail}>`,
                to: [to],
                subject: 'AI Attendance System Notification',
                text: `${messageContent}\n\nThank you.\nAI Attendance System`
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to send email via Resend API');
        }

        console.log(`[EMAIL SUCCESS] Message sent via Resend API: ${data.id}`);
        
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
