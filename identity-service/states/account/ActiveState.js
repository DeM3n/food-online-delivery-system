const AccountState = require('./AccountState');

class ActiveState extends AccountState {
  constructor() {
    super('ACTIVE');
  }

  handle() {
    return true;
  }

  activate(account) {
    account.user.is_active = true;
    return account;
  }

  suspend(account) {
    const SuspendedState = require('./SuspendedState');
    account.user.is_active = false;
    account.setState(new SuspendedState());
    return account;
  }
}

module.exports = ActiveState;
