const ActiveState = require('./ActiveState');
const PendingState = require('./PendingState');
const SuspendedState = require('./SuspendedState');

class UserAccount {
  constructor(user) {
    this.user = user;
    this.state = this.resolveStateFromUser(user);
  }

  resolveStateFromUser(user) {
    const isPendingRole = ['restaurant', 'delivery_partner'].includes(user.role);

    if (user.is_active) {
      return new ActiveState();
    }

    if (isPendingRole && !user.deleted_at) {
      return new PendingState();
    }

    return new SuspendedState();
  }

  setState(state) {
    this.state = state;
  }

  getStateName() {
    return this.state.getName();
  }

  login() {
    return this.state.handle(this);
  }

  changeState(action) {
    switch (action) {
      case 'activate':
        return this.state.activate(this);
      case 'suspend':
        return this.state.suspend(this);
      default:
        throw new Error(`Unsupported account transition: ${action}`);
    }
  }

  async persist() {
    await this.user.save();
    return this.user;
  }
}

module.exports = UserAccount;
