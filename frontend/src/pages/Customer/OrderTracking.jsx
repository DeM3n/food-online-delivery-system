import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import axios from '../../api/axios';
import socket from '../../socket';
import { 
  CheckCircleFilled, 
  ClockCircleOutlined, 
  CarOutlined, 
  ShopOutlined, 
  CheckOutlined,
  CloseCircleOutlined,
  PhoneOutlined
} from '@ant-design/icons';
import { message, Modal } from 'antd';

const ORDER_STEPS = [
  { id: 'pending', label: 'Order Placed', icon: <ClockCircleOutlined /> },
  { id: 'accepted', label: 'Restaurant Accepted', icon: <ShopOutlined /> },
  { id: 'preparing', label: 'Preparing Order', icon: <ClockCircleOutlined /> },
  { id: 'picked_up', label: 'On the Way', icon: <CarOutlined /> },
  { id: 'delivered', label: 'Delivered', icon: <CheckOutlined /> }
];

const OrderTracking = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user, token } = useSelector((state) => state.auth);

  useEffect(() => {
    if (token) {
      fetchOrders();
    }

    socket.on('ORDER_STATUS_UPDATED', (data) => {
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === data.orderId 
            ? { 
                ...order, 
                status: data.status,
                delivery_partner_id: data.deliveryPartner ? data.deliveryPartner.id : order.delivery_partner_id,
                DeliveryPartner: data.deliveryPartner || order.DeliveryPartner
              } 
            : order
        )
      );
      if (data.status === 'cancelled') {
        message.warning(`Order #${data.orderId.slice(0, 8)} has been cancelled.`);
      } else if (data.status === 'delivered') {
        message.success(`Great! Order #${data.orderId.slice(0, 8)} has arrived!`);
      } else if (data.status === 'completed') {
        // When completed, we might want to refresh to move it to history
        fetchOrders();
      } else {
        message.success(`Order #${data.orderId.slice(0, 8)} status updated to ${data.status.replace('_', ' ')}`);
      }
    });

    return () => {
      socket.off('ORDER_STATUS_UPDATED');
    };
  }, [user?.id, token]);

  const handleAcknowledge = async (orderId) => {
    try {
      await axios.put(`/orders/${orderId}/status`, { status: 'completed' });
      message.success('Tracking closed. You can view this order in history.');
      fetchOrders();
    } catch (error) {
      message.error('Failed to close tracking');
    }
  };

  const fetchOrders = async () => {
    if (!token) return;
    
    try {
      setLoading(true);
      const response = await axios.get('/orders/me');
      if (response.data.success) {
        setOrders(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      // Only show error message if we still have a token (meaning it's a real API failure, not just a logout)
      if (token) {
        message.error('Failed to load orders');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = (orderId) => {
    Modal.confirm({
      title: 'Cancel Order',
      content: 'Are you sure you want to cancel this order?',
      okText: 'Yes, Cancel',
      okType: 'danger',
      cancelText: 'No',
      onOk: async () => {
        try {
          const response = await axios.put(`/orders/${orderId}/cancel`, {});
          if (response.data.success) {
            message.success('Order cancelled successfully');
            setOrders(prevOrders => 
              prevOrders.map(order => 
                order.id === orderId ? { ...order, status: 'cancelled' } : order
              )
            );
          }
        } catch (error) {
          message.error(error.response?.data?.message || 'Failed to cancel order');
        }
      }
    });
  };

  const getStepStatus = (orderStatus, stepId) => {
    if (orderStatus === 'cancelled') return 'cancelled';
    if (orderStatus === 'completed') return 'completed';
    
    const stepIndex = ORDER_STEPS.findIndex(s => s.id === stepId);
    const currentIndex = ORDER_STEPS.findIndex(s => s.id === orderStatus);
    
    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'current';
    return 'upcoming';
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading tracking info...</div>;
  }

  const activeOrders = orders.filter(o => 
    o.status !== 'completed' && o.status !== 'cancelled'
  );

  return (
    <div className="max-w-4xl mx-auto p-4 animate-fade-in">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">Track Your Orders</h1>

      {activeOrders.length === 0 && (
        <div className="text-center py-20 bg-white rounded-2xl shadow-soft">
          <ClockCircleOutlined className="text-6xl text-gray-300 mb-4" />
          <p className="text-gray-500 text-lg">You have no active orders to track right now.</p>
        </div>
      )}

      {/* Active Orders Section */}
      <div className="space-y-8 mb-12">
        {activeOrders.map(order => (
          <div key={order.id} className="bg-white rounded-2xl shadow-soft overflow-hidden border border-gray-100">
            {/* Header info */}
            <div className="p-6 bg-gray-50 flex justify-between items-center border-b border-gray-100">
              <div>
                <h3 className="text-lg font-bold text-gray-800">{order.Restaurant?.name}</h3>
                <p className="text-sm text-gray-500">Order ID: #{order.id.slice(0, 8)}</p>
              </div>
              <div className="text-right">
                <span className={`badge badge-${order.status === 'pending' ? 'pending' : (order.status === 'preparing' ? 'preparing' : (['picked_up', 'delivering'].includes(order.status) ? 'delivering' : 'completed'))}`}>
                  {['picked_up', 'delivering'].includes(order.status) ? 'ON THE WAY' : (order.status === 'delivered' ? 'ARRIVED!' : order.status.replace('_', ' ').toUpperCase())}
                </span>
              </div>
            </div>

            {/* Timeline or Cancelled Status */}
            <div className="p-8">
              {order.status === 'cancelled' ? (
                <div className="flex flex-col items-center py-4 bg-red-50 rounded-xl border border-red-100">
                  <CloseCircleOutlined className="text-4xl text-red-500 mb-2" />
                  <h3 className="text-xl font-bold text-red-700 uppercase">Order Cancelled</h3>
                  <p className="text-red-500 text-sm">This order has been cancelled and is now read-only.</p>
                </div>
              ) : (
                <div className="relative flex justify-between">
                  {/* Connecting lines */}
                  <div className="absolute top-5 left-0 w-full h-0.5 bg-gray-200 -z-0">
                    <div 
                      className="h-full bg-primary transition-all duration-1000" 
                      style={{ 
                        width: `${(ORDER_STEPS.findIndex(s => s.id === order.status) / (ORDER_STEPS.length - 1)) * 100}%` 
                      }}
                    />
                  </div>

                  {ORDER_STEPS.map((step, idx) => {
                    const status = getStepStatus(order.status, step.id);
                    return (
                      <div key={step.id} className="relative z-10 flex flex-col items-center w-1/6">
                        <div className={`
                          w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300
                          ${status === 'completed' ? 'bg-primary border-primary text-white' : 
                            status === 'current' ? 'bg-white border-primary text-primary scale-110 shadow-lg ring-4 ring-orange-50' : 
                            'bg-white border-gray-200 text-gray-400'}
                        `}>
                          {status === 'completed' ? <CheckOutlined /> : step.icon}
                        </div>
                        <span className={`mt-3 text-[10px] md:text-sm font-medium text-center leading-tight
                          ${status === 'completed' || status === 'current' ? 'text-gray-800' : 'text-gray-400'}
                        `}>
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Order Content & Driver Info */}
            <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-2">Order Items</h4>
                <ul className="text-sm text-gray-600 space-y-2 border-b border-gray-100 pb-3 mb-3">
                  {order.OrderItems?.map(item => (
                    <li key={item.id} className="flex justify-between">
                      <span>{item.quantity}x {item.MenuItem?.name}</span>
                      <span className="font-medium text-gray-800">{parseFloat(item.subtotal).toLocaleString()}đ</span>
                    </li>
                  ))}
                </ul>
                <div className="space-y-1 text-sm bg-gray-100/50 p-2 rounded-lg">
                  <div className="flex justify-between text-gray-500">
                    <span>Subtotal</span>
                    <span>{parseFloat(order.subtotal || 0).toLocaleString()}đ</span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>Delivery Fee</span>
                    <span>{parseFloat(order.delivery_fee || 0).toLocaleString()}đ</span>
                  </div>
                  <div className="flex justify-between font-bold text-gray-800 text-base pt-1 border-t border-gray-200 mt-1">
                    <span>Total Amount</span>
                    <span className="text-primary">{parseFloat(order.total_amount).toLocaleString()}đ</span>
                  </div>
                </div>
              </div>

              {order.delivery_partner_id && (
                <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 h-fit">
                  <h4 className="text-sm font-bold text-orange-800 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <CarOutlined /> Driver Information
                  </h4>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-200 rounded-full flex items-center justify-center text-orange-700 font-bold">
                      {order.DeliveryPartner?.User?.full_name?.charAt(0) || 'D'}
                    </div>
                    <div>
                      <p className="font-bold text-gray-800">{order.DeliveryPartner?.User?.full_name || 'Assigned Driver'}</p>
                      <p className="text-sm text-gray-600 flex items-center gap-1">
                        <PhoneOutlined /> {order.DeliveryPartner?.User?.phone_number || 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 text-xs text-orange-700 font-medium">
                    Status: <span className="capitalize">{['picked_up', 'delivering'].includes(order.status) ? 'On the Way' : (order.status === 'delivered' ? 'Delivered (Waiting for your confirmation)' : order.status)}</span>
                  </div>
                  
                  {/* Customer Confirmation Button - Only shown when order is actually delivered */}
                  {order.status === 'delivered' && (
                    <button 
                      onClick={() => {
                        Modal.confirm({
                          title: 'Confirm Receipt',
                          content: 'Have you received your order correctly? This will close the tracking and move it to history.',
                          okText: 'Yes, Received',
                          cancelText: 'Not Yet',
                          onOk: () => handleAcknowledge(order.id)
                        });
                      }}
                      className="w-full mt-4 bg-primary text-white font-bold py-3 px-4 rounded-xl shadow-lg hover:bg-orange-600 transition-all flex items-center justify-center gap-2"
                    >
                      <CheckOutlined /> Confirm I Received Order
                    </button>
                  )}
                </div>
              )}

              {/* Cancel Button */}
              {['pending', 'accepted'].includes(order.status) && (
                <div className="md:col-span-2 mt-2">
                  <button 
                    onClick={() => handleCancelOrder(order.id)}
                    className="text-red-500 hover:text-red-700 font-bold text-sm flex items-center gap-1 transition-colors"
                  >
                    <CloseCircleOutlined /> Cancel Order
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OrderTracking;
