import React, { useState, useEffect } from 'react';
import axios from '../../api/axios';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { UserOutlined, ShopOutlined, TeamOutlined, DollarOutlined, ArrowRightOutlined, HistoryOutlined, AuditOutlined } from '@ant-design/icons';

export default function AdminDashboard() {
  const { token } = useSelector(state => state.auth);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axios.get('/admin/stats');
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
  }, [token]);

  const statCards = [
    { label: "Total Users", value: stats?.totalUsers || 0, icon: <TeamOutlined />, color: "border-blue-500 text-blue-600" },
    { label: "Active Restaurants", value: stats?.activeRestaurants || 0, icon: <ShopOutlined />, color: "border-orange-500 text-orange-600" },
    { label: "Delivery Partners", value: stats?.deliveryPartners || 0, icon: <UserOutlined />, color: "border-teal-500 text-teal-600" },
    { label: "Platform Revenue", value: `${(stats?.totalRevenue || 0).toLocaleString()}đ`, icon: <DollarOutlined />, color: "border-green-500 text-green-600", highlighted: true },
  ];

  const adminActions = [
    { 
      title: "User Management", 
      desc: "View, edit, and manage system users and roles", 
      icon: <TeamOutlined />, 
      link: "/admin/users",
      gradient: "from-blue-500 to-indigo-600" 
    },
    { 
      title: "Global Order Tracking", 
      desc: "Monitor all active and past system orders", 
      icon: <HistoryOutlined />, 
      link: "/admin/orders",
      gradient: "from-orange-500 to-red-600" 
    },
    {
      title: "Pending Approvals",
      desc: "Review and process driver and restaurant registration requests",
      icon: <AuditOutlined />,
      link: "/admin/pending-approvals",
      gradient: "from-emerald-500 to-teal-600"
    },
  ];

  if (loading) return (
    <div className="py-20 text-center flex flex-col items-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
      <p className="text-gray-400 font-medium">Loading system stats...</p>
    </div>
  );

  return (
    <div className="animate-fade-in max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">System Administration</h1>
          <p className="text-gray-500 mt-1">Overview of your platform's health and activity</p>
        </div>
        <div className="bg-white px-4 py-2 rounded-2xl shadow-soft border border-gray-100 flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">System Live</span>
        </div>
      </div>

      {/* Primary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {statCards.map((card, i) => (
          <div key={i} className={`bg-white p-6 rounded-3xl shadow-soft border border-gray-100 relative overflow-hidden group hover:shadow-lg transition-all`}>
            <div className="relative z-10">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 bg-gray-50 ${card.color.split(' ')[1]}`}>
                {card.icon}
              </div>
              <h3 className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-1">{card.label}</h3>
              <p className="text-2xl font-black text-gray-800">{card.value}</p>
            </div>
            <div className="absolute -bottom-2 -right-2 text-gray-50 opacity-10 group-hover:scale-110 transition-transform">
              {React.cloneElement(card.icon, { style: { fontSize: '80px' } })}
            </div>
          </div>
        ))}
      </div>

      <h2 className="text-xl font-bold text-gray-800 mb-6">Quick Management</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 mb-12">
        {adminActions.map((action, i) => (
          <Link to={action.link} key={i} className={`group bg-gradient-to-br ${action.gradient} p-8 rounded-[2.5rem] shadow-lg relative overflow-hidden transition-all hover:scale-[1.02] active:scale-95`}>
            <div className="relative z-10 text-white">
              <div className="bg-white/20 w-12 h-12 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-md">
                {React.cloneElement(action.icon, { style: { fontSize: '24px' } })}
              </div>
              <h3 className="text-2xl font-bold mb-2">{action.title}</h3>
              <p className="text-white/80 text-sm max-w-[250px] mb-8">{action.desc}</p>
              <div className="flex items-center gap-2 font-bold text-sm bg-white/20 w-fit px-4 py-2 rounded-full backdrop-blur-md">
                Enter Module <ArrowRightOutlined className="group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
            
            {/* Background Decoration */}
            <div className="absolute top-0 right-0 p-8 opacity-10 text-white translate-x-4 -translate-y-4">
              {React.cloneElement(action.icon, { style: { fontSize: '180px' } })}
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-3xl shadow-soft border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-gray-800">System Growth</h3>
            <span className="text-[10px] bg-blue-50 text-blue-500 px-2 py-1 rounded font-bold uppercase tracking-wider">Jan - Mar 2026</span>
          </div>
          <div className="h-48 flex items-end gap-3 px-4">
             {[40, 70, 45, 90, 65, 80, 50, 85].map((h, i) => (
               <div key={i} style={{ height: `${h}%` }} className="flex-1 bg-blue-100 rounded-t-lg hover:bg-primary transition-colors cursor-pointer relative group">
                 <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                   +{h}% Growth
                 </div>
               </div>
             ))}
          </div>
          <div className="mt-4 flex justify-between text-[10px] text-gray-400 font-bold uppercase tracking-widest px-2">
            <span>Jan 01</span>
            <span>Mar 15</span>
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-soft border border-gray-100">
          <h3 className="font-bold text-gray-800 mb-6">System Health Log</h3>
          <div className="space-y-4">
            {[
              { type: 'success', msg: 'Database backup completed', time: '5m ago' },
              { type: 'info', msg: 'API gateway traffic spike: 2.1k req/s', time: '12m ago' },
              { type: 'warning', msg: 'Late delivery alert in District 7', time: '24m ago' },
              { type: 'success', msg: 'New restaurant "Pizza Hub" verified', time: '1h ago' },
            ].map((log, i) => (
              <div key={i} className="flex items-center gap-4 p-3 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-colors cursor-pointer">
                <div className={`w-2 h-2 rounded-full ${log.type === 'success' ? 'bg-green-500' : log.type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'}`}></div>
                <div className="flex-1 text-xs font-semibold text-gray-700">{log.msg}</div>
                <div className="text-[9px] font-black text-gray-400 uppercase">{log.time}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
