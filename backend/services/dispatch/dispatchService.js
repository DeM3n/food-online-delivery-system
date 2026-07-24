const { Order, DeliveryPartner, Restaurant, Address, Customer, User, OrderOfferLog, sequelize } = require('../../models');
const { Op } = require('sequelize');

/**
 * Order Dispatch Service
 * Manages intelligent sequential order offering, candidate ranking, 
 * atomic dual-table concurrency control, and dispatch state machine.
 */
class DispatchService {
  constructor() {
    // In-memory job state tracker
    // TODO: For multi-instance scaling, replace in-memory Map with Redis & BullMQ/Agenda job queues.
    this.activeJobs = new Map();

    // Configurable parameters
    this.OFFER_TIMEOUT_MS = parseInt(process.env.DISPATCH_OFFER_TIMEOUT_MS || '15000', 10);
    this.INITIAL_RADIUS_KM = parseFloat(process.env.DISPATCH_INITIAL_RADIUS_KM || '3.0');
    this.RADIUS_EXPANSION_STEP_KM = parseFloat(process.env.DISPATCH_RADIUS_STEP_KM || '2.0');
    this.MAX_RADIUS_KM = parseFloat(process.env.DISPATCH_MAX_RADIUS_KM || '15.0');
    this.STALE_GPS_TIMEOUT_SEC = parseInt(process.env.DISPATCH_STALE_GPS_SEC || '60', 10);
    this.EXPANSION_DELAY_MS = parseInt(process.env.DISPATCH_EXPANSION_DELAY_MS || '5000', 10);
  }

  /**
   * Helper: Calculate Haversine distance in kilometers between two GPS points
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 9999;
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * 1. Query Candidate Drivers with Bounding-Box Pre-Filter and Stale GPS Filtering
   */
  async searchCandidateDrivers(restaurantLat, restaurantLng, radiusKm) {
    const rLat = parseFloat(restaurantLat);
    const rLng = parseFloat(restaurantLng);

    // Calculate Bounding-Box coordinates for SQL index optimization
    const latDelta = radiusKm / 111.0;
    const lngDelta = radiusKm / (111.0 * Math.cos(rLat * (Math.PI / 180)));

    const minLat = rLat - latDelta;
    const maxLat = rLat + latDelta;
    const minLng = rLng - lngDelta;
    const maxLng = rLng + lngDelta;

    const staleCutoff = new Date(Date.now() - this.STALE_GPS_TIMEOUT_SEC * 1000);

    // Fetch drivers meeting criteria: available, non-stale GPS, inside bounding box
    const drivers = await DeliveryPartner.findAll({
      where: {
        is_available: true,
        latitude: { [Op.between]: [minLat, maxLat] },
        longitude: { [Op.between]: [minLng, maxLng] },
        [Op.or]: [
          { last_location_update: { [Op.gte]: staleCutoff } },
          { last_location_update: null } // Fallback for newly initialized drivers
        ]
      },
      include: [{ model: User, attributes: ['full_name', 'phone_number'] }]
    });

    // Compute exact Haversine distance and filter strictly within radius
    const candidates = [];
    for (const driver of drivers) {
      const distance = this.calculateDistance(
        rLat,
        rLng,
        parseFloat(driver.latitude),
        parseFloat(driver.longitude)
      );
      if (distance <= radiusKm) {
        candidates.push({ driver, distance });
      }
    }

    return candidates;
  }

  /**
   * 2. Rank Candidate Drivers
   * Score = (100 - Distance*10) + (Rating * 15) + (AcceptanceRate * 0.3) + (IdleMinutes * 2)
   */
  rankCandidates(candidates) {
    const now = Date.now();

    const scored = candidates.map(({ driver, distance }) => {
      const rating = parseFloat(driver.rating || 5.0);
      const acceptanceRate = parseFloat(driver.acceptance_rate || 100.0);
      const idleMs = driver.last_idle_at ? now - new Date(driver.last_idle_at).getTime() : 0;
      const idleMinutes = Math.max(0, idleMs / 60000);

      // Higher score is better
      const distanceScore = Math.max(0, 100 - distance * 10);
      const ratingScore = rating * 15;
      const acceptanceScore = acceptanceRate * 0.3;
      const idleScore = Math.min(30, idleMinutes * 2);

      const totalScore = distanceScore + ratingScore + acceptanceScore + idleScore;

      return { driver, distance, score: totalScore };
    });

    // Sort descending by score
    scored.sort((a, b) => b.score - a.score);
    return scored;
  }

