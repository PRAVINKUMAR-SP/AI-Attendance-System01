import NotificationLog from '../models/NotificationLog.js';

export const sendEmail = async (to, messageContent, userId = 'Unknown', name = 'Unknown', status = 'Present') => {
    try {
        const serviceId = process.env.EMAILJS_SERVICE_ID;
        const templateId = process.env.EMAILJS_TEMPLATE_ID;
        const publicKey = process.env.EMAILJS_PUBLIC_KEY;
        const privateKey = process.env.EMAILJS_PRIVATE_KEY;

        if (!serviceId || !templateId || !publicKey) {
            console.log(`[Mock Email] To ${to}: ${messageContent}`);
            return;
        }

        const templateParams = {
            name: name,
            time: new Date().toLocaleString(),
            message: messageContent,
            status: status,
            status_color: status === 'Present' ? 'green' : 'red',
            emoji: status === 'Present' ? '✅' : '❌',
            to_email: to
        };

        const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                service_id: serviceId,
                template_id: templateId,
                user_id: publicKey,
                accessToken: privateKey,
                template_params: templateParams
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || 'Failed to send email via EmailJS');
        }

        console.log(`[EMAIL SUCCESS] ${status} notification sent to ${to}`);

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
