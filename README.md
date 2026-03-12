# 🍜 Online Food Delivery System (OFDS)

Full-stack web application for an online food delivery platform, supporting Customers, Restaurants, Delivery Partners, and Admins.

---

## 🧰 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite + TailwindCSS + Redux Toolkit |
| Backend | Node.js + Express.js |
| Database | MySQL / SQL Server |
| ORM | Sequelize |
| Auth | JWT (JSON Web Token) |
| Real-time | Socket.io |

---

## 📋 Prerequisites

Make sure your machine has these installed:

- [Node.js](https://nodejs.org/) v18+
- [MySQL](https://www.mysql.com/) or SQL Server (MSSQL)
- [Git](https://git-scm.com/)

---

## 🚀 Getting Started

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

Then open `.env` and fill in **your own** database credentials:

```env
PORT=5000

DB_HOST=127.0.0.1
DB_NAME=ofds_db
DB_USER=sa
DB_PASS=YOUR_ACTUAL_DB_PASSWORD

JWT_SECRET=supersecret_jwt_key_ofds_2026
```

> ⚠️ Make sure your database server (MySQL/MSSQL) is running and the database `ofds_db` has been created.

Start the backend server:

```bash
npm run dev
```

The backend will run at **http://localhost:5000**

---

### 3. Set Up the Frontend

Open a **new terminal**, then:

```bash
cd frontend
npm install
npm run dev
```

The frontend will run at **http://localhost:5173**

---

## 🗄️ Database Setup

The application uses **Sequelize ORM** with auto-sync. When you first run the backend, it will automatically create all tables in your database.

To seed the database with sample data (restaurants, users, menu items):

```bash
cd backend
node seed.js
```

---

## 👥 Default Roles & Test Accounts

After running `seed.js`, you can log in with these test accounts:

| Role | Email | Password |
|---|---|---|
| Customer | customer@test.com | password123 |
| Restaurant | restaurant@test.com | password123 |
| Delivery Partner | driver@test.com | password123 |
| Admin | admin@test.com | password123 |

---

## 🗂️ Project Structure

```
ofds/
├── backend/
│   ├── config/         # Database connection
│   ├── controllers/    # Business logic handlers
│   ├── middleware/     # Auth (JWT) middleware
│   ├── models/         # Sequelize ORM models
│   ├── routes/         # API route definitions
│   ├── seed.js         # Database seeder
│   └── server.js       # Entry point
│
└── frontend/
    └── src/
        ├── components/  # Shared UI components & layouts
        ├── pages/       # Pages by role (Customer, Restaurant, Delivery, Admin)
        ├── redux/       # State management slices
        └── App.jsx      # Root component & routing
```

---

## 🔑 API Overview

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/register` | Register |
| GET | `/api/auth/profile` | Get current user profile |
| GET | `/api/restaurants` | List all restaurants |
| GET | `/api/menu/full/:restaurantId` | Get full menu for a restaurant |
| POST | `/api/orders` | Place a new order |
| GET | `/api/orders/restaurant/:id` | Get orders for a restaurant |
| PUT | `/api/orders/:id/status` | Update order status |
| GET | `/api/orders/deliveries/available` | Get orders ready for pickup |
| PUT | `/api/orders/:id/accept-delivery` | Driver accepts a delivery |

---

## 📄 License

This project is for educational purposes only.
