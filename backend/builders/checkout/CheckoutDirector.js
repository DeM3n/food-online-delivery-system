/**
 * CheckoutDirector manages the building process.
 * It's responsible for the order of the construction steps.
 */
class CheckoutDirector {
    constructor(builder) {
        this.builder = builder;
    }

    async constructRequest() {
        await this.builder.buildCustomerInfo();
        await this.builder.buildRestaurantInfo();
        await this.builder.buildAddressInfo();
        await this.builder.buildCartInfo();
        await this.builder.buildPaymentInfo();
        return this.builder.getResult();
    }
}

module.exports = CheckoutDirector;
