class AccountState {
  constructor(name) {
    this.name = name;
  }

  getName() {
    return this.name;
  }

  handle(account) {
    throw new Error(`handle() is not implemented for ${this.name}`);
  }

  activate(account) {
    throw new Error(`activate() is not supported for ${this.name}`);
  }

  suspend(account) {
    throw new Error(`suspend() is not supported for ${this.name}`);
  }
}

module.exports = AccountState;
