const express = require('express');
const router = express.Router();
const { getSystemStats } = require('../controllers/adminController');

/**
 * @openapi
 * /api/admin/stats:
 *   get:
 *     tags:
 *       - Admin
 *     summary: Get system statistics
 *     description: Returns system-wide statistics for the admin dashboard.
 *     responses:
 *       200:
 *         description: System statistics retrieved successfully
 *       500:
 *         description: Server error
 */
router.get('/stats', getSystemStats);

module.exports = router;
