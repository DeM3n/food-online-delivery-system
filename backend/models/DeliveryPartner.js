const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const DeliveryPartner = sequelize.define('DeliveryPartner', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.UUID,
    unique: true,
    allowNull: false,
  },
  vehicle_license: {
    type: DataTypes.STRING(100),
  },
  is_available: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  rating: {
    type: DataTypes.DECIMAL(3, 2),
  },
  latitude: {
    type: DataTypes.DECIMAL(10, 7),
  },
  longitude: {
    type: DataTypes.DECIMAL(10, 7),
  },
  last_location_update: {
    type: DataTypes.DATE,
  },
  acceptance_rate: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 100.00,
  },
  last_idle_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  }
}, {
  tableName: 'delivery_partner',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  paranoid: true,
  deletedAt: 'deleted_at',
});

module.exports = DeliveryPartner;
