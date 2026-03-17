import React, { useEffect, useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import axios from '../../api/axios';
import socket from '../../socket';
import { logout } from '../../redux/slices/authSlice';
import { resetCartState } from '../../redux/slices/cartSlice';
import { Badge } from 'antd';
import { UserOutlined, ShoppingCartOutlined, HomeOutlined, ShopOutlined, ClockCircleOutlined } from '@ant-design/icons';

export default function CustomerLayout() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, token } = useSelector((state) => state.auth);
  const { items } = useSelector((state) => state.cart);
  const [activeOrdersCount, setActiveOrdersCount] = useState(0);

  const cartItemsCount = items.reduce((total, item) => total + item.quantity, 0);

  useEffect(() => {
    const fetchActiveOrdersCount = async () => {
      if (!token) {
        setActiveOrdersCount(0);
        return;
      }

      try {
        const response = await axios.get('/orders/me');
        if (response.data.success) {
          const activeOrders = (response.data.data || []).filter(
            (order) => order.status !== 'completed' && order.status !== 'cancelled'
          );
          setActiveOrdersCount(activeOrders.length);
        }
      } catch (error) {
        console.error('Failed to fetch active orders count:', error);
      }
    };

    fetchActiveOrdersCount();

    const handleOrderUpdated = () => {
      fetchActiveOrdersCount();
    };

    socket.on('ORDER_STATUS_UPDATED', handleOrderUpdated);

    return () => {
      socket.off('ORDER_STATUS_UPDATED', handleOrderUpdated);
    };
  }, [token, location.pathname]);

  const handleLogout = () => {
    dispatch(logout());
    dispatch(resetCartState());
    navigate('/login');
  };

  return (
    <div className="flex flex-col min-h-screen">
      <header className="bg-white shadow-soft py-4 px-6 fixed w-full top-0 z-50 flex justify-between items-center h-20">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-primary text-white flex items-center justify-center rounded-full font-bold text-xl">
            OD
          </div>
          <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-orange-400">
            FoodDelivery
          </span>
        </div>

        <nav className="hidden md:flex gap-8 text-gray-600 font-medium items-center">
          <Link to="/customer" className="hover:text-primary transition-colors flex items-center gap-1">
            <HomeOutlined className="text-xl" />
            <span>Home</span>
          </Link>
          <Link to="/customer/restaurants" className="hover:text-primary transition-colors flex items-center gap-1">
            <ShopOutlined className="text-xl" />
            <span>Restaurants</span>
          </Link>
          <Link to="/customer/tracking" className="hover:text-primary transition-colors flex items-center gap-1">
            <Badge count={activeOrdersCount} offset={[5, 0]} size="small" color="#FF6B35">
              <ClockCircleOutlined className="text-xl" />
            </Badge>
            <span>Order Tracking</span>
          </Link>
          <Link to="/customer/profile" className="hover:text-primary transition-colors flex items-center gap-1">
            <UserOutlined className="text-xl" />
            <span>Profile</span>
          </Link>
          <Link to="/customer/cart" className="hover:text-primary transition-colors relative flex items-center gap-1">
            <Badge count={cartItemsCount} offset={[5, 0]} size="small" color="#FF6B35">
              <ShoppingCartOutlined className="text-xl" />
            </Badge>
            <span>Cart</span>
          </Link>
        </nav>

        <div className="flex items-center gap-4">
          <div className="hidden sm:block text-right">
            <p className="text-sm font-bold text-gray-700">{user?.full_name || user?.email}</p>
            <p className="text-[10px] text-primary font-bold uppercase tracking-tighter">Customer Account</p>
          </div>
          <button onClick={handleLogout} className="btn-secondary">
            Logout
          </button>
        </div>
      </header>

      <main className="flex-1 mt-20 p-6 bg-background">
        <div className="container mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
