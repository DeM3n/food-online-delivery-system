const RestaurantFilterHandler = require('./RestaurantFilterHandler');
const StatusFilterHandler = require('./StatusFilterHandler');
const DateFilterHandler = require('./DateFilterHandler');
const PaginationFilterHandler = require('./PaginationFilterHandler');

class OrderFilterChain {
    static buildContext(filters) {
        const context = {
            filters,
            where: {},
            countWhere: {},
            pagination: {}
        };

        const restaurantHandler = new RestaurantFilterHandler();
        const statusHandler = new StatusFilterHandler();
        const dateHandler = new DateFilterHandler();
        const paginationHandler = new PaginationFilterHandler();

        // Chain the handlers correctly
        // restaurantHandler -> statusHandler -> dateHandler -> paginationHandler
        restaurantHandler.setNext(statusHandler).setNext(dateHandler).setNext(paginationHandler);

        // Execute the chain starting from the first handler
        return restaurantHandler.handle(context);
    }
}

module.exports = OrderFilterChain;
