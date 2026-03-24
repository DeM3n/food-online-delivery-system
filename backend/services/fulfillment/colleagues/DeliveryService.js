const { Delivery } = require('../../../models');

class DeliveryService {
  async createDeliveryAssignment({ order, transaction, io }) {
    if (!order?.id) {
      return null;
    }

    let assignment = null;

    if (Delivery && typeof Delivery.findOrCreate === 'function') {
      const [delivery] = await Delivery.findOrCreate({
        where: { order_id: order.id },
        defaults: {
          order_id: order.id,
          status: 'pending',
        },
        transaction,
      });
      assignment = delivery;
    }

    if (order.status === 'preparing') {
      io?.to('available_deliveries').emit('AVAILABLE_DELIVERY', {
        orderId: order.id,
      });
    }

    return {
      orderId: order.id,
      assignmentId: assignment?.id || null,
      status: assignment?.status || 'pending',
    };
  }
}

module.exports = new DeliveryService();
