const CatalogComponent = require('./CatalogComponent');

class MenuCategoryComposite extends CatalogComponent {
  constructor({ id, name }) {
    super();
    this.id = id;
    this.name = name;
    this.children = [];
  }

  add(component) {
    this.children.push(component);
    return this;
  }

  remove(componentId) {
    this.children = this.children.filter((child) => child.id !== componentId);
    return this;
  }

  display() {
    return {
      nodeType: 'menu_category',
      id: this.id,
      name: this.name,
      children: this.children.map((child) => child.display()),
    };
  }
}

module.exports = MenuCategoryComposite;
