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
    RESTAURANT_SERVICE: process.env.RESTAURANT_SERVICE_URL || 'http://localhost:5004',
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

// Route Order & Payment Service
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

// Route Cart Service
app.use('/api/cart', createProxyMiddleware({
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
        console.error('Proxy Error (Cart Service):', err.message);
        res.status(502).json({ 
            error: 'Bad Gateway', 
            details: 'The cart service (via order service) is currently unavailable.' 
        });
    }
}));

// Route Admin - Orders (to Order Service)
app.use('/api/admin/orders', createProxyMiddleware({
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
        console.error('Proxy Error (Admin Orders):', err.message);
        res.status(502).json({ error: 'Bad Gateway' });
    }
}));

// Route Admin - Identity/Stats/Approvals (to Identity Service)
app.use('/api/admin', createProxyMiddleware({
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
        console.error('Proxy Error (Admin Identity):', err.message);
        res.status(502).json({ error: 'Bad Gateway' });
    }
}));

// Route Restaurant Service
app.use(['/api/restaurants', '/api/menu'], createProxyMiddleware({
    target: SERVICES.RESTAURANT_SERVICE,
    changeOrigin: true,
    onProxyReq: (proxyReq, req, res) => {
        proxyReq.setHeader('X-Gateway-Request', 'true');
        proxyReq.setHeader('X-Service-Name', 'restaurant-service');
    },
    onProxyRes: (proxyRes, req, res) => {
        proxyRes.headers['X-Service-Name'] = 'restaurant-service';
    },
    onError: (err, req, res) => {
        console.error('Proxy Error (Restaurant Service):', err.message);
        res.status(502).json({ 
            error: 'Bad Gateway', 
            details: 'The restaurant service is currently unavailable.' 
        });
    }
}));

// Route Notification Service
app.use('/api/notifications', createProxyMiddleware({
    target: 'http://localhost:5005',
    changeOrigin: true,
    onError: (err, req, res) => {
        console.error('Proxy Error (Notification Service):', err.message);
        res.status(502).json({ error: 'Bad Gateway' });
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
    target: 'http://localhost:5005', // Now points to NOTIFICATION_SERVICE
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
    console.log(`🔗 Proxying /socket.io to: http://localhost:5005`);
});

// Handle WebSocket upgrade manually
server.on('upgrade', (req, socket, head) => {
    if (req.url.startsWith('/socket.io')) {
        socketProxy.upgrade(req, socket, head);
    }
});
