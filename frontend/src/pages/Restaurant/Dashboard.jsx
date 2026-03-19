import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import axios from '../../api/axios';
import socket from '../../socket';
import { notification } from 'antd';
import { loginSuccess } from '../../redux/slices/authSlice';

export default function RestaurantDashboard() {
  const { profile, user, token } = useSelector(state => state.auth);
  const dispatch = useDispatch();
  const [orders, setOrders] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRestaurantOpen, setIsRestaurantOpen] = useState(Boolean(profile?.is_open));
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    setIsRestaurantOpen(Boolean(profile?.is_open));
  }, [profile?.is_open]);

  const fetchData = async () => {
    try {
      const [ordersRes, menuRes] = await Promise.all([
        axios.get('/orders/restaurant/me'),
        axios.get(`/menu/full/${profile.id}`)
      ]);

      if (ordersRes.data.success) {
        setOrders(ordersRes.data.data);
      }

      if (menuRes.data.success) {
        // Flatten items from categories
        const items = menuRes.data.data.flatMap(cat => cat.MenuItems || []);
        setMenuItems(items.sort((a, b) => b.rating - a.rating).slice(0, 5));
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile && profile.id) {
      fetchData();

      // Real-time notifications
      socket.connect();
      socket.emit('join', user.id);

      socket.on('NEW_ORDER', (data) => {
        notification.success({
          message: 'New Order Received!',
          description: `You have a new order (#${data.orderId.slice(0, 8)}) for ${data.totalAmount.toLocaleString()}đ`,
          placement: 'topRight',
          duration: 10
        });
        fetchData(); // Auto refresh
      });

      socket.on('ORDER_STATUS_UPDATED', (data) => {
        fetchData(); // Auto refresh
      });

      return () => {
        socket.off('NEW_ORDER');
        socket.off('ORDER_STATUS_UPDATED');
        socket.disconnect();
      };
    }
  }, [profile, user]);

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const ordersThisMonth = orders.filter(o => {
    const createdAt = o.created_at || o.createdAt;
    if (!createdAt) return false;

    const d = new Date(createdAt);
    if (Number.isNaN(d.getTime())) return false;

    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const completedThisMonth = ordersThisMonth.filter(
    o => o.status === 'completed' || o.status === 'delivered'
  ).length;

  const cancelledThisMonth = ordersThisMonth.filter(
    o => o.status === 'cancelled'
  ).length;

  const stats = [
    { label: "Completed Orders (this month)", value: completedThisMonth, color: "border-primary" },
    { label: "Cancelled Orders (this month)", value: cancelledThisMonth, color: "border-secondary" },
    { label: "Restaurant Rating", value: `${profile?.rating || 'N/A'} ⭐`, color: "border-accent" },
  ];

  if (loading) return <div className="py-20 text-center text-xl">Loading dashboard...</div>;

  const handleToggleRestaurantStatus = async () => {
    if (!profile?.id || updatingStatus) return;

    const nextStatus = !isRestaurantOpen;
    try {
      setUpdatingStatus(true);
      const response = await axios.put('/auth/profile', { is_open: nextStatus });

      if (response.data.success) {
        const updatedData = response.data.data;
        let activeProfile = null;
        if (updatedData.Customer) activeProfile = updatedData.Customer;
        else if (updatedData.Restaurant) activeProfile = updatedData.Restaurant;
        else if (updatedData.DeliveryPartner) activeProfile = updatedData.DeliveryPartner;
        else if (updatedData.Admin) activeProfile = updatedData.Admin;

        dispatch(loginSuccess({
          user: {
            id: updatedData.id,
            email: updatedData.email,
            role: updatedData.role,
            full_name: updatedData.full_name,
            phone_number: updatedData.phone_number
          },
          profile: activeProfile,
          token
        }));

        setIsRestaurantOpen(Boolean(activeProfile?.is_open));
        notification.success({
          message: 'Restaurant status updated',
          description: nextStatus
            ? 'Your restaurant is now OPEN for customers.'
            : 'Your restaurant is now CLOSED for customers.',
          placement: 'topRight'
        });
      }
    } catch (error) {
      notification.error({
        message: 'Unable to update status',
        description: error.response?.data?.message || 'Please try again.',
        placement: 'topRight'
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">{profile?.name || 'Restaurant'} Operations</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-500">Status:</span>
          <button
            type="button"
            onClick={handleToggleRestaurantStatus}
            disabled={updatingStatus}
            className={`${isRestaurantOpen ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-700 hover:bg-red-200'} px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-70 disabled:cursor-not-allowed`}
            title="Click to change open/closed status"
          >
            {updatingStatus ? 'Updating...' : isRestaurantOpen ? 'Open (Click to close)' : 'Closed (Click to open)'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {stats.map((stat, i) => (
          <div key={i} className={`bg-white p-6 rounded-2xl shadow-soft border-l-4 ${stat.color}`}>
            <h3 className="text-gray-500 font-medium text-sm uppercase tracking-wide">{stat.label}</h3>
            <p className="text-3xl font-bold mt-2 text-gray-800">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-2xl shadow-soft">
          <h2 className="text-xl font-bold mb-4 text-gray-800">Recent Orders</h2>
          <div className="overflow-x-auto">
            {orders.length > 0 ? (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b text-gray-400 text-sm uppercase">
                    <th className="py-3 font-semibold">Order ID</th>
                    <th className="py-3 font-semibold">Customer</th>
                    <th className="py-3 font-semibold">Total</th>
                    <th className="py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.slice(0, 5).map(order => (
                    <tr key={order.id} className="border-b hover:bg-gray-50 transition-colors text-sm">
                      <td className="py-4 font-medium text-gray-700">#{order.order_number || order.id.slice(0, 8)}</td>
                      <td className="text-gray-600">{order.Customer?.User?.full_name || order.Customer?.User?.email || 'N/A'}</td>
                      <td className="text-gray-500 font-bold">{order.total_amount?.toLocaleString()}đ</td>
                      <td>
                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${order.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                          }`}>
                          {order.status || 'Pending'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-gray-400 italic py-10 text-center text-sm">No orders yet</p>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-soft">
          <h2 className="text-xl font-bold mb-4 text-gray-800">Top Rated Items</h2>
          <div className="space-y-4">
            {menuItems.length > 0 ? (
              menuItems.map(item => (
                <div key={item.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                  <span className="font-medium text-gray-700">{item.name}</span>
                  <span className="text-primary font-bold">{item.rating || '0'} ⭐</span>
                </div>
              ))
            ) : (
              <p className="text-gray-400 italic py-10 text-center text-sm">No menu items found</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
