const CatalogComponent = require('./CatalogComponent');

class MenuItemLeaf extends CatalogComponent {
  constructor(item) {
    super();
    this.id = item.id;
    this.itemName = item.name;
    this.price = item.price;
    this.description = item.description || null;
    this.image_url = item.image_url || null;
    this.is_available = item.is_available;
    this.restaurant = item.Restaurant
      ? {
          id: item.Restaurant.id,
          name: item.Restaurant.name,
          location: item.Restaurant.location,
          cuisine_type: item.Restaurant.cuisine_type,
          is_open: item.Restaurant.is_open,
        }
      : null;
    this.category = item.MenuCategory
      ? {
          id: item.MenuCategory.id,
          name: item.MenuCategory.name,
        }
      : null;
  }

  display() {
    return {
      nodeType: 'menu_item',
      id: this.id,
      itemName: this.itemName,
      price: this.price,
      description: this.description,
      image_url: this.image_url,
      is_available: this.is_available,
      restaurant: this.restaurant,
      category: this.category,
    };
  }
}

module.exports = MenuItemLeaf;
