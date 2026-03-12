require('dotenv').config();
const { sequelize, User, Customer, Restaurant, DeliveryPartner, Admin, CustomerSupport, Address, MenuCategory, MenuItem } = require('./models');

const SEED_EMAILS = [
    'admin@ofds.com',
    'support@ofds.com',
    'restaurant@ofds.com',
    'driver@ofds.com',
    'customer@ofds.com',
];

async function seed() {
    try {
        await sequelize.authenticate();
        console.log('✅ Connected to database');

        // Cleanup old seed data
        console.log('🗑️  Cleaning up old seed data...');
        for (const email of SEED_EMAILS) {
            const user = await User.findOne({ where: { email } });
            if (user) {
                // Cascade: delete profile then user
                await Customer.destroy({ where: { user_id: user.id }, force: true });
                await Restaurant.destroy({ where: { user_id: user.id }, force: true });
                await DeliveryPartner.destroy({ where: { user_id: user.id }, force: true });
                await Admin.destroy({ where: { user_id: user.id }, force: true });
                await CustomerSupport.destroy({ where: { user_id: user.id }, force: true });
                await user.destroy({ force: true });
            }
        }
        console.log('✅ Old seed data cleaned');

        // NOTE: We pass PLAIN password to password_hash. 
        // The User model's beforeCreate hook in models/User.js will hash it automatically.
        // DO NOT pre-hash here, otherwise it will be double-hashed!

        // ============================================================
        // 1. ADMIN
        // ============================================================
        const adminUser = await User.create({
            email: 'admin@ofds.com',
            password_hash: 'Admin@123',
            role: 'admin',
            full_name: 'System Administrator',
            phone_number: '+84900000001',
            is_active: true,
        });
        await Admin.create({
            user_id: adminUser.id,
            department: 'Operations',
        });
        console.log('✅ Admin created: admin@ofds.com / Admin@123');

        // ============================================================
        // 2. CUSTOMER SUPPORT
        // ============================================================
        const supportUser = await User.create({
            email: 'support@ofds.com',
            password_hash: 'Support@123',
            role: 'customer_support',
            full_name: 'Support Team',
            phone_number: '+84900000002',
            is_active: true,
        });
        await CustomerSupport.create({
            user_id: supportUser.id,
            contact_number: '+84900000002',
        });
        console.log('✅ Customer Support created: support@ofds.com / Support@123');

        // ============================================================
        // 3. RESTAURANT OWNER
        // ============================================================
        const restaurantUser = await User.create({
            email: 'restaurant@ofds.com',
            password_hash: 'Restaurant@123',
            role: 'restaurant',
            full_name: 'Nguyen Van Chu',
            phone_number: '+84900000003',
            is_active: true,
        });
        const restaurant = await Restaurant.create({
            user_id: restaurantUser.id,
            name: 'Pho Saigon Kitchen',
            location: '123 Nguyen Hue, District 1, Ho Chi Minh City',
            cuisine_type: 'Vietnamese',
            opening_hours: JSON.stringify({ mon: '08:00-22:00', tue: '08:00-22:00', wed: '08:00-22:00', thu: '08:00-22:00', fri: '08:00-23:00', sat: '09:00-23:00', sun: '09:00-21:00' }),
            is_open: true,
            rating: 4.7,
            min_order_amount: 50000,
            delivery_radius: 5.0,
        });
        console.log('✅ Restaurant created: restaurant@ofds.com / Restaurant@123');

        // Add menu categories & items
        const cat1 = await MenuCategory.create({ restaurant_id: restaurant.id, name: 'Pho & Noodles' });
        const cat2 = await MenuCategory.create({ restaurant_id: restaurant.id, name: 'Banh Mi' });
        const cat3 = await MenuCategory.create({ restaurant_id: restaurant.id, name: 'Drinks' });

        await MenuItem.create({ restaurant_id: restaurant.id, category_id: cat1.id, name: 'Pho Bo (Beef Noodle Soup)', price: 75000, description: 'Traditional Vietnamese beef noodle soup with herbs', image_url: 'https://images.unsplash.com/photo-1555126634-323283e090fa?w=400', is_available: true });
        await MenuItem.create({ restaurant_id: restaurant.id, category_id: cat1.id, name: 'Bun Bo Hue', price: 65000, description: 'Spicy beef noodle soup from Hue city', image_url: 'https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?w=400', is_available: true });
        await MenuItem.create({ restaurant_id: restaurant.id, category_id: cat2.id, name: 'Banh Mi Thit Nuong', price: 35000, description: 'Grilled pork baguette sandwich', image_url: 'https://images.unsplash.com/photo-1509722747041-619f3830c448?w=400', is_available: true });
        await MenuItem.create({ restaurant_id: restaurant.id, category_id: cat3.id, name: 'Tra Da (Iced Tea)', price: 15000, description: 'Classic Vietnamese iced green tea', image_url: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400', is_available: true });
        await MenuItem.create({ restaurant_id: restaurant.id, category_id: cat3.id, name: 'Ca Phe Sua Da', price: 25000, description: 'Vietnamese iced milk coffee', image_url: 'https://images.unsplash.com/photo-1534778101976-62847782c213?w=400', is_available: true });
        console.log('✅ Menu categories & items created for restaurant');

        // ============================================================
        // 4. DELIVERY PARTNER
        // ============================================================
        const deliveryUser = await User.create({
            email: 'driver@ofds.com',
            password_hash: 'Driver@123',
            role: 'delivery_partner',
            full_name: 'Tran Van Xe',
            phone_number: '+84900000004',
            is_active: true,
        });
        await DeliveryPartner.create({
            user_id: deliveryUser.id,
            vehicle_license: '51F-12345',
            is_available: true,
            rating: 4.9,
        });
        console.log('✅ Delivery Partner created: driver@ofds.com / Driver@123');

        // ============================================================
        // 5. CUSTOMER
        // ============================================================
        const customerUser = await User.create({
            email: 'customer@ofds.com',
            password_hash: 'Customer@123',
            role: 'customer',
            full_name: 'Le Thi Khach',
            phone_number: '+84900000005',
            is_active: true,
        });
        const customer = await Customer.create({
            user_id: customerUser.id,
        });

        // Add address for customer
        const address = await Address.create({
            customer_id: customer.id,
            label: 'Home',
            street: '456 Le Loi Street, District 1',
            city: 'Ho Chi Minh City',
            latitude: 10.7769,
            longitude: 106.7009,
            is_default: true,
        });

        // Update customer default address
        await Customer.update({ default_address_id: address.id }, { where: { id: customer.id } });
        console.log('✅ Customer created: customer@ofds.com / Customer@123');

        // ============================================================
        // SUMMARY
        // ============================================================
        console.log('\n========================================');
        console.log('  🎉 SEED DATA CREATED SUCCESSFULLY!');
        console.log('========================================');
        console.log('  Role               | Email                 | Password');
        console.log('  ------------------|----------------------|-------------');
        console.log('  Admin             | admin@ofds.com        | Admin@123');
        console.log('  Customer Support  | support@ofds.com      | Support@123');
        console.log('  Restaurant Owner  | restaurant@ofds.com   | Restaurant@123');
        console.log('  Delivery Partner  | driver@ofds.com       | Driver@123');
        console.log('  Customer          | customer@ofds.com     | Customer@123');
        console.log('========================================\n');

    } catch (error) {
        console.error('❌ Seed error:', error.parent ? error.parent.message : error.message);
        if (error.sql) console.error('SQL:', error.sql);
    } finally {
        await sequelize.close();
    }
}

seed();
