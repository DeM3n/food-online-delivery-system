const { User, Customer, Restaurant, DeliveryPartner, Admin, CustomerSupport, Address } = require('../models');
const { Op } = require('sequelize');
const jwt = require('jsonwebtoken');
const UserAccount = require('../states/account/UserAccount');

class AuthService {
  generateToken(id) {
    return jwt.sign({ id }, process.env.JWT_SECRET || 'secret', {
      expiresIn: '30d',
    });
  }

  async resolveProfile(user) {
    if (user.Customer) return user.Customer;
    if (user.Restaurant) return user.Restaurant;
    if (user.DeliveryPartner) return user.DeliveryPartner;
    if (user.Admin) return user.Admin;
    if (user.CustomerSupport) return user.CustomerSupport;
    return null;
  }

  toUserAccount(user) {
    return new UserAccount(user);
  }

  async getManagedUser(userId, options = {}) {
    const user = await User.findByPk(userId, options);
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }

  async register(userData) {
    const { email, password, role, full_name, phone_number, name, department, contact_number, vehicle_license } = userData;

    const userExists = await User.findOne({ where: { email } });
    if (userExists) {
      throw new Error('User already exists');
    }

    const requiresApproval = role === 'restaurant' || role === 'delivery_partner';

    const user = await User.create({
      email,
      password_hash: password,
      role,
      full_name,
      phone_number,
      is_active: !requiresApproval
    });

    let profile = null;
    switch (role) {
      case 'customer':
        profile = await Customer.create({ user_id: user.id });
        break;
      case 'restaurant':
        profile = await Restaurant.create({ user_id: user.id, name: name || full_name || 'New Restaurant' });
        break;
      case 'delivery_partner':
        profile = await DeliveryPartner.create({ user_id: user.id, vehicle_license });
        break;
      case 'admin':
        profile = await Admin.create({ user_id: user.id, department });
        break;
      case 'customer_support':
        profile = await CustomerSupport.create({ user_id: user.id, contact_number: phone_number || contact_number });
        break;
    }

    const account = this.toUserAccount(user);

    return {
      user,
      profile,
      token: this.generateToken(user.id),
      accountState: account.getStateName()
    };
  }

  async login(email, password) {
    const user = await User.findOne({
      where: { email },
      include: [
        { model: Customer, include: [Address] },
        { model: Restaurant },
        { model: DeliveryPartner },
        { model: Admin },
        { model: CustomerSupport }
      ]
    });

    if (!user || !(await user.matchPassword(password))) {
      throw new Error('Invalid email or password');
    }

    const account = this.toUserAccount(user);
    account.login();

    return {
      user,
      profile: await this.resolveProfile(user),
      token: this.generateToken(user.id),
      accountState: account.getStateName()
    };
  }

  async activateAccount(userId) {
    const user = await this.getManagedUser(userId);
    const account = this.toUserAccount(user);
    account.changeState('activate');
    await account.persist();

    return {
      id: user.id,
      is_active: user.is_active,
      state: account.getStateName()
    };
  }

  async suspendAccount(userId, { currentAdminId } = {}) {
    if (userId === currentAdminId) {
      throw new Error('Cannot deactivate your own admin account');
    }

    const user = await this.getManagedUser(userId);
    const account = this.toUserAccount(user);
    account.changeState('suspend');
    await account.persist();

    return {
      id: user.id,
      is_active: user.is_active,
      state: account.getStateName()
    };
  }

  async getProfile(userId) {
    const user = await User.findByPk(userId, {
      attributes: { exclude: ['password_hash'] },
      include: [
        { model: Customer, include: [Address] },
        { model: Restaurant },
        { model: DeliveryPartner },
        { model: Admin },
        { model: CustomerSupport }
      ]
    });

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }

  async updateProfile(userId, updateData, io) {
    const { full_name, phone_number, password, restaurant_name, location, cuisine_type, vehicle_license, address, is_open } = updateData;

    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (full_name) user.full_name = full_name;
    if (phone_number) user.phone_number = phone_number;
    if (password) user.password_hash = password;

    await user.save();

    if (user.role === 'restaurant') {
      const restaurant = await Restaurant.findOne({ where: { user_id: user.id } });
      if (restaurant) {
        const wasOpen = restaurant.is_open;
        if (restaurant_name) restaurant.name = restaurant_name;
        if (location) restaurant.location = location;
        if (cuisine_type) restaurant.cuisine_type = cuisine_type;
        if (typeof is_open === 'boolean') restaurant.is_open = is_open;
        await restaurant.save();

        if (io && wasOpen !== restaurant.is_open) {
          io.emit('RESTAURANT_STATUS_UPDATED', {
            restaurantId: restaurant.id,
            name: restaurant.name,
            is_open: restaurant.is_open
          });
        }
      }
    } else if (user.role === 'delivery_partner') {
      const driver = await DeliveryPartner.findOne({ where: { user_id: user.id } });
      if (driver) {
        if (vehicle_license) driver.vehicle_license = vehicle_license;
        await driver.save();
      }
    } else if (user.role === 'customer' && address) {
      const customer = await Customer.findOne({ where: { user_id: user.id } });
      if (customer) {
        let customerAddress = await Address.findOne({
          where: { customer_id: customer.id },
          order: [['is_default', 'DESC'], ['created_at', 'DESC']]
        });

        if (customerAddress) {
          customerAddress.street = address;
          customerAddress.is_default = true;
          await customerAddress.save();

          await Address.update({ is_default: false }, {
            where: {
              customer_id: customer.id,
              id: { [Op.ne]: customerAddress.id }
            }
          });
        } else {
          await Address.create({
            customer_id: customer.id,
            street: address,
            city: 'Food City',
            is_default: true
          });
        }
      }
    }

    return await this.getProfile(user.id);
  }
}

module.exports = new AuthService();
