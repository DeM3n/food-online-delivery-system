import React, { useState, useEffect } from 'react';
import axios from '../../api/axios';
import { useSelector } from 'react-redux';
import {
  SyncOutlined,
  ShopOutlined,
  UserOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  CarOutlined,
  FilterOutlined
} from '@ant-design/icons';

export default function AdminOrders() {
  const { token } = useSelector(state => state.auth);
  const [orders, setOrders] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('pending');
  const [counts, setCounts] = useState({
    pending: 0,
    accepted: 0,
    preparing: 0,
    picked_up: 0,
    delivered: 0,
    cancelled: 0
  });
  const [loading, setLoading] = useState(true);

  const fetchRestaurants = async () => {
    try {
      const response = await axios.get('/restaurants');
      if (response.data.success) {
        setRestaurants(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching restaurants:', error);
    }
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      let url = `/admin/orders?status=${selectedStatus}`;
      if (selectedRestaurant) url += `&restaurantId=${selectedRestaurant}`;

      const response = await axios.get(url);
      if (response.data.success) {
        setOrders(response.data.data);
        if (response.data.counts) {
          setCounts(response.data.counts);
        }
      }
    } catch (error) {
      console.error('Error fetching global orders:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRestaurants();
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [selectedRestaurant, selectedStatus]);

  const statusTabs = [
    { key: 'pending', label: 'Pending', icon: <ClockCircleOutlined />, color: 'text-yellow-500', bg: 'bg-yellow-50' },
    { key: 'accepted', label: 'Accepted', icon: <CheckCircleOutlined />, color: 'text-blue-500', bg: 'bg-blue-50' },
    { key: 'preparing', label: 'Preparing', icon: <SyncOutlined />, color: 'text-orange-500', bg: 'bg-orange-50' },
    { key: 'picked_up', label: 'On the way', icon: <CarOutlined />, color: 'text-indigo-500', bg: 'bg-indigo-50' },
    { key: 'delivered', label: 'Delivered', icon: <CheckCircleOutlined />, color: 'text-green-500', bg: 'bg-green-50' },
    { key: 'cancelled', label: 'Cancelled', icon: <CloseCircleOutlined />, color: 'text-red-500', bg: 'bg-red-50' },
  ];

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending': return <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-[10px] font-bold uppercase"><ClockCircleOutlined className="mr-1" /> Pending</span>;
      case 'accepted': return <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-[10px] font-bold uppercase"><CheckCircleOutlined className="mr-1" /> Accepted</span>;
      case 'preparing': return <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-[10px] font-bold uppercase"><SyncOutlined spin className="mr-1" /> Preparing</span>;
      case 'picked_up': return <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-[10px] font-bold uppercase"><CarOutlined className="mr-1" /> On the Way</span>;
      case 'delivered':
      case 'completed': return <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-[10px] font-bold uppercase"><CheckCircleOutlined className="mr-1" /> Delivered</span>;
      case 'cancelled': return <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-[10px] font-bold uppercase"><CloseCircleOutlined className="mr-1" /> Cancelled</span>;
      default: return <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-[10px] font-bold uppercase">{status}</span>;
    }
  };

  return (
    <div className="animate-fade-in max-w-6xl mx-auto p-4 md:p-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Global Order Tracking</h1>
          <p className="text-gray-500 font-medium">Monitor and manage all system transactions</p>
        </div>
        <div className="flex items-center gap-3 bg-white p-2.5 rounded-2xl shadow-soft border border-gray-100 w-full md:w-auto">
          <FilterOutlined className="text-primary ml-2" />
          <select
            className="outline-none bg-transparent text-sm font-bold text-gray-700 min-w-[220px] cursor-pointer"
            value={selectedRestaurant}
            onChange={(e) => setSelectedRestaurant(e.target.value)}
          >
            <option value="">All Restaurants</option>
            {restaurants.map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="flex flex-nowrap gap-3.5 items-center mb-7 overflow-x-auto pt-3 pb-5 no-scrollbar px-1">
        {statusTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setSelectedStatus(tab.key)}
            className={`flex items-center gap-2.7 px-5 py-3 rounded-2xl font-bold transition-all whitespace-nowrap border-2 ${selectedStatus === tab.key
              ? `${tab.bg} ${tab.color} border-current shadow-md scale-105 z-10`
              : 'bg-white text-gray-400 border-gray-50 hover:border-gray-100 hover:text-gray-500 shadow-sm'
              }`}
          >
            <span className="text-lg">{tab.icon}</span>
            <span className="text-[13px] tracking-tight">{tab.label}</span>
            <span className={`ml-1 text-[11px] px-2 py-0.5 rounded-full font-black ${selectedStatus === tab.key ? 'bg-white shadow-inner' : 'bg-gray-100'
              }`}>
              {counts[tab.key] || 0}
            </span>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-soft border border-gray-100 overflow-hidden min-h-[500px] mb-12">
        {loading ? (
          <div className="py-32 text-center flex flex-col items-center">
            <SyncOutlined spin className="text-4xl mb-4 text-primary/30" />
            <p className="font-bold text-gray-400 uppercase tracking-[0.2em] text-xs">Syncing Live Data</p>
          </div>
        ) : orders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b text-gray-400 text-[10px] uppercase tracking-[0.2em] font-black">
                  <th className="p-8">Order Logistics</th>
                  <th className="p-8">Partner Details</th>
                  <th className="p-8">Customer</th>
                  <th className="p-8">Financials</th>
                  <th className="p-8">Live Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {orders.map(order => (
                  <tr key={order.id} className="hover:bg-gray-50/80 transition-colors group">
                    <td className="p-8">
                      <div className="bg-gray-100 text-gray-500 px-3 py-1 rounded-lg text-[10px] font-mono inline-block mb-2 font-bold group-hover:bg-primary group-hover:text-white transition-colors">
                        #{order.id.slice(0, 8).toUpperCase()}
                      </div>
                      <div className="text-[10px] text-gray-400 font-black block uppercase tracking-widest">
                        {new Date(order.created_at).toLocaleDateString()} {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td className="p-8">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-500 border border-orange-100">
                          <ShopOutlined />
                        </div>
                        <span className="text-sm font-black text-gray-700 tracking-tight">{order.Restaurant?.name}</span>
                      </div>
                    </td>
                    <td className="p-8">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500 border border-blue-100">
                          <UserOutlined />
                        </div>
                        <span className="text-sm font-bold text-gray-600">{order.Customer?.User?.full_name}</span>
                      </div>
                    </td>
                    <td className="p-8">
                      <div className="text-base font-black text-gray-900 tracking-tighter">
                        {order.total_amount?.toLocaleString()}đ
                      </div>
                      <div className="text-[9px] text-gray-400 uppercase font-bold tracking-[0.15em] mt-1">
                        Pay via: <span className="text-primary">{order.payment_method}</span>
                      </div>
                    </td>
                    <td className="p-8">
                      {getStatusBadge(order.status)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-32 text-center text-gray-400 flex flex-col items-center">
            <div className="w-20 h-20 bg-gray-50 rounded-[2rem] flex items-center justify-center mb-6 shadow-inner border border-gray-100">
              <ClockCircleOutlined className="text-3xl text-gray-200" />
            </div>
            <h3 className="font-black text-gray-800 text-lg mb-2">No {selectedStatus} orders</h3>
            <p className="text-sm max-w-[250px] mx-auto text-gray-400 font-medium">There are currently no orders with this status for the selected criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
}
