import nodemailer from 'nodemailer';

export const sendEmail = async (to, messageContent) => {
    try {
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            console.log(`[Mock Email] To ${to}: ${messageContent}`);
            return;
        }

        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 587,
            secure: false, // Use TLS for port 587
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
    } catch (error) {
        console.error(`[EMAIL ERROR] Failed to send email to ${to}:`, error.message);
        // Don't throw - we don't want to crash the whole attendance process if one email fails
    }
};
