class RestaurantPortal {
    constructor() {
        this.commandsHistory = [];
    }

    async submitCommand(command) {
        this.commandsHistory.push(command);
        return await command.execute();
    }
}

module.exports = new RestaurantPortal();
