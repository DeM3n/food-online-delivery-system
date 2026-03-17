const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Payment = sequelize.define('Payment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },

  order_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },

  customer_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },

  restaurant_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },

  delivery_address_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },

  notes: {
    type: DataTypes.TEXT,
  },

  items_json: {
    type: DataTypes.TEXT,
    allowNull: false,
  },

  gateway_create_date: {
    type: DataTypes.STRING(14),
    allowNull: true,
  },

  delivery_fee: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
  },

  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },

  currency: {
    type: DataTypes.STRING(10),
  },

  transaction_id: {
    type: DataTypes.STRING(100),
    unique: true,
  },

  gateway_transaction_id: {
    type: DataTypes.STRING(255),
  },

  payment_gateway: {
    type: DataTypes.STRING(50),
  },

  payment_method: {
    type: DataTypes.STRING(50),
  },

  status: {
    type: DataTypes.ENUM('pending', 'paid', 'failed', 'cancelled', 'refunded'),
    defaultValue: 'pending',
  },

  paid_at: {
    type: DataTypes.DATE,
  },

  refund_status: {
    type: DataTypes.ENUM('none', 'pending', 'failed', 'refunded'),
    allowNull: false,
    defaultValue: 'none',
  },

  refund_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },

  refund_transaction_id: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },

  refund_response_code: {
    type: DataTypes.STRING(10),
    allowNull: true,
  },

  refund_message: {
    type: DataTypes.TEXT,
    allowNull: true,
  },

  refund_requested_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },

  refunded_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'payment',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = Payment;