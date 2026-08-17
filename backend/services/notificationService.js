const https = require('https');
const querystring = require('querystring');

const sendEmergencyEmail = async ({ incident, contacts, baseUrl, shareToken }) => {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@saferoute.app';

  if (!host || !user || !pass) {
    return {
      attempted: true,
      sent: false,
      reason: 'Email notification service is not configured (missing SMTP credentials).',
      acceptedCount: 0,
    };
  }

  let nodemailer;
  try {
    nodemailer = require('nodemailer');
  } catch (err) {
    return {
      attempted: true,
      sent: false,
      reason: 'Nodemailer module is not installed on the server.',
      acceptedCount: 0,
    };
  }

  const recipients = contacts
    .map((c) => c.email)
    .filter((e) => typeof e === 'string' && e.trim().length > 0);

  if (recipients.length === 0) {
    return {
      attempted: true,
      sent: false,
      reason: 'No trusted contacts have an email address configured.',
      acceptedCount: 0,
    };
  }

  const transporter = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user, pass },
  });

  const incidentUrl = shareToken
    ? `${baseUrl}/emergency/share/${shareToken}`
    : `${baseUrl}/emergency/${incident._id}`;

  const mapUrl = `https://www.openstreetmap.org/?mlat=${incident.latitude}&mlon=${incident.longitude}#map=16/${incident.latitude}/${incident.longitude}`;

  const mailOptions = {
    from,
    to: recipients.join(','),
    subject: `🚨 Saarthi SOS Emergency Alert`,
    text: `EMERGENCY ALERT: Saarthi SOS activated.
Latitude: ${incident.latitude}
Longitude: ${incident.longitude}
Accuracy: ±${incident.accuracy ? Math.round(incident.accuracy) : 'unknown'} meters
Status: ${incident.status}
Timestamp: ${new Date(incident.incidentDate || incident.createdAt).toLocaleString()}
Emergency Share Link: ${incidentUrl}
Map Link: ${mapUrl}`,
    html: `<div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
      <h2 style="color: #ef4444;">🚨 Saarthi SOS Emergency Alert</h2>
      <p>An emergency SOS alert was activated with the following GPS location:</p>
      <ul>
        <li><strong>Latitude:</strong> ${incident.latitude}</li>
        <li><strong>Longitude:</strong> ${incident.longitude}</li>
        <li><strong>Accuracy:</strong> ±${incident.accuracy ? Math.round(incident.accuracy) : 'unknown'} meters</li>
        <li><strong>Status:</strong> ${incident.status}</li>
        <li><strong>Timestamp:</strong> ${new Date(incident.incidentDate || incident.createdAt).toLocaleString()}</li>
      </ul>
      <p><a href="${incidentUrl}" style="background: #ef4444; color: white; padding: 12px 20px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">View Secure Emergency Location</a></p>
      <p><a href="${mapUrl}" style="color: #2563eb;">View OpenStreetMap</a></p>
    </div>`,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    return {
      attempted: true,
      sent: true,
      acceptedCount: info.accepted?.length || recipients.length,
      messageId: info.messageId,
    };
  } catch (error) {
    return {
      attempted: true,
      sent: false,
      reason: error.message || 'Failed to send email notification.',
      acceptedCount: 0,
    };
  }
};

const sendEmergencySms = async ({ incident, contacts, baseUrl, shareToken }) => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    return {
      attempted: true,
      sent: false,
      reason: 'SMS notification service is not configured (requires Twilio credentials / India DLT registration).',
      acceptedCount: 0,
    };
  }

  const phoneNumbers = contacts
    .map((c) => c.phone)
    .filter((p) => typeof p === 'string' && p.trim().length >= 5);

  if (phoneNumbers.length === 0) {
    return {
      attempted: true,
      sent: false,
      reason: 'No trusted contacts have a valid phone number for SMS.',
      acceptedCount: 0,
    };
  }

  const incidentUrl = shareToken ? `${baseUrl}/emergency/share/${shareToken}` : `${baseUrl}/emergency/${incident._id}`;
  const messageBody = `Saarthi SOS Alert: Emergency location ${incident.latitude.toFixed(5)}, ${incident.longitude.toFixed(5)}. View: ${incidentUrl}`;

  let successCount = 0;
  let lastError = null;

  for (const phone of phoneNumbers) {
    try {
      const postData = querystring.stringify({
        From: fromNumber,
        To: phone,
        Body: messageBody,
      });

      const authHeader = 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64');

      await new Promise((resolve, reject) => {
        const req = https.request(
          `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Content-Length': Buffer.byteLength(postData),
              Authorization: authHeader,
            },
          },
          (res) => {
            let data = '';
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => {
              if (res.statusCode >= 200 && res.statusCode < 300) {
                successCount++;
                resolve(data);
              } else {
                try {
                  const parsed = JSON.parse(data);
                  reject(new Error(parsed.message || `Twilio HTTP ${res.statusCode}`));
                } catch (e) {
                  reject(new Error(`Twilio HTTP ${res.statusCode}`));
                }
              }
            });
          }
        );
        req.on('error', reject);
        req.write(postData);
        req.end();
      });
    } catch (err) {
      lastError = err.message;
    }
  }

  if (successCount > 0) {
    return {
      attempted: true,
      sent: true,
      acceptedCount: successCount,
    };
  } else {
    return {
      attempted: true,
      sent: false,
      reason: lastError || 'SMS provider API call failed.',
      acceptedCount: 0,
    };
  }
};

const sendEmergencyNotification = async ({ incident, contacts, baseUrl, shareToken }) => {
  const emailResult = await sendEmergencyEmail({ incident, contacts, baseUrl, shareToken });
  const smsResult = await sendEmergencySms({ incident, contacts, baseUrl, shareToken });

  return {
    email: emailResult,
    sms: smsResult,
  };
};

module.exports = {
  sendEmergencyNotification,
  sendEmergencyEmail,
  sendEmergencySms,
};
