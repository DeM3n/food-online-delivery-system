const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Notification = sequelize.define('Notification', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  type: {
    type: DataTypes.ENUM('order', 'delivery', 'payment', 'dispute', 'promotion'),
    allowNull: false,
  },
  title: {
    type: DataTypes.STRING(255),
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  is_read: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  read_at: {
    type: DataTypes.DATE,
  }
}, {
  tableName: 'notification',
  createdAt: 'sent_at',
  updatedAt: false,
});

module.exports = Notification;
