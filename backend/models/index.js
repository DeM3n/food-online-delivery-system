const sequelize = require('../config/db');


// Import all models
const User = require('./User');
const Restaurant = require('./Restaurant');
const Customer = require('./Customer');
const DeliveryPartner = require('./DeliveryPartner');
const Admin = require('./Admin');
const CustomerSupport = require('./CustomerSupport');
const AuthOtp = require('./AuthOtp');
const Content = require('./Content');

const Address = require('./Address');
const MenuCategory = require('./MenuCategory');
const MenuItem = require('./MenuItem');
const Order = require('./Order');
const OrderItem = require('./OrderItem');
const Cart = require('./Cart');
const CartItem = require('./CartItem');
const Payment = require('./Payment');
const Delivery = require('./Delivery');
const Dispute = require('./Dispute');
const Review = require('./Review');
const Notification = require('./Notification');
const AuthSession = require('./AuthSession');

// ==========================================
// Define Relationships Based on UML Diagram
// ==========================================

// 1. User -> Profiles (1:1 Relationships)
user_profiles = [Restaurant, Customer, DeliveryPartner, Admin, CustomerSupport];
user_profiles.forEach(Profile => {
  User.hasOne(Profile, { foreignKey: 'user_id' });
  Profile.belongsTo(User, { foreignKey: 'user_id' });
});

// 2. Customer Relations
Customer.hasMany(Address, { foreignKey: 'customer_id' });
Address.belongsTo(Customer, { foreignKey: 'customer_id' });

Customer.hasMany(Order, { foreignKey: 'customer_id' });
Order.belongsTo(Customer, { foreignKey: 'customer_id' });

Customer.hasMany(Cart, { foreignKey: 'customer_id' });
Cart.belongsTo(Customer, { foreignKey: 'customer_id' });

// 3. Restaurant Relations
Restaurant.hasMany(MenuCategory, { foreignKey: 'restaurant_id' });
MenuCategory.belongsTo(Restaurant, { foreignKey: 'restaurant_id' });

Restaurant.hasMany(MenuItem, { foreignKey: 'restaurant_id' });
MenuItem.belongsTo(Restaurant, { foreignKey: 'restaurant_id' });

Restaurant.hasMany(Order, { foreignKey: 'restaurant_id' });
Order.belongsTo(Restaurant, { foreignKey: 'restaurant_id' });

Restaurant.hasMany(Cart, { foreignKey: 'restaurant_id' });
Cart.belongsTo(Restaurant, { foreignKey: 'restaurant_id' });

// 4. Menu
MenuCategory.hasMany(MenuItem, { foreignKey: 'category_id' });
MenuItem.belongsTo(MenuCategory, { foreignKey: 'category_id' });

Cart.hasMany(CartItem, { foreignKey: 'cart_id' });
CartItem.belongsTo(Cart, { foreignKey: 'cart_id' });

MenuItem.hasMany(CartItem, { foreignKey: 'menu_item_id' });
CartItem.belongsTo(MenuItem, { foreignKey: 'menu_item_id' });

// 5. Order Specifics
Order.hasMany(OrderItem, { foreignKey: 'order_id' });
OrderItem.belongsTo(Order, { foreignKey: 'order_id' });

MenuItem.hasMany(OrderItem, { foreignKey: 'menu_item_id' });
OrderItem.belongsTo(MenuItem, { foreignKey: 'menu_item_id' });

Order.hasOne(Payment, { foreignKey: 'order_id' });
Payment.belongsTo(Order, { foreignKey: 'order_id' });

Order.hasOne(Delivery, { foreignKey: 'order_id' });
Delivery.belongsTo(Order, { foreignKey: 'order_id' });

Order.hasMany(Dispute, { foreignKey: 'order_id' });
Dispute.belongsTo(Order, { foreignKey: 'order_id' });

Order.hasMany(Review, { foreignKey: 'order_id' });
Review.belongsTo(Order, { foreignKey: 'order_id' });

// 6. Delivery Partner
DeliveryPartner.hasMany(Order, { foreignKey: 'delivery_partner_id' });
Order.belongsTo(DeliveryPartner, { foreignKey: 'delivery_partner_id' });

DeliveryPartner.hasMany(Delivery, { foreignKey: 'delivery_partner_id' });
Delivery.belongsTo(DeliveryPartner, { foreignKey: 'delivery_partner_id' });

DeliveryPartner.hasMany(Review, { foreignKey: 'delivery_partner_id' });
Review.belongsTo(DeliveryPartner, { foreignKey: 'delivery_partner_id' });

// 7. Other Links
Address.hasMany(Order, { foreignKey: 'delivery_address_id' });
Order.belongsTo(Address, { foreignKey: 'delivery_address_id' });

Customer.hasMany(Review, { foreignKey: 'customer_id' });
Review.belongsTo(Customer, { foreignKey: 'customer_id' });

Restaurant.hasMany(Review, { foreignKey: 'restaurant_id' });
Review.belongsTo(Restaurant, { foreignKey: 'restaurant_id' });

Customer.hasMany(Dispute, { foreignKey: 'customer_id' });
Dispute.belongsTo(Customer, { foreignKey: 'customer_id' });

CustomerSupport.hasMany(Dispute, { foreignKey: 'handled_by' });
Dispute.belongsTo(CustomerSupport, { foreignKey: 'handled_by' });

User.hasMany(Notification, { foreignKey: 'user_id' });
Notification.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(AuthSession, { foreignKey: 'user_id' });
AuthSession.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(AuthOtp, { foreignKey: 'user_id' });
AuthOtp.belongsTo(User, { foreignKey: 'user_id' });

module.exports = {
  sequelize,
  User,
  Restaurant,
  Customer,
  DeliveryPartner,
  Admin,
  CustomerSupport,
  Address,
  MenuCategory,
  MenuItem,
  Order,
  OrderItem,
  Cart,
  CartItem,
  Payment,
  Delivery,
  Dispute,
  Review,
  Notification,
  AuthSession,
  AuthOtp,
  Content,
};
