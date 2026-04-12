const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const CartItem = sequelize.define('CartItem', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  cart_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  menu_item_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  quantity: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
  }
}, {
  tableName: 'cart_item',
  timestamps: false,
});

module.exports = CartItem;
