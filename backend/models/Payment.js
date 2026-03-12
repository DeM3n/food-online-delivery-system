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
    allowNull: false,
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
    type: DataTypes.ENUM('success', 'failed', 'pending', 'refunded'),
    defaultValue: 'pending',
  },
  paid_at: {
    type: DataTypes.DATE,
  }
}, {
  tableName: 'payment',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = Payment;
