import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import axios from './api/axios';
import socket from './socket';
import { loginSuccess, logout as logoutAction } from './redux/slices/authSlice';
import { fetchCart, resetCartState } from './redux/slices/cartSlice';

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
import OrderTracking from './pages/Customer/OrderTracking';

import RestaurantDashboard from './pages/Restaurant/Dashboard';
import RestaurantOrders from './pages/Restaurant/Orders';
import MenuManagement from './pages/Restaurant/MenuManagement';
import RestaurantSummary from './pages/Restaurant/Summary';
import DeliveryDashboard from './pages/Delivery/Dashboard';
import DeliveryOrders from './pages/Delivery/Orders';
import DriverSummary from './pages/Delivery/Summary';
import AdminDashboard from './pages/Admin/Dashboard';
import AdminUsers from './pages/Admin/AdminUsers';
import AdminOrders from './pages/Admin/AdminOrders';

import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import Profile from './pages/Auth/Profile';


function App() {
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const token = useSelector((state) => state.auth.token);

  useEffect(() => {
    const fetchUser = async () => {
      if (token && !user) {
        try {
          const response = await axios.get('/auth/profile');
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
            
            // Fetch cart from database once logged in
            if (data.role === 'customer') {
              dispatch(fetchCart());
            }
          }
        } catch (error) {
          console.error('Auto-login failed:', error);
          // If token is invalid, clear it
          if (error.response?.status === 401) {
            sessionStorage.removeItem('token');
            sessionStorage.removeItem('user');
            sessionStorage.removeItem('profile');
            dispatch(logoutAction());
            dispatch(resetCartState());
          }
        }
      }
    };

    fetchUser();

    // If user is already in session (from sessionStorage), fetch their cart on refresh
    if (token && user && user.role === 'customer') {
      dispatch(fetchCart());
    }
  }, [token, user, dispatch]);

  // Socket Connection Management
  useEffect(() => {
    socket.connect();

    const onConnect = () => {
      console.log('Connected to real-time server');
      if (user && user.id) {
        socket.emit('join', user.id);
      }
    };

    socket.on('connect', onConnect);

    return () => {
      socket.off('connect', onConnect);
      socket.disconnect();
    };
  }, []); // Only connect/disconnect on mount/unmount

  // Handle User Room Joining when auth state changes
  useEffect(() => {
    if (socket.connected && user && user.id) {
      socket.emit('join', user.id);
    }
  }, [user]);

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
          <Route path="tracking" element={<OrderTracking />} />
          <Route path="profile" element={<Profile />} />
        </Route>

        {/* Restaurant Routes */}
        <Route path="/restaurant" element={<RestaurantLayout />}>
          <Route index element={<RestaurantDashboard />} />
          <Route path="menu" element={<MenuManagement />} />
          <Route path="orders" element={<RestaurantOrders />} />
          <Route path="summary" element={<RestaurantSummary />} />
          <Route path="profile" element={<Profile />} />
        </Route>

        {/* Delivery Routes */}
        <Route path="/delivery" element={<DeliveryLayout />}>
          <Route index element={<DeliveryDashboard />} />
          <Route path="orders" element={<DeliveryOrders />} />
          <Route path="summary" element={<DriverSummary />} />
          <Route path="map" element={<div>Google Maps Tracking</div>} />
          <Route path="profile" element={<Profile />} />
        </Route>

        {/* Admin Routes */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="profile" element={<Profile />} />
        </Route>

        {/* Default route */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </div>
  );
}

export default App;
