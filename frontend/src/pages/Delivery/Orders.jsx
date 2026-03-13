import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import { notification } from 'antd';
import socket from '../../socket';

export default function DeliveryOrders() {
  const { profile, token } = useSelector(state => state.auth);
  const [availableRequests, setAvailableRequests] = useState([]);
  const [activeDelivery, setActiveDelivery] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDeliveries = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const [availableRes, activeRes] = await Promise.all([
        axios.get('http://localhost:5000/api/orders/deliveries/available', config),
        axios.get(`http://localhost:5000/api/orders/driver/${profile.id}`, config)
      ]);
      
      if (availableRes.data.success) {
        setAvailableRequests(availableRes.data.data);
      }
      if (activeRes.data.success) {
        setActiveDelivery(activeRes.data.data[0] || null);
      }
    } catch (error) {
      console.error('Error fetching deliveries:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile?.id && token) {
      fetchDeliveries();

      // Real-time notifications for drivers
      socket.connect();
      socket.emit('join_deliveries');

      socket.on('AVAILABLE_DELIVERY', (data) => {
        notification.info({
          message: 'New Delivery Available!',
          description: `A new order from ${data.restaurantName} is ready for pickup.`,
          placement: 'topRight'
        });
        fetchDeliveries(); // Auto refresh
      });

      socket.on('ORDER_ACCEPTED', () => {
        fetchDeliveries(); // Refresh to remove the order that was taken by someone else
      });

      return () => {
        socket.off('AVAILABLE_DELIVERY');
        socket.off('ORDER_ACCEPTED');
        socket.disconnect();
      };
    }
  }, [profile, token]);

  const acceptRequest = async (orderId) => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const { data } = await axios.put(`http://localhost:5000/api/orders/${orderId}/accept-delivery`, { driver_id: profile.id }, config);
      if (data.success) {
        notification.success({ message: 'Delivery Accepted!' });
        fetchDeliveries();
      }
    } catch (error) {
      notification.error({ message: error.response?.data?.message || 'Error accepting delivery' });
      console.error('Error accepting delivery:', error);
    }
  };

  const markAsDelivered = async (orderId) => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const { data } = await axios.put(`http://localhost:5000/api/orders/${orderId}/status`, { status: 'delivered' }, config);
      if (data.success) {
        notification.success({ message: 'Order Delivered!' });
        fetchDeliveries();
      }
    } catch (error) {
      notification.error({ message: 'Error updating status' });
      console.error('Error updating status:', error);
    }
  };

  if (loading) return <div className="py-20 text-center">Loading delivery operations...</div>;

  return (
    <div className="animate-fade-in max-w-6xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">Delivery Operations</h1>
        <button onClick={fetchDeliveries} className="btn-secondary px-6 py-2 text-sm font-bold">↻ Refresh Orders</button>
      </div>

      {activeDelivery ? (
        <div className="bg-white p-8 rounded-2xl shadow-soft border-2 border-primary mb-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold uppercase mb-2 inline-block">Active Delivery</span>
              <h2 className="text-2xl font-bold text-gray-800">Order #{activeDelivery.id.slice(0, 8)}</h2>
            </div>
            <button 
              onClick={() => markAsDelivered(activeDelivery.id)}
              className="bg-green-500 hover:bg-green-600 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-md"
            >
              Mark as Delivered
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 rounded-xl p-6">
            <div className="space-y-4">
              <h3 className="font-bold text-gray-700 pb-2 border-b border-gray-200">Pickup Location</h3>
              <p className="font-bold text-lg text-gray-800">{activeDelivery.Restaurant?.name}</p>
              <p className="text-gray-500 text-sm">📍 {activeDelivery.Restaurant?.address || 'Restaurant Address Unknown'}</p>
            </div>
            <div className="space-y-4">
              <h3 className="font-bold text-gray-700 pb-2 border-b border-gray-200">Dropoff Location</h3>
              <p className="font-bold text-lg text-gray-800">{activeDelivery.Customer?.User?.full_name || 'Customer'}</p>
              <p className="text-gray-500 text-sm">📍 {activeDelivery.Address?.street}, {activeDelivery.Address?.city}</p>
              <p className="text-gray-500 text-sm">📞 {activeDelivery.Customer?.User?.phone_number || 'N/A'}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white p-8 rounded-2xl shadow-soft border border-gray-100">
          <h2 className="text-xl font-bold mb-6 text-gray-800">Available Orders</h2>

          {availableRequests.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {availableRequests.map(req => (
                <div key={req.id} className="bg-white border hover:border-primary transition-colors rounded-xl p-6 shadow-sm flex flex-col justify-between h-full">
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="font-bold text-lg text-gray-800">#{req.id.slice(0, 8)}</h3>
                      <span className="bg-orange-100 text-orange-700 font-bold px-3 py-1 rounded-full text-sm">
                        {(req.delivery_fee || 15000).toLocaleString()}đ
                      </span>
                    </div>
                    
                    <div className="space-y-3 mb-6">
                      <div className="flex items-start gap-3">
                        <span className="text-orange-500 mt-0.5">⬆️</span>
                        <div>
                          <p className="font-bold text-gray-800 text-sm">Pickup:</p>
                          <p className="text-gray-500 text-sm">{req.Restaurant?.name}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3">
                        <span className="text-green-500 mt-0.5">⬇️</span>
                        <div>
                          <p className="font-bold text-gray-800 text-sm">Dropoff:</p>
                          <p className="text-gray-500 text-sm">{req.Address?.street}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => acceptRequest(req.id)}
                    className="w-full btn-primary py-3 rounded-xl font-bold text-white shadow-md hover:-translate-y-0.5 transition-transform"
                  >
                    Accept Delivery
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
              <span className="text-5xl mb-4 block">🛵</span>
              <h3 className="text-xl font-bold text-gray-700">No available orders right now</h3>
              <p className="text-gray-500 mt-2">Take a break! New orders will appear here automatically.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
