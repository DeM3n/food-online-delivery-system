const sequelize = require('../config/db');

// Import models
const Order = require('./Order');
const OrderItem = require('./OrderItem');
const Cart = require('./Cart');
const CartItem = require('./CartItem');

// Shared models (read-only in this service, but needed for joins)
const User = require('./User');
const Customer = require('./Customer');
const Restaurant = require('./Restaurant');
const DeliveryPartner = require('./DeliveryPartner');
const MenuItem = require('./MenuItem');
const MenuCategory = require('./MenuCategory');
const Address = require('./Address');
const Notification = require('./Notification');

// ==========================================
// Define Relationships
// ==========================================

// 1. User & Profiles
User.hasOne(Customer, { foreignKey: 'user_id' });
Customer.belongsTo(User, { foreignKey: 'user_id' });

User.hasOne(Restaurant, { foreignKey: 'user_id' });
Restaurant.belongsTo(User, { foreignKey: 'user_id' });

User.hasOne(DeliveryPartner, { foreignKey: 'user_id' });
DeliveryPartner.belongsTo(User, { foreignKey: 'user_id' });

// 2. Menu
Restaurant.hasMany(MenuCategory, { foreignKey: 'restaurant_id' });
MenuCategory.belongsTo(Restaurant, { foreignKey: 'restaurant_id' });

MenuCategory.hasMany(MenuItem, { foreignKey: 'category_id', as: 'items' });
MenuItem.belongsTo(MenuCategory, { foreignKey: 'category_id', as: 'category' });

Restaurant.hasMany(MenuItem, { foreignKey: 'restaurant_id' });
MenuItem.belongsTo(Restaurant, { foreignKey: 'restaurant_id' });

// 3. Cart
Customer.hasOne(Cart, { foreignKey: 'customer_id' });
Cart.belongsTo(Customer, { foreignKey: 'customer_id' });

Cart.hasMany(CartItem, { foreignKey: 'cart_id' });
CartItem.belongsTo(Cart, { foreignKey: 'cart_id' });

MenuItem.hasMany(CartItem, { foreignKey: 'menu_item_id' });
CartItem.belongsTo(MenuItem, { foreignKey: 'menu_item_id' });

// 4. Order
Customer.hasMany(Order, { foreignKey: 'customer_id' });
Order.belongsTo(Customer, { foreignKey: 'customer_id' });

Restaurant.hasMany(Order, { foreignKey: 'restaurant_id' });
Order.belongsTo(Restaurant, { foreignKey: 'restaurant_id' });

DeliveryPartner.hasMany(Order, { foreignKey: 'delivery_partner_id' });
Order.belongsTo(DeliveryPartner, { foreignKey: 'delivery_partner_id' });

Address.hasMany(Order, { foreignKey: 'delivery_address_id' });
Order.belongsTo(Address, { foreignKey: 'delivery_address_id' });

Order.hasMany(OrderItem, { foreignKey: 'order_id' });
OrderItem.belongsTo(Order, { foreignKey: 'order_id' });

MenuItem.hasMany(OrderItem, { foreignKey: 'menu_item_id' });
OrderItem.belongsTo(MenuItem, { foreignKey: 'menu_item_id' });

module.exports = {
  sequelize,
  Order,
  OrderItem,
  Cart,
  CartItem,
  User,
  Customer,
  Restaurant,
  DeliveryPartner,
  MenuItem,
  MenuCategory,
  Address,
  Notification
};
