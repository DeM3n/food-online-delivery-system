const OrderFilterHandler = require('./OrderFilterHandler');
const { Op } = require('sequelize');

class DateFilterHandler extends OrderFilterHandler {
    handle(context) {
        const { month, year } = context.filters;
        if (month && year) {
            const startOfMonth = new Date(year, month - 1, 1);
            const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);
            const dateCondition = { [Op.between]: [startOfMonth, endOfMonth] };
            context.where.created_at = dateCondition;
            context.countWhere.created_at = dateCondition;
        } else if (year) {
            const startOfYear = new Date(year, 0, 1);
            const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999);
            const dateCondition = { [Op.between]: [startOfYear, endOfYear] };
            context.where.created_at = dateCondition;
            context.countWhere.created_at = dateCondition;
        }
        return super.handle(context);
    }
}

module.exports = DateFilterHandler;
