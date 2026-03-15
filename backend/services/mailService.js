const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: Number(process.env.MAIL_PORT || 587),
  secure: String(process.env.MAIL_SECURE || 'false') === 'true',
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

const sendDeliveredOrderEmail = async ({ to, customerName, orderId, restaurantName }) => {
  const subject = `Đơn hàng ${orderId} đã được giao thành công`;

  const html = `
    <div style="margin:0; padding:0; background-color:#f9fafb; font-family:Arial,Helvetica,sans-serif; color:#1f2937;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f9fafb; margin:0; padding:24px 0;">
        <tr>
            <td align="center">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:640px; background-color:#ffffff; border:1px solid #f3f4f6; border-radius:24px; overflow:hidden;">
                
                <!-- Header -->
                <tr>
                <td style="padding:32px 32px 24px 32px; background:linear-gradient(135deg,#fff7ed 0%,#ffffff 100%); border-bottom:1px solid #f3f4f6;">
                    <div style="display:inline-block; padding:10px 16px; background-color:#f97316; color:#ffffff; font-size:13px; font-weight:700; border-radius:999px; letter-spacing:0.3px;">
                    OFDS • ORDER UPDATE
                    </div>

                    <h1 style="margin:18px 0 8px 0; font-size:28px; line-height:1.25; font-weight:800; color:#111827;">
                    Đơn hàng đã được giao thành công
                    </h1>

                    <p style="margin:0; font-size:15px; line-height:1.7; color:#6b7280;">
                    Xin chào <strong style="color:#111827;">${customerName || 'bạn'}</strong>, đơn hàng của bạn đã đến nơi an toàn và hoàn tất giao thành công.
                    </p>
                </td>
                </tr>

                <!-- Main Card -->
                <tr>
                <td style="padding:24px 32px 8px 32px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border:1px solid #f3f4f6; border-radius:20px; background-color:#ffffff;">
                    <tr>
                        <td style="padding:24px;">
                        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                            <tr>
                            <td style="padding-bottom:18px; border-bottom:1px solid #f3f4f6;">
                                <div style="font-size:18px; font-weight:800; color:#111827; margin-bottom:4px;">
                                Tóm tắt đơn hàng
                                </div>
                                <div style="font-size:13px; color:#9ca3af;">
                                Xác nhận giao hàng từ hệ thống OFDS
                                </div>
                            </td>
                            </tr>

                            <tr>
                            <td style="padding-top:18px;">
                                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                                <tr>
                                    <td style="padding:10px 0; font-size:14px; color:#6b7280;">Mã đơn hàng</td>
                                    <td align="right" style="padding:10px 0; font-size:14px; font-weight:700; color:#111827;">
                                    ${orderId}
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding:10px 0; font-size:14px; color:#6b7280; border-top:1px solid #f9fafb;">Nhà hàng</td>
                                    <td align="right" style="padding:10px 0; font-size:14px; font-weight:700; color:#111827; border-top:1px solid #f9fafb;">
                                    ${restaurantName || 'Nhà hàng'}
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding:10px 0; font-size:14px; color:#6b7280; border-top:1px solid #f9fafb;">Trạng thái</td>
                                    <td align="right" style="padding:10px 0; border-top:1px solid #f9fafb;">
                                    <span style="display:inline-block; padding:7px 12px; background-color:#fff7ed; color:#ea580c; font-size:12px; font-weight:800; border-radius:999px; text-transform:uppercase; letter-spacing:0.4px;">
                                        Delivered
                                    </span>
                                    </td>
                                </tr>
                                </table>
                            </td>
                            </tr>
                        </table>
                        </td>
                    </tr>
                    </table>
                </td>
                </tr>

                <!-- Message -->
                <tr>
                <td style="padding:16px 32px 8px 32px;">
                    <div style="padding:20px 22px; background-color:#fff7ed; border:1px solid #fed7aa; border-radius:18px;">
                    <div style="font-size:15px; font-weight:700; color:#9a3412; margin-bottom:8px;">
                        Cảm ơn bạn đã đặt hàng tại OFDS
                    </div>
                    <div style="font-size:14px; line-height:1.7; color:#7c2d12;">
                        Chúng tôi hy vọng bạn đã có trải nghiệm tốt với đơn hàng này. Bạn có thể quay lại hệ thống để theo dõi lịch sử đơn hàng hoặc tiếp tục đặt món bất cứ lúc nào.
                    </div>
                    </div>
                </td>
                </tr>

                <!-- CTA -->
                <tr>
                <td align="center" style="padding:28px 32px 16px 32px;">
                    <a href="${process.env.FRONTEND_BASE_URL || 'http://localhost:5173'}/customer/tracking"
                    style="display:inline-block; background-color:#f97316; color:#ffffff; text-decoration:none; font-size:15px; font-weight:800; padding:14px 28px; border-radius:14px;">
                    Xem đơn hàng của tôi
                    </a>
                </td>
                </tr>

                <!-- Footer -->
                <tr>
                <td style="padding:12px 32px 32px 32px;">
                    <div style="font-size:12px; line-height:1.7; color:#9ca3af; text-align:center;">
                    Email này được gửi tự động từ hệ thống OFDS.<br/>
                    Nếu bạn không thực hiện giao dịch này, vui lòng liên hệ bộ phận hỗ trợ.
                    </div>
                </td>
                </tr>

            </table>
            </td>
        </tr>
        </table>
    </div>
    `;

  return transporter.sendMail({
    from: process.env.MAIL_FROM || process.env.MAIL_USER,
    to,
    subject,
    html,
  });
};

module.exports = {
  sendDeliveredOrderEmail,
};