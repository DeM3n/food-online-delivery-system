const RestaurantCommand = require('./RestaurantCommand');

class UpdateMenuItemCommand extends RestaurantCommand {
    constructor(menuService, itemId, userId, itemData, io) {
        super();
        this.menuService = menuService;
        this.itemId = itemId;
        this.userId = userId;
        this.itemData = itemData;
        this.io = io;
    }

    async execute() {
        return await this.menuService.updateMenuItem(this.itemId, this.userId, this.itemData, this.io);
    }
}

module.exports = UpdateMenuItemCommand;
