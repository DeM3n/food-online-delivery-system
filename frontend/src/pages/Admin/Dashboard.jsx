import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/admin/stats');
        if (response.data.success) {
          setStats(response.data.data);
        }
      } catch (error) {
        console.error('Error fetching admin stats:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const statCards = [
    { label: "Total Users", value: stats?.totalUsers || 0, icon: "👤" },
    { label: "Active Restaurants", value: stats?.activeRestaurants || 0, icon: "🍕" },
    { label: "Delivery Partners", value: stats?.deliveryPartners || 0, icon: "🚴" },
    { label: "Platform Revenue", value: `${(stats?.totalRevenue || 0).toLocaleString()}đ`, icon: "💰", highlighted: true },
  ];

  if (loading) return <div className="py-20 text-center text-xl">Loading system stats...</div>;

  return (
    <div className="animate-fade-in">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">System Administration</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {statCards.map((card, i) => (
          <div key={i} className={`${card.highlighted ? 'bg-primary text-white shadow-orange' : 'bg-white text-gray-800'} p-6 rounded-2xl shadow-soft transition-transform hover:scale-105`}>
            <div className="flex justify-between items-start mb-4">
              <span className="text-2xl">{card.icon}</span>
              <h3 className={`${card.highlighted ? 'text-white/80' : 'text-gray-500'} text-xs font-bold uppercase tracking-wider`}>{card.label}</h3>
            </div>
            <p className="text-3xl font-bold">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Placeholder for chart or logs */}
        <div className="bg-white p-8 rounded-3xl shadow-soft h-64 flex items-center justify-center border border-gray-100">
          <p className="text-gray-400 font-medium">📈 System Traffic & Growth Chart</p>
        </div>
        <div className="bg-white p-8 rounded-3xl shadow-soft h-64 flex items-center justify-center border border-gray-100">
          <p className="text-gray-400 font-medium">📋 Recent System Events / Audit Log</p>
        </div>
      </div>
    </div>
  );
}
