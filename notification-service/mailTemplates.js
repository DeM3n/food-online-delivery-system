const getDeliveredEmailTemplate = ({ customerName, orderId, restaurantName }) => `
    <div style="background-color:#f9fafb; padding:24px; font-family:Arial,sans-serif;">
        <div style="max-width:600px; margin:0 auto; background:#fff; padding:32px; border-radius:24px; border:1px solid #f3f4f6;">
            <div style="display:inline-block; padding:8px 16px; background:#f97316; color:#fff; border-radius:999px; font-size:12px; font-weight:bold;">OFDS • GIAO HÀNG</div>
            <h1 style="color:#111827; margin-top:20px;">Đơn hàng đã giao thành công</h1>
            <p>Chào <strong>${customerName}</strong>, đơn hàng #${orderId} từ <strong>${restaurantName}</strong> đã được giao đến bạn.</p>
            <div style="padding:20px; background:#fff7ed; border-radius:16px; margin:20px 0;">
                <p style="margin:0; color:#9a3412;">Cảm ơn bạn đã tin dùng dịch vụ của OFDS!</p>
            </div>
            <a href="http://localhost:5173/customer/tracking" style="display:inline-block; background:#f97316; color:#fff; padding:12px 24px; text-decoration:none; border-radius:12px; font-weight:bold;">Xem đơn hàng</a>
        </div>
    </div>
`;

const getRefundEmailTemplate = ({ customerName, orderId, refundAmount, gatewayName, status }) => {
    const isSuccess = status === 'success';
    return `
        <div style="background-color:#f9fafb; padding:24px; font-family:Arial,sans-serif;">
            <div style="max-width:600px; margin:0 auto; background:#fff; padding:32px; border-radius:24px; border:1px solid #f3f4f6;">
                <div style="display:inline-block; padding:8px 16px; background:${isSuccess ? '#2563eb' : '#f59e0b'}; color:#fff; border-radius:999px; font-size:12px; font-weight:bold;">OFDS • HOÀN TIỀN</div>
                <h1 style="color:#111827; margin-top:20px;">${isSuccess ? 'Hoàn tiền thành công' : 'Cập nhật hoàn tiền'}</h1>
                <p>Chào <strong>${customerName}</strong>, yêu cầu hoàn tiền cho đơn hàng #${orderId} đã được xử lý.</p>
                <p>Số tiền: <strong>${new Intl.NumberFormat('vi-VN').format(refundAmount)} đ</strong> via ${gatewayName}</p>
                <a href="http://localhost:5173/customer/tracking" style="display:inline-block; background:#2563eb; color:#fff; padding:12px 24px; text-decoration:none; border-radius:12px; font-weight:bold;">Kiểm tra trạng thái</a>
            </div>
        </div>
    `;
};

const getApprovalStatusTemplate = ({ fullName, accountType, status, reason }) => {
    const isApproved = status.toUpperCase() === 'APPROVED';
    const roleLabel = accountType === 'restaurant' ? 'nhà hàng' : 'tài xế';
    return `
        <div style="background-color:#f9fafb; padding:24px; font-family:Arial,sans-serif;">
            <div style="max-width:600px; margin:0 auto; background:#fff; padding:32px; border-radius:24px; border:1px solid #f3f4f6;">
                <h1 style="color:#111827;">${isApproved ? 'Tài khoản đã được duyệt' : 'Kết quả xét duyệt'}</h1>
                <p>Chào <strong>${fullName}</strong>, tài khoản ${roleLabel} của bạn đã có kết quả xét duyệt:</p>
                <div style="padding:16px; background:${isApproved ? '#f0fdf4' : '#fef2f2'}; border-radius:12px; color:${isApproved ? '#166534' : '#991b1b'}; font-weight:bold; font-size:18px;">
                    ${status.toUpperCase()}
                </div>
                ${!isApproved && reason ? `<p style="margin-top:10px; color:#991b1b;">Lý do: ${reason}</p>` : ''}
            </div>
        </div>
    `;
};

module.exports = {
    getDeliveredEmailTemplate,
    getRefundEmailTemplate,
    getApprovalStatusTemplate
};
