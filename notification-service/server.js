const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const server = http.createServer(app);

// Enable CORS
app.use(cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    credentials: true
}));

app.use(express.json());

// Initialize Socket.io
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Import Services
const mailRoutes = require('./routes/mailRoutes');
const socketRoutes = require('./routes/socketRoutes')(io);

// Mount Routes
app.use('/api/notifications/mail', mailRoutes);
app.use('/api/notifications/realtime', socketRoutes);

// Socket.io Connection Logic
io.on('connection', (socket) => {
    console.log(`📡 Notification Service: Client connected: ${socket.id}`);

    socket.on('join', (room) => {
        socket.join(room);
        console.log(`🏠 Client ${socket.id} joined room: ${room}`);
    });

    socket.on('disconnect', () => {
        console.log(`🔌 Client disconnected: ${socket.id}`);
    });
});

const PORT = process.env.PORT || 5005;
server.listen(PORT, () => {
    console.log(`🚀 Notification Microservice running on port ${PORT}`);
});
