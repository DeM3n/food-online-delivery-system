class CatalogComponent {
  display() {
    throw new Error('display() must be implemented by subclasses');
  }

  add() {
    throw new Error(`${this.constructor.name} does not support add()`);
  }

  remove() {
    throw new Error(`${this.constructor.name} does not support remove()`);
  }
}

module.exports = CatalogComponent;
