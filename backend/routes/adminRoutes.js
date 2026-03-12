const express = require('express');
const router = express.Router();
const { getSystemStats } = require('../controllers/adminController');

router.get('/stats', getSystemStats);

module.exports = router;
