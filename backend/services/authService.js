const { User, Customer, Restaurant, DeliveryPartner, Admin, CustomerSupport, Address } = require('../models');
const { Op } = require('sequelize');
const jwt = require('jsonwebtoken');

class AuthService {
    generateToken(id) {
        return jwt.sign({ id }, process.env.JWT_SECRET || 'secret', {
            expiresIn: '30d',
        });
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

        return {
            user,
            profile,
            token: this.generateToken(user.id)
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

        if (user && (await user.matchPassword(password))) {
            if (!user.is_active) {
                if (user.role === 'restaurant' || user.role === 'delivery_partner') {
                    throw new Error('Account is pending admin approval. Please wait for confirmation.');
                }
                throw new Error('Account has been deactivated. Please contact support.');
            }

            let profile = null;
            if (user.Customer) profile = user.Customer;
            else if (user.Restaurant) profile = user.Restaurant;
            else if (user.DeliveryPartner) profile = user.DeliveryPartner;
            else if (user.Admin) profile = user.Admin;
            else if (user.CustomerSupport) profile = user.CustomerSupport;

            return {
                user,
                profile,
                token: this.generateToken(user.id)
            };
        } else {
            throw new Error('Invalid email or password');
        }
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

    async updateProfile(userId, updateData) {
        const { full_name, phone_number, password, restaurant_name, location, cuisine_type, vehicle_license, address } = updateData;

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
