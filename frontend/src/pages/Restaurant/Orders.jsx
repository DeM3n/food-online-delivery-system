import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import { notification } from 'antd';
import { CheckCircleOutlined, SyncOutlined, ClockCircleOutlined, CarOutlined, CloseCircleOutlined } from '@ant-design/icons';
import socket from '../../socket';

export default function RestaurantOrders() {
  const { profile, token, user } = useSelector(state => state.auth);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const { data } = await axios.get(`http://localhost:5001/api/orders/restaurant/me`, config);
      if (data.success) {
        setOrders(data.data);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile?.id) {
      fetchOrders();

      // Real-time notifications
      socket.connect();
      socket.emit('join', user.id);

      socket.on('NEW_ORDER', (data) => {
        notification.success({
          message: 'New Order Received!',
          description: `Order #${data.orderId.slice(0, 8)} has been placed.`,
        });
        fetchOrders(); // Auto refresh
      });

      socket.on('ORDER_STATUS_UPDATED', (data) => {
        fetchOrders(); // Auto refresh when driver picks up or delivers
      });

      return () => {
        socket.off('NEW_ORDER');
        socket.off('ORDER_STATUS_UPDATED');
        socket.disconnect();
      };
    }
  }, [profile, user]);

  const updateStatus = async (orderId, newStatus) => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const { data } = await axios.put(`http://localhost:5001/api/orders/${orderId}/status`, { status: newStatus }, config);
      if (data.success) {
        notification.success({ message: `Order marked as ${newStatus}` });
        fetchOrders(); // Refresh
      }
    } catch (error) {
      notification.error({ message: 'Error updating order status' });
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending': return <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-bold uppercase"><ClockCircleOutlined className="mr-1"/> Pending</span>;
      case 'accepted': return <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold uppercase"><CheckCircleOutlined className="mr-1"/> Accepted</span>;
      case 'preparing': return <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-bold uppercase"><SyncOutlined spin className="mr-1"/> Preparing</span>;
      case 'picked_up': return <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-bold uppercase"><CarOutlined className="mr-1"/> On the Way</span>;
      case 'delivered': return <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold uppercase"><CheckCircleOutlined className="mr-1"/> Delivered</span>;
      case 'cancelled': return <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold uppercase"><CloseCircleOutlined className="mr-1"/> Cancelled</span>;
      default: return <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-bold uppercase">{status}</span>;
    }
  };

  if (loading) return <div className="py-20 text-center">Loading orders...</div>;

  return (
    <div className="animate-fade-in max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Order Management</h1>
        <button onClick={fetchOrders} className="btn-secondary px-4 py-2 text-sm"><SyncOutlined /> Refresh</button>
      </div>

      <div className="bg-white rounded-2xl shadow-soft overflow-hidden">
        {orders.length > 0 ? (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b text-gray-500 text-sm uppercase tracking-wide">
                <th className="p-4 font-semibold">Order ID</th>
                <th className="p-4 font-semibold">Customer</th>
                <th className="p-4 font-semibold">Items</th>
                <th className="p-4 font-semibold">Total</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(order => (
                <tr key={order.id} className="border-b hover:bg-gray-50 transition-colors">
                  <td className="p-4 font-medium text-gray-800">#{order.id.slice(0, 8)}</td>
                  <td className="p-4">
                    <div className="font-medium text-gray-800">{order.Customer?.User?.full_name || 'Customer'}</div>
                    <div className="text-xs text-gray-500">{order.Customer?.User?.phone_number || 'N/A'}</div>
                  </td>
                  <td className="p-4">
                    <div className="text-sm text-gray-600 max-w-[200px] truncate">
                      {order.OrderItems?.map(item => `${item.quantity}x ${item.MenuItem?.name}`).join(', ') || 'Items'}
                    </div>
                  </td>
                  <td className="p-4 font-bold text-gray-800">{order.total_amount?.toLocaleString()}đ</td>
                  <td className="p-4">{getStatusBadge(order.status)}</td>
                  <td className="p-4">
                    <div className="flex flex-col gap-2">
                      {order.status === 'pending' && (
                        <button onClick={() => updateStatus(order.id, 'accepted')} className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-xs font-bold transition-colors">Accept Order</button>
                      )}
                      {order.status === 'accepted' && (
                        <button onClick={() => updateStatus(order.id, 'preparing')} className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded text-xs font-bold transition-colors">Start Preparing</button>
                      )}
                      {order.status === 'preparing' && !order.delivery_partner_id && (
                        <div className="text-[10px] text-orange-600 font-bold italic">Waiting for Driver...</div>
                      )}
                      {order.status === 'cancelled' && (
                        <div className="text-[10px] text-red-500 font-bold">CANCELLED</div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-10 text-center text-gray-500">No orders found.</div>
        )}
      </div>
    </div>
  );
}
