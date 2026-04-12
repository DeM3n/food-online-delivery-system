const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Delivery = sequelize.define('Delivery', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  order_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  delivery_partner_id: {
    type: DataTypes.UUID,
  },
  route_info: {
    type: DataTypes.TEXT,
  },
  pickup_time: {
    type: DataTypes.DATE,
  },
  delivery_time: {
    type: DataTypes.DATE,
  },
  actual_delivery_time: {
    type: DataTypes.DATE,
  },
  status: {
    type: DataTypes.ENUM('pending', 'assigned', 'picked_up', 'in_transit', 'delivered', 'failed'),
    defaultValue: 'pending',
  },
  distance_km: {
    type: DataTypes.DECIMAL(5, 2),
  }
}, {
  tableName: 'delivery',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = Delivery;
