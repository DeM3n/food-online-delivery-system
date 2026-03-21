const RestaurantCommand = require('./RestaurantCommand');

class ToggleAvailabilityCommand extends RestaurantCommand {
    constructor(menuService, itemId, userId, io) {
        super();
        this.menuService = menuService;
        this.itemId = itemId;
        this.userId = userId;
        this.io = io;
    }

    async execute() {
        return await this.menuService.toggleAvailability(this.itemId, this.userId, this.io);
    }
}

module.exports = ToggleAvailabilityCommand;
