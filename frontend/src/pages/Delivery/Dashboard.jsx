import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import axios from '../../api/axios';

export default function DeliveryDashboard() {
  const { profile, token } = useSelector(state => state.auth);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const { data } = await axios.get('/orders/driver/me/history');
        
        if (data.success) {
          setHistory(data.data);
        }
      } catch (error) {
        console.error('Error fetching driver history:', error);
      } finally {
        setLoading(false);
      }
    };

    if (profile?.id && token) {
      fetchHistory();
    }
  }, [profile, token]);

  // Calculations
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const todayOrders = history.filter(o => new Date(o.updated_at) >= today);
  const monthOrders = history.filter(o => new Date(o.updated_at) >= startOfMonth);

  const todayEarnings = todayOrders.reduce((sum, order) => sum + (parseFloat(order.delivery_fee) || 15000), 0);
  const monthEarnings = monthOrders.reduce((sum, order) => sum + (parseFloat(order.delivery_fee) || 15000), 0);

  // Bonus KPI Calculation
  const dailyOrdersCount = todayOrders.length;
  const kpiTarget = 15;
  
  const milestones = [
    { count: 5, reward: '10,000đ' },
    { count: 10, reward: '30,000đ' },
    { count: 15, reward: '60,000đ' },
  ];

  if (loading) return <div className="py-20 text-center">Loading dashboard metrics...</div>;

  return (
    <div className="animate-fade-in max-w-6xl mx-auto space-y-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Driver Performance Dashboard</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-500">License:</span>
          <span className="bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-xs font-bold">
            {profile?.vehicle_license || 'N/A'}
          </span>
          <span className={`${profile?.is_available ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'} px-3 py-1 rounded-full text-xs font-bold uppercase`}>
            {profile?.is_available ? 'Available' : 'Unavailable'}
          </span>
        </div>
      </div>

      {/* Main Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-soft border-l-4 border-primary">
          <h3 className="text-gray-500 font-medium text-sm uppercase tracking-wide text-primary">Orders Completed Today</h3>
          <p className="text-3xl font-bold mt-2 text-gray-800">{dailyOrdersCount}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-soft border-l-4 border-green-500">
          <h3 className="text-gray-500 font-medium text-sm uppercase tracking-wide text-green-600">Earnings Today</h3>
          <p className="text-3xl font-bold mt-2 text-gray-800">{todayEarnings.toLocaleString()}đ</p>
        </div>
      </div>

      {/* Daily KPI / Bonus Progress */}
      <div className="bg-white p-8 rounded-2xl shadow-soft border border-gray-100">
        <div className="flex justify-between items-end mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Daily Target Bonus</h2>
            <p className="text-gray-500 text-sm mt-1">Complete deliveries to earn daily reward bonuses.</p>
          </div>
          <span className="text-2xl font-bold text-primary">{dailyOrdersCount} / {kpiTarget} Orders</span>
        </div>

        {/* Progress Bar Container */}
        <div className="relative w-full h-4 bg-gray-100 rounded-full mb-8">
          <div 
            className="absolute top-0 left-0 h-full bg-primary rounded-full transition-all duration-1000 ease-out"
            style={{ width: `${Math.min((dailyOrdersCount / 15) * 100, 100)}%` }} // Scaled to max visual target 15
          ></div>

          {/* Milestone markers */}
          {milestones.map((m) => {
            const isReached = dailyOrdersCount >= m.count;
            const leftPercent = (m.count / 15) * 100;
            return (
              <div 
                key={m.count} 
                className="absolute top-1/2 -translate-y-1/2" 
                style={{ left: `${leftPercent}%` }}
              >
                <div className={`w-6 h-6 rounded-full border-4 shadow-md flex items-center justify-center bg-white ${isReached ? 'border-primary' : 'border-gray-200'}`}>
                  {isReached && <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />}
                </div>
                <div className={`absolute top-8 ${m.count === 15 ? 'right-0 text-right' : 'left-1/2 -translate-x-1/2 text-center'} w-24`}>
                  <p className="text-[10px] md:text-xs font-bold text-gray-700">{m.count} Orders</p>
                  <p className={`text-[10px] font-bold ${isReached ? 'text-green-600' : 'text-gray-400'}`}>+{m.reward}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Deliveries */}
      <div className="bg-white p-8 rounded-2xl shadow-soft border border-gray-100 mt-12 pb-14">
        <h2 className="text-xl font-bold mb-6 text-gray-800">Recent Completed Deliveries</h2>
        
        {history.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b text-gray-400 text-sm uppercase">
                  <th className="py-3 font-semibold">Order ID</th>
                  <th className="py-3 font-semibold">Restaurant</th>
                  <th className="py-3 font-semibold">Earnings</th>
                  <th className="py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {history.slice(0, 5).map(order => (
                  <tr key={order.id} className="border-b hover:bg-gray-50 transition-colors text-sm">
                    <td className="py-4 font-bold text-gray-700">#{order.id.slice(0, 8)}</td>
                    <td className="text-gray-600">{order.Restaurant?.name || 'Unknown Restaurant'}</td>
                    <td className="text-primary font-bold">{(parseFloat(order.delivery_fee) || 15000).toLocaleString()}đ</td>
                    <td>
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-[10px] font-bold uppercase tracking-wider">
                        Completed
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-10">
            <span className="text-4xl mb-4 block">🏆</span>
            <p className="text-gray-500 italic">No completed deliveries yet. Accept orders to build your history!</p>
          </div>
        )}
      </div>
    </div>
  );
}
