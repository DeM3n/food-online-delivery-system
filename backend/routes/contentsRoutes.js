const express = require('express');
const router = express.Router();
const { getContents, getContentDetail } = require('../controllers/contentsController');

router.get('/', getContents);
router.get('/:id', getContentDetail);

module.exports = router;
