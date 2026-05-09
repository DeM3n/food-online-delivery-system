const express = require('express');
const router = express.Router();
const {
    getSystemStats,
    getAllUsers,
    updateUserStatus,
    getPendingApprovals,
    getPendingApprovalDetails,
    approvePendingApproval,
    rejectPendingApproval
} = require('../controllers/adminController');
const { protect, admin } = require('../middleware/authMiddleware');

router.use(protect);
router.use(admin);

router.get('/stats', getSystemStats);
router.get('/users', getAllUsers);
router.put('/users/:id/status', updateUserStatus);

router.get('/pending-approvals', getPendingApprovals);
router.get('/pending-approvals/:id', getPendingApprovalDetails);
router.post('/pending-approvals/:id/approve', approvePendingApproval);
router.post('/pending-approvals/:id/reject', rejectPendingApproval);

module.exports = router;
