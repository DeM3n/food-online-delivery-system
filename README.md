# Online Food Delivery System (OFDS)

Full-stack web application for an online food delivery platform, supporting Customers, Restaurants, Delivery Partners, and Admins. Built with a modular microservice-capable architecture, real-time socket communication, and an automated Order Dispatch Engine.

---

## Technical Stack

| Layer | Technology |
|---|---|
| Frontend | React, Vite, TailwindCSS, Redux Toolkit |
| Backend Runtime | Node.js, Express.js |
| Architecture | Monolith & Microservices (Gateway, Identity, Order, Restaurant, Notification) |
| Database | MySQL / SQL Server (MSSQL) |
| ORM | Sequelize |
| Authentication | JWT (JSON Web Token) with Role-Based Access Control |
| Real-time Communication | Socket.io |

---

## Core System Features & Architecture

### Automated Order Dispatch Engine
The platform includes an intelligent Order Dispatching System (`dispatchService.js`) replacing traditional broadcast mechanisms with targeted sequential offers:

- **Geospatial Bounding-Box Pre-Filtering**: Queries candidate drivers using SQL bounding-box coordinate ranges (`minLat..maxLat`, `minLng..maxLng`) to leverage database indexes, excluding inactive drivers whose GPS coordinates are older than 60 seconds.
- **Candidate Ranking Algorithm**: Evaluates candidate drivers using a weighted scoring model based on distance to restaurant, driver rating, acceptance rate history, and idle waiting duration.
- **Sequential Offer Delivery**: Delivers targeted real-time offers to persistent driver rooms (`driver_${driverId}`) with a 15-second response timer via Socket.io.
- **Dual-Table Atomic Concurrency Lock**: Executes order assignment inside a single database transaction with row locks (`LOCK.UPDATE`). Updates `Order` (`delivery_partner_id = driverId`, `status = 'assigned'`) and `DeliveryPartner` (`is_available = false`) simultaneously. Automatically rolls back if concurrent assignment conflicts occur.
- **Dynamic Radius Expansion**: Expands search radius iteratively (3 km -> 5 km -> 7 km -> max 15 km). Triggers fallback notifications if no candidates accept at maximum radius.
- **Startup Recovery Job**: Scans and resumes orphaned dispatches upon server startup.

---

## Prerequisites

- Node.js v18 or higher
- MySQL or SQL Server (MSSQL)
- Git

---

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/DeM3n/food-online-delivery-system.git
cd food-online-delivery-system
```

---

### 2. Set Up the Backend

```bash
cd backend
npm install
```

Create a `.env` file from the example template:

```bash
cp .env.example .env
```

Configure `.env` with your database credentials:

```env
PORT=5000

DB_HOST=127.0.0.1
DB_NAME=ofds_db
DB_USER=sa
DB_PASS=YOUR_ACTUAL_DB_PASSWORD

JWT_SECRET=CHANGE_THIS_TO_A_LONG_RANDOM_SECRET_STRING

DISPATCH_OFFER_TIMEOUT_MS=15000
DISPATCH_INITIAL_RADIUS_KM=3.0
DISPATCH_MAX_RADIUS_KM=15.0
```

Start the backend server:

```bash
npm run dev
```

The backend server runs at `http://localhost:5000`.

---

### 3. Set Up the Frontend

Open a new terminal window:

```bash
cd frontend
npm install
npm run dev
```

The frontend application runs at `http://localhost:5173`.

---

## Database Setup & Seeding

The application uses **Sequelize ORM** with database auto-synchronization.

To seed the database with initial sample data (restaurants, menu items, user accounts):

```bash
cd backend
node seed.js
```

---

## Default Test Accounts

After executing `seed.js`, use the following credentials for role testing:

| Role | Email | Password |
|---|---|---|
| Customer | customer@test.com | password123 |
| Restaurant | restaurant@test.com | password123 |
| Delivery Partner | driver@test.com | password123 |
| Admin | admin@test.com | password123 |

---

## Project Structure

```
ofds/
├── backend/
│   ├── config/         # Database configuration
│   ├── controllers/    # Request handlers & controllers
│   ├── middleware/     # Auth & JWT middlewares
│   ├── models/         # Sequelize ORM models (User, Order, OrderOfferLog, etc.)
│   ├── routes/         # REST API route definitions
│   ├── services/       # Core domain services
│   │   ├── dispatch/   # Order Dispatch Engine (dispatchService.js)
│   │   ├── delivery_mgmt/ # Delivery management operations
│   │   └── fulfillment/   # Order fulfillment & state machine
│   ├── states/         # State pattern implementation for Order workflow
│   ├── seed.js         # Database seeder
│   └── server.js       # Express & Socket.io server entry point
│
├── gateway/            # API Gateway microservice
├── identity-service/   # Authentication & Identity microservice
├── order-service/      # Order management microservice
├── restaurant-service/ # Restaurant & Menu microservice
├── notification-service/# Real-time notification microservice
│
└── frontend/
    └── src/
        ├── components/ # Reusable UI components
        ├── pages/      # Application views by user role
        ├── redux/      # Redux state management
        └── App.jsx     # Root application component
```

---

## Real-Time Socket.io Events

| Event | Direction | Description |
|---|---|---|
| `join_driver` | Client -> Server | Joins driver to persistent room `driver_${driverId}` |
| `DRIVER_UPDATE_LOCATION` | Driver -> Server | Pushes real-time latitude/longitude coordinates |
| `ORDER_OFFER` | Server -> Driver | Sends targeted sequential offer with countdown timer |
| `ACCEPT_ORDER_OFFER` | Driver -> Server | Accepts current order offer |
| `REJECT_ORDER_OFFER` | Driver -> Server | Declines current order offer |
| `ORDER_STATUS_UPDATED` | Server -> Client | Broadcasts order state updates to Customer/Restaurant |
| `DISPATCH_FAILED` | Server -> Client | Notifies when no driver is available in service radius |

---

## License

This project is maintained for educational and demonstration purposes.
