const OrderFilterHandler = require('./OrderFilterHandler');

class RestaurantFilterHandler extends OrderFilterHandler {
    handle(context) {
        if (context.filters.restaurantId) {
            context.where.restaurant_id = context.filters.restaurantId;
            context.countWhere.restaurant_id = context.filters.restaurantId;
        }
        return super.handle(context);
    }
}

module.exports = RestaurantFilterHandler;
