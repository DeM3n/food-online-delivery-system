import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { io } from 'socket.io-client';
import axios from 'axios';
import { loginSuccess } from './redux/slices/authSlice';

// Layouts
import CustomerLayout from './components/layouts/CustomerLayout';
import RestaurantLayout from './components/layouts/RestaurantLayout';
import DeliveryLayout from './components/layouts/DeliveryLayout';
import AdminLayout from './components/layouts/AdminLayout';

// Mock Pages
import CustomerDashboard from './pages/Customer/Dashboard';
import RestaurantList from './pages/Customer/RestaurantList';
import RestaurantMenu from './pages/Customer/RestaurantMenu';
import CartPage from './pages/Customer/CartPage';
import CheckoutPage from './pages/Customer/CheckoutPage';

import RestaurantDashboard from './pages/Restaurant/Dashboard';
import RestaurantOrders from './pages/Restaurant/Orders';
import DeliveryDashboard from './pages/Delivery/Dashboard';
import DeliveryOrders from './pages/Delivery/Orders';
import AdminDashboard from './pages/Admin/Dashboard';

import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import Profile from './pages/Auth/Profile';

// Socket Connection
const socket = io('http://localhost:5000'); // Link to backend

function App() {
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const token = useSelector((state) => state.auth.token);

  useEffect(() => {
    const fetchUser = async () => {
      if (token && !user) {
        try {
          const config = {
            headers: { Authorization: `Bearer ${token}` }
          };
          const response = await axios.get('http://localhost:5000/api/auth/profile', config);
          if (response.data.success) {
            const data = response.data.data;
            // Determine which profile is active
            let profile = null;
            if (data.Customer) profile = data.Customer;
            else if (data.Restaurant) profile = data.Restaurant;
            else if (data.DeliveryPartner) profile = data.DeliveryPartner;
            else if (data.Admin) profile = data.Admin;
            else if (data.CustomerSupport) profile = data.CustomerSupport;

            dispatch(loginSuccess({
              user: {
                id: data.id,
                email: data.email,
                role: data.role,
                full_name: data.full_name,
                phone_number: data.phone_number
              },
              profile: profile,
              token: token
            }));
          }
        } catch (error) {
          console.error('Auto-login failed:', error);
          // If token is invalid, clear it
          if (error.response?.status === 401) {
            localStorage.removeItem('token');
          }
        }
      }
    };

    fetchUser();
    
    socket.on('connect', () => {
      console.log('Connected to real-time server');
    });

    return () => {
      socket.off('connect');
    };
  }, [token, user, dispatch]);

  return (
    <div className="font-sans bg-background min-h-screen text-textMain">
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Customer Routes */}
        <Route path="/customer" element={<CustomerLayout />}>
          <Route index element={<CustomerDashboard />} />
          <Route path="restaurants" element={<RestaurantList />} />
          <Route path="restaurant/:restaurantId" element={<RestaurantMenu />} />
          <Route path="cart" element={<CartPage />} />
          <Route path="checkout" element={<CheckoutPage />} />
          <Route path="profile" element={<Profile />} />
        </Route>

        {/* Restaurant Routes */}
        <Route path="/restaurant" element={<RestaurantLayout />}>
          <Route index element={<RestaurantDashboard />} />
          <Route path="menu" element={<div>Menu Management</div>} />
          <Route path="orders" element={<RestaurantOrders />} />
          <Route path="profile" element={<Profile />} />
        </Route>

        {/* Delivery Routes */}
        <Route path="/delivery" element={<DeliveryLayout />}>
          <Route index element={<DeliveryDashboard />} />
          <Route path="orders" element={<DeliveryOrders />} />
          <Route path="map" element={<div>Google Maps Tracking</div>} />
          <Route path="profile" element={<Profile />} />
        </Route>

        {/* Admin Routes */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="orders" element={<div>System Orders</div>} />
          <Route path="users" element={<div>User Management</div>} />
          <Route path="profile" element={<Profile />} />
        </Route>

        {/* Default route */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </div>
  );
}

export default App;
