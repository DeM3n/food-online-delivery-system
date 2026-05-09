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

// Socket.io Connection Logic
io.on('connection', (socket) => {
    console.log('📡 Socket.io: A user connected:', socket.id);

    // Join room based on userId for targeted notifications
    socket.on('join', (userId) => {
        socket.join(userId);
        console.log(`🏠 Socket.io: User ${userId} joined their notification room (Socket: ${socket.id})`);
    });

    // Special room for available deliveries
    socket.on('join_deliveries', () => {
        socket.join('available_deliveries');
        console.log('🚚 Socket.io: User joined available_deliveries room');
    });

    socket.on('disconnect', (reason) => {
        console.log('🔌 Socket.io: User disconnected. Reason:', reason);
    });
});

// Database Sync
const PORT = process.env.PORT || 5000;

sequelize.sync({ force: false }).then(() => {
    console.log('Database synced successfully');
    server.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}).catch(err => {
    console.error('Failed to sync database:', err);
});

