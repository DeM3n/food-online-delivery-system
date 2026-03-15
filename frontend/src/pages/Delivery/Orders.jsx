import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import { notification, Modal } from 'antd';
import { 
  ShopOutlined, 
  EnvironmentOutlined, 
  RocketOutlined, 
  ReloadOutlined,
  CheckCircleOutlined,
  PhoneOutlined,
  CarOutlined,
  ArrowRightOutlined,
  UserOutlined
} from '@ant-design/icons';
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
        axios.get('http://localhost:5001/api/orders/deliveries/available', config),
        axios.get(`http://localhost:5001/api/orders/driver/me`, config)
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

      socket.connect();
      socket.emit('join_deliveries');

      socket.on('AVAILABLE_DELIVERY', (data) => {
        notification.info({
          message: 'New Delivery Available!',
          description: `A new order from ${data.restaurantName} is ready for pickup.`,
          placement: 'topRight'
        });
        fetchDeliveries();
      });

      socket.on('ORDER_ACCEPTED', () => {
        fetchDeliveries();
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
      const { data } = await axios.put(`http://localhost:5001/api/orders/${orderId}/accept-delivery`, { driver_id: profile.id }, config);
      if (data.success) {
        notification.success({ message: 'Delivery Accepted!' });
        fetchDeliveries();
      }
    } catch (error) {
      notification.error({ message: error.response?.data?.message || 'Error accepting delivery' });
      console.error('Error accepting delivery:', error);
    }
  };

  const updateStatus = async (orderId, newStatus) => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const { data } = await axios.put(`http://localhost:5001/api/orders/${orderId}/status`, { status: newStatus }, config);
      if (data.success) {
        notification.success({ message: `Order marked as ${newStatus}!` });
        fetchDeliveries();
      }
    } catch (error) {
      notification.error({ message: 'Error updating status' });
      console.error('Error updating status:', error);
    }
  };

  if (loading) return (
    <div className="py-20 text-center flex flex-col items-center">
      <ReloadOutlined spin className="text-3xl text-primary mb-4" />
      <p className="text-gray-400 font-medium">Syncing delivery operations...</p>
    </div>
  );

  return (
    <div className="animate-fade-in max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Delivery Operations</h1>
          <p className="text-gray-500 font-medium">Manage your active deliveries and find new opportunities</p>
        </div>
        <button onClick={fetchDeliveries} className="flex items-center gap-2 bg-white border border-gray-100 px-6 py-3 rounded-2xl text-sm font-bold shadow-soft hover:bg-gray-50 transition-colors">
          <ReloadOutlined className={loading ? 'animate-spin' : ''} /> 
          Refresh Orders
        </button>
      </div>

      {activeDelivery ? (
        <div className="bg-white p-10 rounded-[2.5rem] shadow-soft border-2 border-primary relative overflow-hidden">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 mb-10 relative z-10">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <span className="bg-primary text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg shadow-primary/20">Active Task</span>
              </div>
              <h2 className="text-3xl font-black text-gray-800 tracking-tighter">Order #{activeDelivery.id.slice(0, 8).toUpperCase()}</h2>
            </div>
            
            <button 
              onClick={() => {
                Modal.confirm({
                  title: 'Confirm Delivery',
                  icon: <CheckCircleOutlined className="text-green-500" />,
                  content: 'Have you safely handed over the order to the customer?',
                  okText: 'Yes, Delivered',
                  cancelText: 'Cancel',
                  okButtonProps: { className: 'bg-green-500 border-none' },
                  onOk: () => updateStatus(activeDelivery.id, 'delivered')
                });
              }}
              className="bg-green-500 hover:bg-green-600 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl transition-all"
            >
              Finish Delivery
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-gray-50 rounded-3xl p-8 border border-gray-100">
              <h3 className="font-black text-gray-400 uppercase text-[10px] tracking-widest mb-4">Pickup</h3>
              <p className="font-black text-xl text-gray-900 mb-2">{activeDelivery.Restaurant?.name}</p>
              <p className="text-sm text-gray-500 line-clamp-2">📍 {activeDelivery.Restaurant?.address || 'Restaurant Address Unknown'}</p>
            </div>

            <div className="bg-gray-50 rounded-3xl p-8 border border-gray-100">
              <h3 className="font-black text-gray-400 uppercase text-[10px] tracking-widest mb-4">Dropoff</h3>
              <p className="font-black text-xl text-gray-900 mb-2">{activeDelivery.Customer?.User?.full_name || 'Customer'}</p>
              <p className="text-sm text-gray-500 mb-4">📍 {activeDelivery.Address?.street}, {activeDelivery.Address?.city}</p>
              <div className="flex items-center gap-2 text-primary font-bold bg-white w-fit px-3 py-1 rounded-lg border border-gray-100 text-sm">
                <PhoneOutlined /> {activeDelivery.Customer?.User?.phone_number || 'N/A'}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white p-10 rounded-[2.5rem] shadow-soft border border-gray-100">
          <div className="flex items-center gap-3 mb-8">
            <RocketOutlined className="text-primary text-xl" />
            <h2 className="text-xl font-bold text-gray-800 tracking-tight">Available Orders</h2>
          </div>

          {availableRequests.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {availableRequests.map(req => (
                <div key={req.id} className="group bg-white border border-gray-100 hover:border-primary/30 rounded-[2rem] p-8 shadow-sm hover:shadow-xl transition-all flex flex-col justify-between h-full relative overflow-hidden">
                  <div>
                    <div className="flex justify-between items-center mb-6">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-gray-400 font-black uppercase mb-1">Order Ref</span>
                        <code className="text-xs font-mono text-gray-500 bg-gray-50 px-2 py-1 rounded-lg">#{req.id.slice(0, 8).toUpperCase()}</code>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-gray-400 font-black uppercase mb-1 block">Earning</span>
                        <div className="text-2xl font-black text-primary tracking-tighter">
                          {(req.delivery_fee || 15000).toLocaleString()}đ
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-4 mb-8">
                      <div className="flex items-start gap-4">
                        <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-orange-500 shrink-0">
                          <ShopOutlined />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-gray-400 uppercase mb-0.5">Pickup</p>
                          <p className="font-bold text-gray-800 text-sm">{req.Restaurant?.name}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-4">
                        <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center text-green-500 shrink-0">
                          <EnvironmentOutlined />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-gray-400 uppercase mb-0.5">Dropoff</p>
                          <p className="font-bold text-gray-800 text-sm">{req.Address?.street || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => acceptRequest(req.id)}
                    className="w-full bg-slate-900 hover:bg-primary text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg transition-all flex items-center justify-center gap-2"
                  >
                    Accept Delivery <ArrowRightOutlined />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-gray-50/50 rounded-[2.5rem] border-2 border-dashed border-gray-200">
              <CarOutlined className="text-4xl text-gray-300 mb-4" />
              <h3 className="text-lg font-bold text-gray-700">No active orders</h3>
              <p className="text-gray-500 mt-2 text-sm">New orders will appear here automatically.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
