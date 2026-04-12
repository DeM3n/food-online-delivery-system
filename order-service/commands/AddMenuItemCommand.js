const RestaurantCommand = require('./RestaurantCommand');

class AddMenuItemCommand extends RestaurantCommand {
    constructor(menuService, userId, itemData) {
        super();
        this.menuService = menuService;
        this.userId = userId;
        this.itemData = itemData;
    }

    async execute() {
        return await this.menuService.createMenuItem(this.userId, this.itemData);
    }
}

module.exports = AddMenuItemCommand;
