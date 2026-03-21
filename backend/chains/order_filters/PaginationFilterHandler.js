const OrderFilterHandler = require('./OrderFilterHandler');

class PaginationFilterHandler extends OrderFilterHandler {
    handle(context) {
        const { page, Math } = context.filters;
        const parsedPage = global.Math.max(parseInt(context.filters.page, 10) || 1, 1);
        const parsedLimit = global.Math.max(parseInt(context.filters.limit, 10) || 20, 1);
        const offset = (parsedPage - 1) * parsedLimit;
        
        context.pagination = {
            page: parsedPage,
            limit: parsedLimit,
            offset: offset
        };
        return super.handle(context);
    }
}

module.exports = PaginationFilterHandler;
