const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const GuestCartSession = sequelize.define('GuestCartSession', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  cart_token_hash: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: false,
  }
}, {
  tableName: 'guest_cart_session',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = GuestCartSession;
