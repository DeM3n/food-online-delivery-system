const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('socket.io');
const { sequelize } = require('./models');
const { VNPay, ignoreLogger, ProductCode, VnpLocale, dateFormat } = require("vnpay");

// Load env vars
dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Adjust this in production
        methods: ["GET", "POST", "PUT"]
    }
});

// Enable CORS - Move to top and configure explicitly
app.use(cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
    credentials: true
}));

// Body parser
app.use(express.json());



// Make io accessible in requests
app.use((req, res, next) => {
    req.io = io;
    next();
});

// Import routes
// const authRoutes = require('./routes/authRoutes'); // MOVED TO IDENTITY-SERVICE
// const restaurantRoutes = require('./routes/restaurantRoutes'); // MOVED TO RESTAURANT-SERVICE
// const menuRoutes = require('./routes/menuRoutes'); // MOVED TO RESTAURANT-SERVICE
// const orderRoutes = require('./routes/orderRoutes'); // MOVED TO ORDER-SERVICE
const adminRoutes = require('./routes/adminRoutes');
// const cartRoutes = require('./routes/cartRoutes'); // MOVED TO ORDER-SERVICE
// const paymentRoutes = require('./routes/paymentRoutes'); // MOVED TO ORDER-SERVICE

// Mount routes
// app.use('/api/auth', authRoutes); // HANDLED BY IDENTITY-SERVICE VIA GATEWAY
// app.use('/api/restaurants', restaurantRoutes); // HANDLED BY RESTAURANT-SERVICE VIA GATEWAY
// app.use('/api/menu', menuRoutes); // HANDLED BY RESTAURANT-SERVICE VIA GATEWAY
// app.use('/api/orders', orderRoutes); // HANDLED BY ORDER-SERVICE VIA GATEWAY
// app.use('/api/cart', cartRoutes); // HANDLED BY ORDER-SERVICE VIA GATEWAY
// app.use('/api/admin', adminRoutes); // HANDLED BY IDENTITY & ORDER SERVICES VIA GATEWAY
// app.use('/api/payments', paymentRoutes); // HANDLED BY ORDER-SERVICE VIA GATEWAY

const dispatchService = require('./services/dispatch/dispatchService');
const { DeliveryPartner } = require('./models');

// Socket.io Connection Logic
io.on('connection', (socket) => {
    console.log('Socket.io: A user connected:', socket.id);

    // Join room based on userId for targeted notifications
    socket.on('join', (userId) => {
        socket.join(userId);
        console.log(`Socket.io: User ${userId} joined notification room (Socket: ${socket.id})`);
    });

    // Driver specific room join using driverId
    socket.on('join_driver', ({ driverId, userId }) => {
        if (driverId) socket.join(`driver_${driverId}`);
        if (userId) socket.join(userId);
        console.log(`Socket.io: Driver ${driverId} (User: ${userId}) joined room driver_${driverId}`);
    });

    // Driver location update event
    socket.on('DRIVER_UPDATE_LOCATION', async (data) => {
        try {
            const { driverId, latitude, longitude } = data;
            if (driverId && latitude && longitude) {
                await DeliveryPartner.update(
                    {
                        latitude: parseFloat(latitude),
                        longitude: parseFloat(longitude),
                        last_location_update: new Date()
                    },
                    { where: { id: driverId } }
                );
            }
        } catch (err) {
            console.error('Error updating driver location:', err);
        }
    });

    // Driver accepts offer event
    socket.on('ACCEPT_ORDER_OFFER', async (data, callback) => {
        try {
            const { orderId, userId } = data;
            const order = await dispatchService.handleDriverAccept(orderId, userId, io);
            if (callback) callback({ success: true, data: order });
        } catch (err) {
            console.error('Error accepting order offer:', err.message);
            if (callback) callback({ success: false, message: err.message });
        }
    });

    // Driver declines/rejects offer event
    socket.on('REJECT_ORDER_OFFER', async (data, callback) => {
        try {
            const { orderId, userId, reason } = data;
            await dispatchService.handleDriverReject(orderId, userId, reason, io);
            if (callback) callback({ success: true });
        } catch (err) {
            console.error('Error rejecting order offer:', err.message);
            if (callback) callback({ success: false, message: err.message });
        }
    });

    // Legacy room for available deliveries
    socket.on('join_deliveries', () => {
        socket.join('available_deliveries');
    });

    socket.on('disconnect', (reason) => {
        console.log('Socket.io: User disconnected. Reason:', reason);
    });
});

// Database Sync & Recovery Startup
const PORT = process.env.PORT || 5000;

sequelize.sync({ force: false }).then(() => {
    console.log('Database synced successfully');
    server.listen(PORT, async () => {
        console.log(`Server running on port ${PORT}`);
        // Run startup recovery job to resume orphaned dispatches
        await dispatchService.recoverOrphanedDispatches(io);
    });
}).catch(err => {
    console.error('Failed to sync database:', err);
});

