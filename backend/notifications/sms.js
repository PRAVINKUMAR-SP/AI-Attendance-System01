import twilio from 'twilio';

export const sendSMS = async (to, messageContent) => {
    // Format number for Twilio (Ensure + prefix)
    let formattedNumber = to;
    if (!to.startsWith('+')) {
        // Default to India (+91) if 10 digits
        formattedNumber = to.length === 10 ? `+91${to}` : `+${to}`;
    }

    try {
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        const fromPhone = process.env.TWILIO_PHONE_NUMBER;

        if (!accountSid || !authToken || !fromPhone || accountSid === 'your_twilio_sid') {
            console.log(`[Mock SMS] To ${to}: ${messageContent}`);
            return;
        }

        const client = twilio(accountSid, authToken);

        const messageResponse = await client.messages.create({
            body: messageContent,
            from: fromPhone,
            to: formattedNumber
        });

        console.log(`[SMS Sent] Message SID: ${messageResponse.sid}`);
    } catch (error) {
        console.error(`[SMS Error] Failed to send SMS to ${to}: ${error.message}`);
    }
};
