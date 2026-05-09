const adminService = require('../services/adminService');

exports.getAllOrders = async (req, res) => {
    try {
        const { restaurantId, status, page, limit, month, year } = req.query;
        const result = await adminService.getAllOrders(restaurantId, status, page, limit, month, year);
        res.json({ success: true, data: result.orders, counts: result.counts, pagination: result.pagination });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};
