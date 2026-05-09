require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { sequelize } = require('./models');
const restaurantRoutes = require('./routes/restaurantRoutes');
const menuRoutes = require('./routes/menuRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', service: 'restaurant-service' });
});

app.use('/api/restaurants', restaurantRoutes);
app.use('/api/menu', menuRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const PORT = process.env.PORT || 5004;

// Database Connection and Server Start
sequelize.authenticate()
  .then(() => {
    console.log('Database connected successfully.');
    app.listen(PORT, () => {
      console.log(`Restaurant Service running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Unable to connect to the database:', err);
  });
