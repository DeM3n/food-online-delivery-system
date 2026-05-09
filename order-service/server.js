const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { sequelize } = require('./models');

// Load env vars
dotenv.config();

const app = express();

// Enable CORS
app.use(cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
    credentials: true
}));

// Body parser
app.use(express.json());

// Import only Order-related routes
const orderRoutes = require('./routes/orderRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const cartRoutes = require('./routes/cartRoutes');
const adminRoutes = require('./routes/adminRoutes');

// Mount Order routes
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/admin', adminRoutes);

const PORT = process.env.PORT || 5002;

sequelize.sync({ force: false }).then(() => {
    console.log('Order Service Database synced');
    app.listen(PORT, () => {
        console.log(`✅ Order Microservice running on port ${PORT}`);
    });
}).catch(err => {
    console.error('Failed to sync database in Order Service:', err);
});
