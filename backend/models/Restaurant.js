const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Restaurant = sequelize.define('Restaurant', {
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
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  location: {
    type: DataTypes.STRING(500),
  },
  cuisine_type: {
    type: DataTypes.STRING(100),
  },
  opening_hours: {
    type: DataTypes.JSON,
  },
  is_open: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  rating: {
    type: DataTypes.DECIMAL(3, 2),
  },
  delivery_radius: {
    type: DataTypes.DECIMAL(5, 2),
  },
  latitude: {
    type: DataTypes.DECIMAL(10, 7),
  },
  longitude: {
    type: DataTypes.DECIMAL(10, 7),
  }
}, {
  tableName: 'restaurant',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  paranoid: true,
  deletedAt: 'deleted_at',
});

module.exports = Restaurant;
