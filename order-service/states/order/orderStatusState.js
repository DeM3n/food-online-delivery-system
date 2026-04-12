class OrderState {
  constructor(name) {
    this.name = name;
  }

  allowedTransitions() {
    return [];
  }

  canTransitionTo(nextStatus) {
    return this.allowedTransitions().includes(nextStatus);
  }

  assertTransition(nextStatus) {
    if (nextStatus === this.name) {
      throw new Error(`Order is already in ${nextStatus} status`);
    }

    if (!this.canTransitionTo(nextStatus)) {
      throw new Error(`Invalid order status transition: ${this.name} -> ${nextStatus}`);
    }
  }
}

class PendingState extends OrderState {
  constructor() {
    super('pending');
  }

  allowedTransitions() {
    return ['accepted', 'cancelled'];
  }
}

class AcceptedState extends OrderState {
  constructor() {
    super('accepted');
  }

  allowedTransitions() {
    return ['preparing', 'cancelled'];
  }
}

class PreparingState extends OrderState {
  constructor() {
    super('preparing');
  }

  allowedTransitions() {
    return ['picked_up'];
  }
}

class PickedUpState extends OrderState {
  constructor() {
    super('picked_up');
  }

  allowedTransitions() {
    return ['delivered'];
  }
}

class DeliveredState extends OrderState {
  constructor() {
    super('delivered');
  }

  allowedTransitions() {
    return ['completed'];
  }
}

class CompletedState extends OrderState {
  constructor() {
    super('completed');
  }
}

class CancelledState extends OrderState {
  constructor() {
    super('cancelled');
  }
}

class RefundedState extends OrderState {
  constructor() {
    super('refunded');
  }
}

const STATE_FACTORIES = {
  pending: () => new PendingState(),
  accepted: () => new AcceptedState(),
  preparing: () => new PreparingState(),
  picked_up: () => new PickedUpState(),
  delivered: () => new DeliveredState(),
  completed: () => new CompletedState(),
  cancelled: () => new CancelledState(),
  refunded: () => new RefundedState(),
};

function createOrderState(status) {
  const factory = STATE_FACTORIES[String(status || '').toLowerCase()];

  if (!factory) {
    throw new Error(`Unsupported order status: ${status}`);
  }

  return factory();
}

class OrderStatusContext {
  constructor(currentStatus) {
    this.state = createOrderState(currentStatus);
  }

  transitionTo(nextStatus) {
    const normalized = String(nextStatus || '').toLowerCase();
    this.state.assertTransition(normalized);
    this.state = createOrderState(normalized);
    return this.state.name;
  }

  getCurrentStatus() {
    return this.state.name;
  }
}

const ROLE_ALLOWED_TARGETS = {
  customer: ['completed'],
  restaurant: ['accepted', 'preparing', 'cancelled'],
  delivery_partner: ['delivered'],
};

function assertRoleCanUpdateStatus({ role, targetStatus }) {
  const normalizedRole = String(role || '').toLowerCase();
  const normalizedTarget = String(targetStatus || '').toLowerCase();

  const allowedTargets = ROLE_ALLOWED_TARGETS[normalizedRole];
  if (!allowedTargets) {
    throw new Error('Not authorized to update this order');
  }

  if (!allowedTargets.includes(normalizedTarget)) {
    if (normalizedRole === 'customer') {
      throw new Error('Customers can only confirm completed orders');
    }

    if (normalizedRole === 'delivery_partner') {
      throw new Error('Drivers can only mark orders as delivered');
    }

    if (normalizedRole === 'restaurant') {
      throw new Error('Restaurants can only move orders to accepted, preparing, or cancelled');
    }

    throw new Error('Not authorized to update this order');
  }
}

module.exports = {
  createOrderState,
  OrderStatusContext,
  assertRoleCanUpdateStatus,
};
