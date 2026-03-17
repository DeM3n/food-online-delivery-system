const express = require('express');
const router = express.Router();
const {
	getSystemStats,
	getAllUsers,
	getAllOrders,
	updateUserStatus,
	getPendingApprovals,
	getPendingApprovalDetails,
	approvePendingApproval,
	rejectPendingApproval
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);
router.use(authorize('admin'));

router.get('/stats', getSystemStats);
router.get('/users', getAllUsers);
router.put('/users/:id/status', updateUserStatus);
router.get('/orders', getAllOrders);
router.get('/pending-approvals', getPendingApprovals);
router.get('/pending-approvals/:id', getPendingApprovalDetails);
router.patch('/pending-approvals/:id/approve', approvePendingApproval);
router.patch('/pending-approvals/:id/reject', rejectPendingApproval);

module.exports = router;
