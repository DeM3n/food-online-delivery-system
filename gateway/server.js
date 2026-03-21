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
};

// 1. Security Headers (Helmet) - Adjusted for development
app.use(helmet({
    contentSecurityPolicy: false, // Disable CSP in dev to avoid blocking assets
}));

// 2. Logging (Morgan)
app.use(morgan('dev'));

// 3. Rate Limiting - Increased for development
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Increased from 100 to 1000 for development
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
    target: SERVICES.BACKEND,
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
    console.log(`🔗 Proxying /api and /socket.io traffic to: ${SERVICES.BACKEND}`);
});

// Handle WebSocket upgrade manually
server.on('upgrade', (req, socket, head) => {
    console.log(`[Gateway] ⬆️ WebSocket Upgrade Request: ${req.url} (Host: ${req.headers.host})`);
    
    if (req.url.startsWith('/socket.io')) {
        console.log(`[Gateway] 🔀 Delegating /socket.io upgrade to Backend`);
        socketProxy.upgrade(req, socket, head);
    } else {
        console.log(`[Gateway] ⚠️ Upgrade request for unknown path: ${req.url}`);
    }
});
