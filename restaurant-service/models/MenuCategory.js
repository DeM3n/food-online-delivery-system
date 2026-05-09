const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const MenuCategory = sequelize.define('MenuCategory', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    restaurant_id: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false,
    }
}, {
    tableName: 'menu_category',
    createdAt: 'created_at',
    updatedAt: false,
});

module.exports = MenuCategory;
