const sequelize = require('../config/db');
const Restaurant = require('./Restaurant');
const MenuCategory = require('./MenuCategory');
const MenuItem = require('./MenuItem');

// Restaurant relationships
Restaurant.hasMany(MenuCategory, { foreignKey: 'restaurant_id', as: 'categories' });
MenuCategory.belongsTo(Restaurant, { foreignKey: 'restaurant_id' });

Restaurant.hasMany(MenuItem, { foreignKey: 'restaurant_id', as: 'menu_items' });
MenuItem.belongsTo(Restaurant, { foreignKey: 'restaurant_id' });

// Menu Category relationships
MenuCategory.hasMany(MenuItem, { foreignKey: 'category_id', as: 'items' });
MenuItem.belongsTo(MenuCategory, { foreignKey: 'category_id', as: 'category' });

module.exports = {
  sequelize,
  Restaurant,
  MenuCategory,
  MenuItem
};
