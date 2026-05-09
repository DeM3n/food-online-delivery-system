const express = require('express');
const router = express.Router();
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

const {
    getDeliveredEmailTemplate,
    getRefundEmailTemplate,
    getApprovalStatusTemplate
} = require('../mailTemplates');

// Helper to send email
const sendEmail = async (options) => {
    return transporter.sendMail({
        from: process.env.MAIL_FROM || process.env.MAIL_USER,
        to: options.to,
        subject: options.subject,
        html: options.html,
    });
};

// Route: Send Pending Approval Status Email
router.post('/send-approval-status', async (req, res) => {
    try {
        const { to, fullName, accountType, status, reason } = req.body;
        const normalizedStatus = String(status || '').toUpperCase();
        const isApproved = normalizedStatus === 'APPROVED';
        const roleLabel = accountType === 'restaurant' ? 'nhà hàng' : 'tài xế';

        const subject = isApproved
            ? `Tai khoan ${roleLabel} cua ban da duoc phe duyet`
            : `Cap nhat ket qua xet duyet tai khoan ${roleLabel}`;

        const html = getApprovalStatusTemplate({ fullName, accountType, status, reason });

        await sendEmail({ to, subject, html });
        res.json({ success: true, message: 'Approval email sent' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed to send email' });
    }
});

// Route: Send Order Delivered Email
router.post('/send-order-delivered', async (req, res) => {
    try {
        const { to, customerName, orderId, restaurantName } = req.body;
        const subject = `Don hang #${orderId} da duoc giao thanh cong`;
        const html = getDeliveredEmailTemplate({ customerName, orderId, restaurantName });

        await sendEmail({ to, subject, html });
        res.json({ success: true, message: 'Delivered email sent' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed to send email' });
    }
});

// Route: Send Refund Email
router.post('/send-refund', async (req, res) => {
    try {
        const { to, customerName, orderId, refundAmount, gatewayName, status } = req.body;
        const isSuccess = status === 'success';
        const subject = isSuccess
            ? `Hoan tien don hang ${orderId} thanh cong`
            : `Cap nhat hoan tien don hang ${orderId}`;

        const html = getRefundEmailTemplate({ customerName, orderId, refundAmount, gatewayName, status });

        await sendEmail({ to, subject, html });
        res.json({ success: true, message: 'Refund email sent' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Failed to send email' });
    }
});

module.exports = router;
