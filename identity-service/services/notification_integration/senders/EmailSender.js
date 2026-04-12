const nodemailer = require('nodemailer');
const NotificationSender = require('./NotificationSender');
const {
  sendDeliveredOrderEmail,
  sendRefundEmail,
} = require('../../mailService');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: Number(process.env.MAIL_PORT || 587),
    secure: String(process.env.MAIL_SECURE || 'false') === 'true',
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });

  return transporter;
}

function renderGenericHtml({ subject, content, orderId }) {
  return `
    <div style="margin:0; padding:0; background-color:#f9fafb; font-family:Arial,Helvetica,sans-serif; color:#1f2937;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f9fafb; margin:0; padding:24px 0;">
        <tr>
          <td align="center">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:640px; background-color:#ffffff; border:1px solid #f3f4f6; border-radius:20px; overflow:hidden;">
              <tr>
                <td style="padding:28px 32px 22px 32px; border-bottom:1px solid #f3f4f6;">
                  <h1 style="margin:0 0 10px 0; font-size:24px; line-height:1.3; font-weight:800; color:#111827;">
                    ${subject}
                  </h1>
                  <p style="margin:0; font-size:15px; line-height:1.7; color:#4b5563;">
                    ${content}
                  </p>
                </td>
              </tr>
              ${orderId ? `
              <tr>
                <td style="padding:22px 32px;">
                  <div style="padding:16px 18px; border:1px solid #e5e7eb; border-radius:14px; background-color:#ffffff;">
                    <div style="font-size:14px; color:#6b7280; margin-bottom:6px;">Mã đơn hàng</div>
                    <div style="font-size:16px; font-weight:800; color:#111827;">${orderId}</div>
                  </div>
                </td>
              </tr>` : ''}
              <tr>
                <td style="padding:0 32px 30px 32px; font-size:13px; color:#9ca3af; line-height:1.7;">
                  Email này được gửi tự động từ hệ thống OFDS.
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
  `;
}

class EmailSender extends NotificationSender {
  async send(message) {
    if (!message?.recipient) {
      return {
        ok: false,
        channel: 'email',
        message: 'Missing email recipient',
      };
    }

    if (message.eventType === 'delivery_updated' && message.status === 'delivered') {
      return sendDeliveredOrderEmail({
        to: message.recipient,
        customerName: message.customerName,
        orderId: message.orderId,
        restaurantName: message.restaurantName,
      });
    }

    if (message.eventType === 'payment_updated' && message.status === 'refunded') {
      return sendRefundEmail({
        to: message.recipient,
        customerName: message.customerName,
        orderId: message.orderId,
        refundAmount: message.refundAmount,
        gatewayName: message.gatewayName || 'VNPay',
        status: 'success',
        refundMessage: message.content,
      });
    }

    if (message.eventType === 'payment_updated' && message.status === 'refund_failed') {
      return sendRefundEmail({
        to: message.recipient,
        customerName: message.customerName,
        orderId: message.orderId,
        refundAmount: message.refundAmount,
        gatewayName: message.gatewayName || 'VNPay',
        status: 'failed',
        refundMessage: message.content,
      });
    }

    const mailer = getTransporter();
    return mailer.sendMail({
      from: process.env.MAIL_FROM || process.env.MAIL_USER,
      to: message.recipient,
      subject: message.subject || 'OFDS Notification',
      html: renderGenericHtml({
        subject: message.subject || 'OFDS Notification',
        content: message.content || '',
        orderId: message.orderId || '',
      }),
    });
  }
}

module.exports = EmailSender;