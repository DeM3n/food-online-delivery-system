const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Cart = sequelize.define('Cart', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  customer_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  restaurant_id: {
    type: DataTypes.UUID,
  }
}, {
  tableName: 'cart',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = Cart;
