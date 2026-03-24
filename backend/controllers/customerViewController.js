const customerAppFacade = require('../facades/customerAppFacade');

/**
 * CustomerViewController
 *
 * Thin UI-facing controller for the Customer Web/App subsystem.
 * Each method delegates to CustomerAppFacade so the frontend/client only talks
 * to one entry point for customer-facing actions.
 */
exports.login = (req, res) => customerAppFacade.authenticateUser(req, res);
exports.browseCatalog = (req, res) => customerAppFacade.browseCatalog(req, res);
exports.getProductDetail = (req, res) => customerAppFacade.getProductDetail(req, res);
exports.getCart = (req, res) => customerAppFacade.getCart(req, res);
exports.addToCart = (req, res) => customerAppFacade.addToCart(req, res);
exports.updateCartItem = (req, res) => customerAppFacade.updateCartItem(req, res);
exports.removeCartItem = (req, res) => customerAppFacade.removeCartItem(req, res);
exports.clearCart = (req, res) => customerAppFacade.clearCart(req, res);
exports.checkout = (req, res) => customerAppFacade.checkout(req, res);
exports.trackOrders = (req, res) => customerAppFacade.trackOrders(req, res);
exports.getMonthlyFavorite = (req, res) => customerAppFacade.getMonthlyFavorite(req, res);
