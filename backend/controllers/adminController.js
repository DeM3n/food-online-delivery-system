const adminService = require('../services/adminService');

exports.getSystemStats = async (req, res) => {
    try {
        const stats = await adminService.getSystemStats();
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};