  /**
   * 3. Start Dispatch Workflow
   */
  async startDispatchFlow(orderId, io) {
    if (this.activeJobs.has(orderId)) {
      console.log(`[Dispatch] Job already active for order: ${orderId}`);
      return;
    }

    const order = await Order.findByPk(orderId, {
      include: [
        { model: Restaurant, attributes: ['name', 'location', 'latitude', 'longitude'] },
        { model: Address, attributes: ['street', 'city', 'latitude', 'longitude'] }
      ]
    });

    if (!order) {
      console.error(`[Dispatch] Order not found: ${orderId}`);
      return;
    }

    if (order.delivery_partner_id || order.status === 'assigned' || order.status === 'cancelled') {
      console.log(`[Dispatch] Order ${orderId} is not available for dispatching.`);
      return;
    }

    const restaurantLat = order.Restaurant?.latitude || 10.7769; // Default fallback coord
    const restaurantLng = order.Restaurant?.longitude || 106.7009;

    const jobState = {
      orderId,
      restaurantLat,
      restaurantLng,
      currentRadiusKm: this.INITIAL_RADIUS_KM,
      candidates: [],
      currentIndex: 0,
      timer: null,
      offerRound: 1,
      attemptedDriverIds: new Set()
    };

    this.activeJobs.set(orderId, jobState);
    await this.processDispatchStep(orderId, io);
  }

  /**
   * Step Processor: Searches candidates or expands radius sequentially
   */
  async processDispatchStep(orderId, io) {
    const job = this.activeJobs.get(orderId);
    if (!job) return;

    // Search candidates at current radius excluding already attempted drivers
    const candidateEntries = await this.searchCandidateDrivers(
      job.restaurantLat,
      job.restaurantLng,
      job.currentRadiusKm
    );

    const freshCandidates = candidateEntries.filter(
      (c) => !job.attemptedDriverIds.has(c.driver.id)
    );

    if (freshCandidates.length > 0) {
      const ranked = this.rankCandidates(freshCandidates);
      job.candidates = ranked;
      job.currentIndex = 0;
      await this.sendSequentialOffer(orderId, io);
      return;
    }

    // No fresh candidates found at current radius -> Expand radius or trigger failure
    if (job.currentRadiusKm < this.MAX_RADIUS_KM) {
      const nextRadius = Math.min(
        this.MAX_RADIUS_KM,
        job.currentRadiusKm + this.RADIUS_EXPANSION_STEP_KM
      );
      console.log(
        `[Dispatch] No available drivers at ${job.currentRadiusKm}km for Order ${orderId}. Expanding search radius to ${nextRadius}km...`
      );
      job.currentRadiusKm = nextRadius;

      // Schedule expansion retry after delay
      job.timer = setTimeout(() => {
        this.processDispatchStep(orderId, io);
      }, this.EXPANSION_DELAY_MS);
    } else {
      // Max radius reached with 0 candidate drivers -> Notify failure
      console.warn(`[Dispatch] Exhausted all candidate drivers up to ${this.MAX_RADIUS_KM}km for Order ${orderId}`);
      await this.handleDispatchExhausted(orderId, io);
    }
  }

