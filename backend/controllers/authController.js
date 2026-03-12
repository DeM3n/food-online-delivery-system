const { User, Customer, Restaurant, DeliveryPartner, Admin, CustomerSupport, Address } = require('../models');
const { Op } = require('sequelize');
const jwt = require('jsonwebtoken');

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'secret', {
    expiresIn: '30d',
  });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
exports.registerUser = async (req, res) => {
  try {
    const { email, password, role, full_name, phone_number, name, department, contact_number, vehicle_license } = req.body;

    const userExists = await User.findOne({ where: { email } });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    // 1. Create User
    const user = await User.create({
      email,
      password_hash: password,
      role,
      full_name,
      phone_number,
      is_active: true
    });

    // 2. Create Profile based on role
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

    if (user) {
      res.status(201).json({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          role: user.role,
          full_name: user.full_name,
          phone_number: user.phone_number,
          token: generateToken(user.id),
          profile: profile
        }
      });
    } else {
      res.status(400).json({ success: false, message: 'Invalid user data' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

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

    if (user && (await user.matchPassword(password))) {
      // Determine which profile is active
      let profile = null;
      if (user.Customer) profile = user.Customer;
      else if (user.Restaurant) profile = user.Restaurant;
      else if (user.DeliveryPartner) profile = user.DeliveryPartner;
      else if (user.Admin) profile = user.Admin;
      else if (user.CustomerSupport) profile = user.CustomerSupport;

      res.json({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          role: user.role,
          full_name: user.full_name,
          phone_number: user.phone_number,
          token: generateToken(user.id),
          profile: profile
        }
      });
    } else {
      res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password_hash'] },
      include: [
        { model: Customer, include: [Address] },
        { model: Restaurant },
        { model: DeliveryPartner },
        { model: Admin },
        { model: CustomerSupport }
      ]
    });

    if (user) {
      res.json({ success: true, data: user });
    } else {
      res.status(404).json({ success: false, message: 'User not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    const { full_name, phone_number, password, restaurant_name, location, cuisine_type, vehicle_license, address } = req.body;

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Update User common fields
    if (full_name) user.full_name = full_name;
    if (phone_number) user.phone_number = phone_number;
    if (password) user.password_hash = password; // Hook will hash it

    await user.save();

    // Update Specific Profile fields
    if (user.role === 'restaurant') {
      const restaurant = await Restaurant.findOne({ where: { user_id: user.id } });
      if (restaurant) {
        if (restaurant_name) restaurant.name = restaurant_name;
        if (location) restaurant.location = location;
        if (cuisine_type) restaurant.cuisine_type = cuisine_type;
        await restaurant.save();
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
        // Find existing address (try default first, then any)
        let customerAddress = await Address.findOne({ 
          where: { customer_id: customer.id },
          order: [['is_default', 'DESC'], ['created_at', 'DESC']]
        });
        
        if (customerAddress) {
          customerAddress.street = address;
          // Ensure it's marked as default if it's the only one or if we are updating from profile
          customerAddress.is_default = true; 
          await customerAddress.save();
          
          // If we just marked this as default, ensure others are NOT default
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

    // Return updated user with profile
    const updatedUser = await User.findByPk(user.id, {
      attributes: { exclude: ['password_hash'] },
      include: [
        { 
          model: Customer, 
          include: [{ 
            model: Address,
            order: [['is_default', 'DESC']]
          }] 
        },
        { model: Restaurant },
        { model: DeliveryPartner },
        { model: Admin },
        { model: CustomerSupport }
      ]
    });

    res.json({
      success: true,
      data: updatedUser
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
