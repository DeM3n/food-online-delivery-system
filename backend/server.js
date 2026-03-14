const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('socket.io');
const { sequelize } = require('./models');

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

// Make io accessible in requests
app.use((req, res, next) => {
    req.io = io;
    next();
});

// Body parser
app.use(express.json());

// Enable CORS
app.use(cors());

// Import routes
const authRoutes = require('./routes/authRoutes');
const restaurantRoutes = require('./routes/restaurantRoutes');
const menuRoutes = require('./routes/menuRoutes');
const orderRoutes = require('./routes/orderRoutes');
const adminRoutes = require('./routes/adminRoutes');
const cartRoutes = require('./routes/cartRoutes');
const homeRoutes = require('./routes/homeRoutes');

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/home', homeRoutes);

// Socket.io Connection Logic
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Join room based on userId for targeted notifications
    socket.on('join', (userId) => {
        socket.join(userId);
        console.log(`User ${userId} joined their notification room`);
    });

    // Special room for available deliveries
    socket.on('join_deliveries', () => {
        socket.join('available_deliveries');
        console.log('User joined available_deliveries room');
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
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
