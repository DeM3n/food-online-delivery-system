const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const AuthSession = sequelize.define('AuthSession', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  refresh_token_hash: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
  },
  user_agent: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  ip_address: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  last_used_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  revoked_at: {
    type: DataTypes.DATE,
    allowNull: true,
  }
}, {
  tableName: 'auth_session',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = AuthSession;