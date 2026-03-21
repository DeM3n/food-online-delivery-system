class RestaurantCommand {
    constructor() {
        if (this.constructor === RestaurantCommand) {
            throw new Error("Abstract classes can't be instantiated.");
        }
    }

    async execute() {
        throw new Error("Method 'execute()' must be implemented.");
    }
}

module.exports = RestaurantCommand;
