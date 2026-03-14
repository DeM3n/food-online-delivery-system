const express = require('express');
const router = express.Router();
const { searchAll } = require('../controllers/searchController');
const { getSearchSuggestions } = require('../controllers/searchSuggestionsController');

router.get('/suggestions', getSearchSuggestions);
router.get('/', searchAll);

module.exports = router;