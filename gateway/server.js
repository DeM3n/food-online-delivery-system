const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const helmet = require('helmet');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.GATEWAY_PORT || 8000;
const SERVICES = {
    BACKEND: process.env.BACKEND_URL || 'http://localhost:5001',
    ORDER_SERVICE: process.env.ORDER_SERVICE_URL || 'http://localhost:5002',
    IDENTITY_SERVICE: process.env.IDENTITY_SERVICE_URL || 'http://localhost:5003',
};

// 1. Security Headers (Helmet) - Adjusted for development
app.use(helmet({
    contentSecurityPolicy: false, 
}));

// 2. Logging (Morgan)
app.use(morgan('dev'));

// 3. Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    message: { error: 'Too many requests from this IP, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', limiter);

// 4. Global CORS
app.use(cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
    credentials: true
}));

// Health Check
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'API Gateway is Healthy', uptime: process.uptime() });
});

/**
 * 5. Proxy Configuration - REST API
 */

// Route Identity (Auth) Service
app.use('/api/auth', createProxyMiddleware({
    target: SERVICES.IDENTITY_SERVICE,
    changeOrigin: true,
    onProxyReq: (proxyReq, req, res) => {
        proxyReq.setHeader('X-Gateway-Request', 'true');
        proxyReq.setHeader('X-Service-Name', 'identity-service');
    },
    onProxyRes: (proxyRes, req, res) => {
        proxyRes.headers['X-Service-Name'] = 'identity-service';
    },
    onError: (err, req, res) => {
        console.error('Proxy Error (Identity Service):', err.message);
        res.status(502).json({ 
            error: 'Bad Gateway', 
            details: 'The identity service is currently unavailable.' 
        });
    }
}));

// Route Order & Payment Service (more specific)
app.use(['/api/orders', '/api/payments'], createProxyMiddleware({
    target: SERVICES.ORDER_SERVICE,
    changeOrigin: true,
    onProxyReq: (proxyReq, req, res) => {
        proxyReq.setHeader('X-Gateway-Request', 'true');
        proxyReq.setHeader('X-Service-Name', 'order-service');
    },
    onProxyRes: (proxyRes, req, res) => {
        proxyRes.headers['X-Service-Name'] = 'order-service';
    },
    onError: (err, req, res) => {
        console.error('Proxy Error (Order Service):', err.message);
        res.status(502).json({ 
            error: 'Bad Gateway', 
            details: 'The order service is currently unavailable.' 
        });
    }
}));

// Route everything else to Backend (Monolith)
app.use('/api', createProxyMiddleware({
    target: SERVICES.BACKEND,
    changeOrigin: true,
    onProxyReq: (proxyReq, req, res) => {
        proxyReq.setHeader('X-Gateway-Request', 'true');
    },
    onError: (err, req, res) => {
        console.error('Proxy Error (API):', err.message);
        res.status(502).json({ 
            error: 'Bad Gateway', 
            details: 'The backend service is currently unavailable.' 
        });
    }
}));

/**
 * 6. Proxy Configuration - Socket.io (WebSockets)
 */
const socketProxy = createProxyMiddleware({
    target: SERVICES.ORDER_SERVICE, // Point to ORDER_SERVICE for real-time order events
    changeOrigin: true,
    ws: true, 
    logLevel: 'debug',
    onError: (err, req, res) => {
        console.error('Proxy Error (Socket):', err.message);
    }
});

app.use('/socket.io', socketProxy);

const server = app.listen(PORT, () => {
    console.log(`🚀 API Gateway running at http://localhost:${PORT}`);
    console.log(`🔗 Proxying /api/orders to: ${SERVICES.ORDER_SERVICE}`);
    console.log(`🔗 Proxying other /api calls to: ${SERVICES.BACKEND}`);
});

// Handle WebSocket upgrade manually
server.on('upgrade', (req, socket, head) => {
    if (req.url.startsWith('/socket.io')) {
        socketProxy.upgrade(req, socket, head);
    }
});
