const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const GuestCartItem = sequelize.define('GuestCartItem', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  guest_cart_session_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  menu_item_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
  }
}, {
  tableName: 'guest_cart_item',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = GuestCartItem;