  /**
   * 4. Send Targeted Offer to Top-Ranked Candidate Driver
   */
  async sendSequentialOffer(orderId, io) {
    const job = this.activeJobs.get(orderId);
    if (!job) return;

    if (job.currentIndex >= job.candidates.length) {
      // Current batch exhausted -> Continue expansion check
      await this.processDispatchStep(orderId, io);
      return;
    }

    const currentCandidate = job.candidates[job.currentIndex];
    const driver = currentCandidate.driver;

    // Verify driver is still available and not assigned concurrently
    if (!driver.is_available) {
      job.attemptedDriverIds.add(driver.id);
      job.currentIndex += 1;
      return this.sendSequentialOffer(orderId, io);
    }

    job.attemptedDriverIds.add(driver.id);

    // Fetch complete order details for payload
    const order = await Order.findByPk(orderId, {
      include: [
        { model: Restaurant, attributes: ['name', 'location', 'latitude', 'longitude'] },
        { model: Address, attributes: ['street', 'city', 'latitude', 'longitude'] }
      ]
    });

    if (!order || order.delivery_partner_id || order.status === 'cancelled') {
      console.log(`[Dispatch] Order ${orderId} was cancelled or taken during dispatching.`);
      this.clearJob(orderId);
      return;
    }

    // Persist Offer Log
    const offerLog = await OrderOfferLog.create({
      order_id: orderId,
      driver_id: driver.id,
      offer_round: job.offerRound,
      status: 'OFFERED',
      offered_at: new Date()
    });

    console.log(`[Dispatch] Offering Order ${orderId} to Driver ${driver.id} (User: ${driver.user_id}) - Distance: ${currentCandidate.distance.toFixed(2)}km`);

    // Target Socket.io Room: driver_${driver.id} AND user room
    const offerPayload = {
      orderId: order.id,
      restaurant: order.Restaurant,
      deliveryAddress: order.Address,
      totalAmount: order.total_amount,
      deliveryFee: order.delivery_fee,
      distanceKm: currentCandidate.distance.toFixed(2),
      expiresInSec: Math.floor(this.OFFER_TIMEOUT_MS / 1000),
      offerLogId: offerLog.id
    };

    if (io) {
      io.to(`driver_${driver.id}`).to(driver.user_id).emit('ORDER_OFFER', offerPayload);
    }

    // Set In-Memory Timeout for Driver Response
    job.timer = setTimeout(async () => {
      console.log(`[Dispatch] Offer timeout expired for Driver ${driver.id} on Order ${orderId}`);
      
      // Update offer log to EXPIRED
      await OrderOfferLog.update(
        { status: 'EXPIRED', responded_at: new Date() },
        { where: { id: offerLog.id, status: 'OFFERED' } }
      );

      // Advance to next candidate
      job.currentIndex += 1;
      job.offerRound += 1;
      await this.sendSequentialOffer(orderId, io);
    }, this.OFFER_TIMEOUT_MS);
  }

  /**
   * 5. Dual-Table Atomic Accept Handler (Concurrency & Double-Assignment Protection)
   */
  async handleDriverAccept(orderId, driverUserId, io) {
    // Locate driver profile by user_id
    const driver = await DeliveryPartner.findOne({ where: { user_id: driverUserId } });
    if (!driver) {
      throw new Error('Driver profile not found.');
    }

    const transaction = await sequelize.transaction();
    try {
      // 1. Lock and check Order record inside transaction
      const order = await Order.findOne({
        where: {
          id: orderId,
          delivery_partner_id: null,
          status: { [Op.in]: ['preparing', 'accepted', 'pending'] }
        },
        lock: transaction.LOCK.UPDATE,
        transaction
      });

      if (!order) {
        await transaction.rollback();
        throw new Error('Order is no longer available or has already been assigned.');
      }

      // 2. Lock and check DeliveryPartner availability inside transaction
      const lockedDriver = await DeliveryPartner.findOne({
        where: {
          id: driver.id,
          is_available: true
        },
        lock: transaction.LOCK.UPDATE,
        transaction
      });

      if (!lockedDriver) {
        await transaction.rollback();
        throw new Error('You are currently marked as busy or already handling another order.');
      }

      // 3. Atomically update Order status to 'assigned' and assign driver
      order.delivery_partner_id = driver.id;
      order.status = 'assigned';
      await order.save({ transaction });

      // 4. Atomically mark Driver as unavailable (busy)
      lockedDriver.is_available = false;
      await lockedDriver.save({ transaction });

      // 5. Update active OrderOfferLog entry to ACCEPTED
      await OrderOfferLog.update(
        { status: 'ACCEPTED', responded_at: new Date() },
        {
          where: { order_id: orderId, driver_id: driver.id, status: 'OFFERED' },
          transaction
        }
      );

      await transaction.commit();

      // Clear active dispatch timer/job
      this.clearJob(orderId);

      // Socket.io Notifications
      if (io) {
        const fullOrder = await Order.findByPk(orderId, {
          include: [
            { model: Restaurant, attributes: ['name', 'user_id', 'location'] },
            { model: Customer, include: [{ model: User, attributes: ['full_name', 'phone_number'] }] },
            { model: DeliveryPartner, include: [{ model: User, attributes: ['full_name', 'phone_number'] }] }
          ]
        });

        const statusPayload = {
          orderId: order.id,
          status: 'assigned',
          deliveryPartner: fullOrder.DeliveryPartner
        };

        // Notify Driver confirmation
        io.to(`driver_${driver.id}`).to(driver.user_id).emit('ORDER_OFFER_CONFIRMED', {
          orderId: order.id,
          status: 'assigned'
        });

        // Notify Customer & Restaurant
        if (fullOrder.Customer) {
          io.to(fullOrder.Customer.user_id).emit('ORDER_STATUS_UPDATED', statusPayload);
        }
        if (fullOrder.Restaurant) {
          io.to(fullOrder.Restaurant.user_id).emit('ORDER_STATUS_UPDATED', statusPayload);
        }
      }

      return order;
    } catch (error) {
      if (transaction && !transaction.finished) {
        await transaction.rollback();
      }
      throw error;
    }
  }

