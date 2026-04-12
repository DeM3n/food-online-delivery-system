const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Dispute = sequelize.define('Dispute', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  order_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  customer_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  handled_by: {
    type: DataTypes.UUID,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('open', 'in_progress', 'resolved', 'rejected'),
    defaultValue: 'open',
  },
  refund_amount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00,
  },
  resolution_note: {
    type: DataTypes.TEXT,
  }
}, {
  tableName: 'dispute',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = Dispute;
