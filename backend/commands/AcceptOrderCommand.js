const RestaurantCommand = require('./RestaurantCommand');

class AcceptOrderCommand extends RestaurantCommand {
    constructor(fulfillmentService, orderId, user, io) {
        super();
        this.fulfillmentService = fulfillmentService;
        this.orderId = orderId;
        this.user = user;
        this.io = io;
    }

    async execute() {
        return await this.fulfillmentService.updateStatus(this.orderId, 'accepted', this.user, this.io);
    }
}

module.exports = AcceptOrderCommand;
