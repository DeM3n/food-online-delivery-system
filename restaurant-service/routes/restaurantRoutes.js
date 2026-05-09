const express = require('express');
const { getRestaurants, getRestaurantById, getMyRestaurantProfile, updateMyRestaurantProfile, createRestaurantProfile } = require('../controllers/restaurantController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/my-profile', protect, authorize('restaurant'), getMyRestaurantProfile);
router.put('/my-profile', protect, authorize('restaurant'), updateMyRestaurantProfile);
router.post('/', protect, authorize('restaurant'), createRestaurantProfile);
router.get('/', getRestaurants);
router.get('/:id', getRestaurantById);

module.exports = router;
