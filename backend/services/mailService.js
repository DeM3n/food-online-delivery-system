const nodemailer = require('nodemailer');

const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: SMTP_PORT,
  secure: process.env.SMTP_SECURE === 'true' || SMTP_PORT === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const getFromAddress = () => {
  const fromName = process.env.MAIL_FROM_NAME || 'OFDS';
  const fromEmail = process.env.MAIL_FROM_EMAIL || process.env.SMTP_USER;
  return `"${fromName}" <${fromEmail}>`;
};

const sendMail = async ({ to, subject, text, html }) => {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error('SMTP configuration is missing. Please set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS.');
  }

  return transporter.sendMail({
    from: getFromAddress(),
    to,
    subject,
    text,
    html,
  });
};

const buildOtpEmail = ({ fullName, otpCode, purpose, ttlMinutes = 5 }) => {
  const safeName = fullName || 'User';
  const title =
    purpose === 'forgot_password'
      ? 'Password Reset OTP'
      : 'Login Verification OTP';

  const intro =
    purpose === 'forgot_password'
      ? 'Use the OTP below to reset your OFDS password.'
      : 'Use the OTP below to complete your OFDS login.';

  const text = `${title}\n\nHello ${safeName},\n\n${intro}\n\nOTP: ${otpCode}\n\nThis OTP expires in ${ttlMinutes} minutes.\n\nIf you did not request this, please ignore this email.\n`;

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #222;">
      <h2>${title}</h2>
      <p>Hello ${safeName},</p>
      <p>${intro}</p>
      <div style="margin: 20px 0; padding: 14px 18px; display: inline-block; border: 1px solid #ddd; border-radius: 8px; font-size: 28px; font-weight: bold; letter-spacing: 6px;">
        ${otpCode}
      </div>
      <p>This OTP expires in <strong>${ttlMinutes} minutes</strong>.</p>
      <p>If you did not request this, please ignore this email.</p>
    </div>
  `;

  return { subject: `[OFDS] ${title}`, text, html };
};

module.exports = {
  transporter,
  sendMail,
  buildOtpEmail,
};
