const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Order = sequelize.define('Order', {
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
    allowNull: false,
  },
  delivery_partner_id: {
    type: DataTypes.UUID,
  },
  delivery_address_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('pending', 'accepted', 'preparing', 'picked_up', 'delivered', 'completed', 'cancelled'),
    defaultValue: 'pending',
  },
  subtotal: {
    type: DataTypes.DECIMAL(10, 2),
  },
  delivery_fee: {
    type: DataTypes.DECIMAL(10, 2),
  },
  total_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  payment_status: {
    type: DataTypes.ENUM('paid', 'pending', 'failed'),
    defaultValue: 'pending',
  },
  payment_method: {
    type: DataTypes.ENUM('cod', 'online'),
    defaultValue: 'cod',
  },
  notes: {
    type: DataTypes.TEXT,
  },
  estimated_delivery_time: {
    type: DataTypes.DATE,
  }
}, {
  tableName: 'order',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  paranoid: true,
  deletedAt: 'deleted_at',
});

module.exports = Order;
