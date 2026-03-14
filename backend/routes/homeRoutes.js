const express = require('express');
const router = express.Router();
const { getHomeSummary } = require('../controllers/homeController');

router.get('/summary', getHomeSummary);

module.exports = router;