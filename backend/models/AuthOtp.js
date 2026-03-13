const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const AuthOtp = sequelize.define('AuthOtp', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  purpose: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'login',
  },
  channel: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'email',
  },
  destination: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  otp_hash: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  used_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  invalid_attempt_count: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  max_attempts: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 5,
  },
  resend_count: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  last_sent_at: {
    type: DataTypes.DATE,
    allowNull: false,
  }
}, {
  tableName: 'auth_otp',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = AuthOtp;