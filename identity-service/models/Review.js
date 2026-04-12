const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Review = sequelize.define('Review', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    order_id: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
    },
    customer_id: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    restaurant_id: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    delivery_partner_id: {
        type: DataTypes.UUID,
    },
    food_rating: {
        type: DataTypes.INTEGER,
    },
    delivery_rating: {
        type: DataTypes.INTEGER,
    },
    comment: {
        type: DataTypes.TEXT,
    }
}, {
    tableName: 'review',
    createdAt: 'created_at',
    updatedAt: false,
    paranoid: true,
    deletedAt: 'deleted_at',
});

module.exports = Review;
