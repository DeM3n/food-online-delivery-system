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
        const users = await adminService.getAllUsers();
        res.json({ success: true, data: users });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

exports.getAllOrders = async (req, res) => {
    try {
        const { restaurantId, status, page, limit } = req.query;
        const result = await adminService.getAllOrders(restaurantId, status, page, limit);
        res.json({ success: true, data: result.orders, counts: result.counts, pagination: result.pagination });
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
