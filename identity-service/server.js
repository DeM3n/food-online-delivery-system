const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const { sequelize } = require('./models');

// Load env vars
dotenv.config();

const app = express();
const server = http.createServer(app);

// Enable CORS
app.use(cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
    credentials: true
}));

// Body parser
app.use(express.json());

// Import Auth-related routes
const authRoutes = require('./routes/authRoutes');

// Mount Auth routes
app.use('/api/auth', authRoutes);

const PORT = process.env.PORT || 5003;

sequelize.sync({ force: false }).then(() => {
    console.log('✅ Identity Service (Auth) Database synced');
    server.listen(PORT, () => {
        console.log(`🚀 Identity Microservice running on port ${PORT}`);
    });
}).catch(err => {
    console.error('❌ Failed to sync database in Identity Service:', err);
});
