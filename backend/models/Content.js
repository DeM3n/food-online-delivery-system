const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Content = sequelize.define('Content', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  slug: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
  },
  summary: {
    type: DataTypes.STRING(1000),
    allowNull: true,
  },
  body: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  image_url: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  content_type: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'article',
  },
  status: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'draft',
  },
  published_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  deleted_at: {
    type: DataTypes.DATE,
    allowNull: true,
  }
}, {
  tableName: 'content',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  deletedAt: 'deleted_at',
  paranoid: true
});

module.exports = Content;
