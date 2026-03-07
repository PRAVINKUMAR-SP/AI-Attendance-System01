import twilio from 'twilio';

export const makeAbsenceCall = async (to, name) => {
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
            console.log(`[Mock Voice Call] Would have called ${formattedNumber}: "Student ${name} today not coming college"`);
            return;
        }

        const client = twilio(accountSid, authToken);

        const call = await client.calls.create({
            twiml: `<Response><Say voice="alice">${name} today not coming college. ${name} today not coming college.</Say></Response>`,
            to: formattedNumber,
            from: fromPhone
        });

        console.log(`[Voice Call Initiated] SID: ${call.sid}`);
    } catch (error) {
        console.error(`[Voice Error] Failed to initiate call to ${to}: ${error.message}`);
    }
};
