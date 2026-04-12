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
        origin: "*", 
        methods: ["GET", "POST", "PUT"]
    }
});

// Enable CORS
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

// Import only Order-related routes
const orderRoutes = require('./routes/orderRoutes');
const paymentRoutes = require('./routes/paymentRoutes');

// Mount Order routes
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);

// Socket.io Connection Logic (Order specific)
io.on('connection', (socket) => {
    console.log('📡 Order Service Socket: A user connected:', socket.id);

    socket.on('join', (userId) => {
        socket.join(userId);
        console.log(`🏠 Order Service: User ${userId} joined room`);
    });

    socket.on('join_deliveries', () => {
        socket.join('available_deliveries');
        console.log('🚚 Order Service: User joined available_deliveries room');
    });

    socket.on('disconnect', () => {
        console.log('🔌 Order Service: User disconnected');
    });
});

const PORT = process.env.PORT || 5002;

sequelize.sync({ force: false }).then(() => {
    console.log('Order Service Database synced');
    server.listen(PORT, () => {
        console.log(`✅ Order Microservice running on port ${PORT}`);
    });
}).catch(err => {
    console.error('Failed to sync database in Order Service:', err);
});
