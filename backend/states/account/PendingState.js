const AccountState = require('./AccountState');

class PendingState extends AccountState {
  constructor() {
    super('PENDING');
  }

  handle() {
    throw new Error('Account is pending admin approval. Please wait for confirmation.');
  }

  activate(account) {
    const ActiveState = require('./ActiveState');
    account.user.is_active = true;
    account.setState(new ActiveState());
    return account;
  }

  suspend(account) {
    const SuspendedState = require('./SuspendedState');
    account.user.is_active = false;
    account.setState(new SuspendedState());
    return account;
  }
}

module.exports = PendingState;
