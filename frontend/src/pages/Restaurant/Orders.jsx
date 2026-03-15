import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import axios from '../../api/axios';
import { notification } from 'antd';
import { CheckCircleOutlined, SyncOutlined, ClockCircleOutlined, CarOutlined, CloseCircleOutlined } from '@ant-design/icons';
import socket from '../../socket';

export default function RestaurantOrders() {
  const { profile, token, user } = useSelector(state => state.auth);
  const [orders, setOrders] = useState([]);
  const [counts, setCounts] = useState({
    pending: 0,
    accepted: 0,
    preparing: 0,
    picked_up: 0,
    delivered: 0
  });
  const [selectedStatus, setSelectedStatus] = useState('pending');
  const [loading, setLoading] = useState(true);

  const fetchOrders = async (status = selectedStatus) => {
    try {
      setLoading(true);
      const { data } = await axios.get(`/orders/restaurant/me?status=${status}`);
      if (data.success) {
        setOrders(data.data);
        if (data.counts) {
          setCounts(data.counts);
        }
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
  }, [profile, user, selectedStatus]);

  const handleStatusChange = (status) => {
    setSelectedStatus(status);
    fetchOrders(status);
  };

  const updateStatus = async (orderId, newStatus) => {
    try {
      const { data } = await axios.put(`/orders/${orderId}/status`, { status: newStatus });
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
      case 'delivered':
      case 'completed': return <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold uppercase"><CheckCircleOutlined className="mr-1"/> Delivered</span>;
      case 'cancelled': return <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold uppercase"><CloseCircleOutlined className="mr-1"/> Cancelled</span>;
      default: return <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-bold uppercase">{status}</span>;
    }
  };

  const tabs = [
    { key: 'pending', label: 'Pending', icon: <ClockCircleOutlined /> },
    { key: 'accepted', label: 'Accepted', icon: <CheckCircleOutlined /> },
    { key: 'preparing', label: 'Preparing', icon: <SyncOutlined /> },
    { key: 'picked_up', label: 'On the way', icon: <CarOutlined /> },
    { key: 'delivered', label: 'Delivered', icon: <CheckCircleOutlined /> },
  ];

  return (
    <div className="animate-fade-in max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Order Management</h1>
        <button onClick={() => fetchOrders()} className="btn-secondary px-4 py-2 text-sm"><SyncOutlined /> Refresh</button>
      </div>

      {/* Status Tabs */}
      <div className="flex border-b border-gray-200 mb-6 bg-white rounded-t-2xl px-2 pt-2">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => handleStatusChange(tab.key)}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-bold transition-all relative ${
              selectedStatus === tab.key 
                ? 'text-primary' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] ${
              selectedStatus === tab.key ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500'
            }`}>
              {counts[tab.key] || 0}
            </span>
            {selectedStatus === tab.key && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full shadow-[0_-2px_10px_rgba(255,107,0,0.4)]"></div>
            )}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-b-2xl shadow-soft overflow-hidden min-h-[400px]">
        {loading ? (
          <div className="py-20 text-center text-gray-400 flex flex-col items-center">
            <SyncOutlined spin className="text-4xl mb-4 text-primary opacity-20" />
            <p className="font-medium">Loading {selectedStatus} orders...</p>
          </div>
        ) : orders.length > 0 ? (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b text-gray-500 text-sm uppercase tracking-wide">
                <th className="p-4 font-semibold text-center w-20">#</th>
                <th className="p-4 font-semibold">Order Details</th>
                <th className="p-4 font-semibold">Customer</th>
                <th className="p-4 font-semibold">Amount</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(order => (
                <tr key={order.id} className="border-b hover:bg-gray-50 transition-colors group">
                  <td className="p-4 font-medium text-gray-800 text-center">
                    <span className="bg-gray-100 px-2 py-1 rounded text-[10px] font-mono">
                      {order.id.slice(0, 8).toUpperCase()}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="text-sm font-bold text-gray-800">
                      {order.OrderItems?.length} {order.OrderItems?.length === 1 ? 'Item' : 'Items'}
                    </div>
                    <div className="text-xs text-gray-500 max-w-[250px] truncate group-hover:whitespace-normal group-hover:overflow-visible transition-all">
                      {order.OrderItems?.map(item => `${item.quantity}x ${item.MenuItem?.name}`).join(', ') || 'Items'}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="font-bold text-gray-800 text-sm">{order.Customer?.User?.full_name || 'Customer'}</div>
                    <div className="text-xs text-gray-500">{order.Customer?.User?.phone_number || 'N/A'}</div>
                  </td>
                  <td className="p-4">
                    <div className="font-black text-gray-900">{order.total_amount?.toLocaleString()}đ</div>
                    <div className="text-[10px] text-gray-400 uppercase font-bold">{order.payment_method}</div>
                  </td>
                  <td className="p-4">{getStatusBadge(order.status)}</td>
                  <td className="p-4 text-right">
                    <div className="flex flex-col gap-2 items-end">
                      {order.status === 'pending' && (
                        <button onClick={() => updateStatus(order.id, 'accepted')} className="btn-primary py-1 px-4 text-[11px] uppercase tracking-wider">Accept</button>
                      )}
                      {order.status === 'accepted' && (
                        <button onClick={() => updateStatus(order.id, 'preparing')} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider shadow-sm transition-all hover:scale-105">Start Prep</button>
                      )}
                      {order.status === 'preparing' && !order.delivery_partner_id && (
                        <div className="flex items-center gap-1.5 text-[11px] text-orange-600 font-bold bg-orange-50 px-3 py-1 rounded-full border border-orange-100">
                          <SyncOutlined spin /> Searching for Driver
                        </div>
                      )}
                      {order.status === 'picked_up' && (
                        <div className="text-[11px] text-indigo-600 font-bold bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
                          Out for Delivery
                        </div>
                      )}
                      {(order.status === 'delivered' || order.status === 'completed') && (
                        <div className="text-[11px] text-green-600 font-bold bg-green-50 px-3 py-1 rounded-full border border-green-100">
                          Completed
                        </div>
                      )}
                      {order.status === 'cancelled' && (
                        <div className="text-[11px] text-red-500 font-bold bg-red-50 px-3 py-1 rounded-full border border-red-100">
                          Cancelled
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-20 text-center flex flex-col items-center">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4 text-gray-300">
              <ClockCircleOutlined className="text-3xl" />
            </div>
            <h3 className="text-gray-800 font-bold mb-1">No {selectedStatus} orders</h3>
            <p className="text-gray-400 text-sm">When new orders arrive, they will appear here.</p>
          </div>
        )}
      </div>
    </div>
  );
}
