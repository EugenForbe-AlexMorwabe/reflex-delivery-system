export async function sendSms({ to, message }) {
  if (!process.env.AFRICASTALKING_API_KEY || process.env.AFRICASTALKING_API_KEY === 'demo') {
    console.log(`[SMS DEMO] to=${to}\n${message}`);
    return { sent: false, demo: true };
  }

  const body = new URLSearchParams({
    username: process.env.AFRICASTALKING_USERNAME || 'sandbox',
    to,
    message,
    ...(process.env.AFRICASTALKING_SENDER_ID ? { from: process.env.AFRICASTALKING_SENDER_ID } : {})
  });

  const response = await fetch('https://api.africastalking.com/version1/messaging', {
    method: 'POST',
    headers: {
      'apiKey': process.env.AFRICASTALKING_API_KEY,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json'
    },
    body
  });

  if (!response.ok) throw new Error(`Africa's Talking SMS failed: ${response.status}`);
  return { sent: true, data: await response.json() };
}
