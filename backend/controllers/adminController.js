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
        const { restaurantId, status } = req.query;
        const result = await adminService.getAllOrders(restaurantId, status);
        res.json({ success: true, data: result.orders, counts: result.counts });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};
