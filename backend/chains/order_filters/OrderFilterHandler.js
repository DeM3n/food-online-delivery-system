class OrderFilterHandler {
    constructor() {
        if (this.constructor === OrderFilterHandler) {
            throw new Error("Abstract classes can't be instantiated.");
        }
        this.nextHandler = null;
    }
    
    setNext(handler) {
        this.nextHandler = handler;
        return handler;
    }
    
    handle(context) {
        if (this.nextHandler) {
            return this.nextHandler.handle(context);
        }
        return context;
    }
}

module.exports = OrderFilterHandler;
