const adminService = require('../services/adminService');

exports.getSystemStats = async (req, res) => {
    try {
        const stats = await adminService.getSystemStats();
        res.json({ success: true, data: stats });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

exports.getAllUsers = async (req, res) => {
    try {
        const { status } = req.query;
        const users = await adminService.getAllUsers(status);
        res.json({ success: true, data: users });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

exports.updateUserStatus = async (req, res) => {
    try {
        const { is_active } = req.body;
        const updatedUser = await adminService.updateUserStatus(req.params.id, is_active, req.user.id);
        res.json({ success: true, data: updatedUser, message: 'User status updated successfully' });
    } catch (error) {
        console.error(error);
        const statusCode = error.message.includes('not found') ? 404 :
            error.message.includes('Cannot') || error.message.includes('required') ? 400 : 500;
        res.status(statusCode).json({ success: false, message: error.message });
    }
};

exports.getPendingApprovals = async (req, res) => {
    try {
        const { type = 'all', search = '', sort = 'newest', page = 1, limit = 9 } = req.query;
        const result = await adminService.getPendingApprovals({ type, search, sort, page, limit });

        res.json({ success: true, data: result.items, pagination: result.pagination });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

exports.getPendingApprovalDetails = async (req, res) => {
    try {
        const result = await adminService.getPendingApprovalById(req.params.id);
        res.json({ success: true, data: result });
    } catch (error) {
        console.error(error);
        const statusCode = error.message.includes('not found') ? 404 : 500;
        res.status(statusCode).json({ success: false, message: error.message });
    }
};

exports.approvePendingApproval = async (req, res) => {
    try {
        const result = await adminService.approvePendingRequest(req.params.id);
        res.json({ success: true, data: result, message: 'Request approved successfully' });
    } catch (error) {
        console.error(error);
        const statusCode = error.message.includes('not found') ? 404 : 500;
        res.status(statusCode).json({ success: false, message: error.message });
    }
};

exports.rejectPendingApproval = async (req, res) => {
    try {
        const { reason = '' } = req.body;
        const result = await adminService.rejectPendingRequest(req.params.id, reason);
        res.json({ success: true, data: result, message: 'Request rejected successfully' });
    } catch (error) {
        console.error(error);
        const statusCode = error.message.includes('not found') ? 404 : 500;
        res.status(statusCode).json({ success: false, message: error.message });
    }
};
