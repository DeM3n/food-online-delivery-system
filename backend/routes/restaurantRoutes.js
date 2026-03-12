const express = require('express');
const router = express.Router();
const { getRestaurants, getRestaurantById } = require('../controllers/restaurantController');

router.get('/', getRestaurants);
router.get('/:id', getRestaurantById);

module.exports = router;
