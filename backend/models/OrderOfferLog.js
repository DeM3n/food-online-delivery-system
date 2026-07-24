const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const OrderOfferLog = sequelize.define('OrderOfferLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  order_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  driver_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  offer_round: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
  },
  status: {
    type: DataTypes.ENUM('OFFERED', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'SKIPPED', 'CANCELLED'),
    defaultValue: 'OFFERED',
  },
  offered_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  responded_at: {
    type: DataTypes.DATE,
  },
  rejection_reason: {
    type: DataTypes.STRING(255),
  }
}, {
  tableName: 'order_offer_log',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = OrderOfferLog;