  /**
   * 6. Driver Reject Handler
   */
  async handleDriverReject(orderId, driverUserId, reason, io) {
    const driver = await DeliveryPartner.findOne({ where: { user_id: driverUserId } });
    if (!driver) return;

    const job = this.activeJobs.get(orderId);
    if (job) {
      // Clear active timer
      if (job.timer) clearTimeout(job.timer);

      // Update offer log to REJECTED
      await OrderOfferLog.update(
        { status: 'REJECTED', responded_at: new Date(), rejection_reason: reason || 'Driver declined' },
        { where: { order_id: orderId, driver_id: driver.id, status: 'OFFERED' } }
      );

      // Advance to next candidate candidate immediately
      job.currentIndex += 1;
      job.offerRound += 1;
      await this.sendSequentialOffer(orderId, io);
    }
  }

  /**
   * 7. Cancel Dispatch Flow (Order cancelled or recalled)
   */
  async cancelDispatchFlow(orderId, reason, io) {
    const job = this.activeJobs.get(orderId);
    if (!job) return;

    if (job.timer) clearTimeout(job.timer);

    // Notify currently offered driver if any
    if (job.candidates && job.candidates[job.currentIndex]) {
      const currentDriver = job.candidates[job.currentIndex].driver;
      if (io) {
        io.to(`driver_${currentDriver.id}`).to(currentDriver.user_id).emit('ORDER_OFFER_CANCELLED', {
          orderId,
          reason: reason || 'Order cancelled'
        });
      }
    }

    await OrderOfferLog.update(
      { status: 'CANCELLED', responded_at: new Date() },
      { where: { order_id: orderId, status: 'OFFERED' } }
    );

    this.clearJob(orderId);
    console.log(`[Dispatch] Cancelled dispatch flow for Order ${orderId}`);
  }

  /**
   * Handle Max Radius Exhaustion with 0 candidate drivers
   */
  async handleDispatchExhausted(orderId, io) {
    this.clearJob(orderId);

    const order = await Order.findByPk(orderId, {
      include: [{ model: Restaurant }, { model: Customer }]
    });

    if (order && io) {
      const payload = {
        orderId,
        message: 'No available delivery drivers found in service area. Will retry shortly.'
      };

      if (order.Restaurant) io.to(order.Restaurant.user_id).emit('DISPATCH_FAILED', payload);
      if (order.Customer) io.to(order.Customer.user_id).emit('DISPATCH_FAILED', payload);
    }
  }

  /**
   * Clear In-Memory Job Helper
   */
  clearJob(orderId) {
    const job = this.activeJobs.get(orderId);
    if (job && job.timer) {
      clearTimeout(job.timer);
    }
    this.activeJobs.delete(orderId);
  }

  /**
   * 8. Startup Recovery Job: Scans orphaned orders stuck in dispatching states without active timers
   */
  async recoverOrphanedDispatches(io) {
    try {
      console.log('[Dispatch Recovery] Checking for orphaned orders needing dispatching...');
      const unassignedOrders = await Order.findAll({
        where: {
          delivery_partner_id: null,
          status: { [Op.in]: ['preparing', 'accepted'] }
        }
      });

      let count = 0;
      for (const order of unassignedOrders) {
        if (!this.activeJobs.has(order.id)) {
          count++;
          console.log(`[Dispatch Recovery] Resuming dispatch flow for orphaned Order ${order.id}`);
          this.startDispatchFlow(order.id, io);
        }
      }

      console.log(`[Dispatch Recovery] Completed. Resumed ${count} order dispatch flows.`);
    } catch (err) {
      console.error('[Dispatch Recovery] Error recovering orphaned dispatches:', err);
    }
  }
}

module.exports = new DispatchService();
