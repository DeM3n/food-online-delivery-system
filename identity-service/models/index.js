const sequelize = require('../config/db');

// Import all models
const User = require('./User');
const Customer = require('./Customer');
const Restaurant = require('./Restaurant');
const DeliveryPartner = require('./DeliveryPartner');
const Order = require('./Order');
const Admin = require('./Admin');
const CustomerSupport = require('./CustomerSupport');
const Address = require('./Address');

// ==========================================
// Define Relationships Based on UML Diagram
// ==========================================

// 1. User -> Profiles (1:1 Relationships)
const user_profiles = [Customer, DeliveryPartner, Admin, CustomerSupport, Restaurant];
user_profiles.forEach(Profile => {
  User.hasOne(Profile, { foreignKey: 'user_id' });
  Profile.belongsTo(User, { foreignKey: 'user_id' });
});

// 2. Customer Relations
Customer.hasMany(Address, { foreignKey: 'customer_id' });
Address.belongsTo(Customer, { foreignKey: 'customer_id' });

module.exports = {
  sequelize,
  User,
  Customer,
  Restaurant,
  DeliveryPartner,
  Order,
  Admin,
  CustomerSupport,
  Address
};
