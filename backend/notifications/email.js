import nodemailer from 'nodemailer';

export const sendEmail = async (to, messageContent) => {
    try {
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            console.log(`[Mock Email] To ${to}: ${messageContent}`);
            return;
        }

        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true, // Use SSL for port 465
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        const mailOptions = {
            from: `"AI Attendance System" <${process.env.EMAIL_USER}>`,
            to: to,
            subject: 'AI Attendance System Notification',
            text: `${messageContent}\n\nThank you.\nAI Attendance System`,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`[Email Sent] To: ${to} - ${info.response}`);
    } catch (error) {
        console.error(`[Email Error] Failed to send email to ${to}: ${error.message}`);
    }
};
