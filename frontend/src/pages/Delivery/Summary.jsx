import React, { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import axios from '../../api/axios';
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { TrophyOutlined, DollarOutlined, BarChartOutlined, SyncOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons';

const DELIVERY_FEE_FALLBACK = 15000;

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function buildYearMonthOptions() {
  const options = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    options.push({ label: `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`, year: d.getFullYear(), month: d.getMonth() });
  }
  return options;
}

const CustomBarTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div className="bg-white border border-gray-100 rounded-2xl shadow-soft px-4 py-3 text-sm">
        <p className="font-bold text-gray-600 mb-1">Day {label}</p>
        <p className="text-primary font-black">{payload[0].value} orders</p>
      </div>
    );
  }
  return null;
};

const CustomLineTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div className="bg-white border border-gray-100 rounded-2xl shadow-soft px-4 py-3 text-sm">
        <p className="font-bold text-gray-600 mb-1">Day {label}</p>
        <p className="text-green-600 font-black">{Number(payload[0].value).toLocaleString()}đ</p>
      </div>
    );
  }
  return null;
};

export default function DriverSummary() {
  const { profile, token } = useSelector(state => state.auth);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const monthOptions = useMemo(() => buildYearMonthOptions(), []);
  const [selectedOption, setSelectedOption] = useState(monthOptions[0]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        const { data } = await axios.get('/orders/driver/me/history');
        if (data.success) setHistory(data.data);
      } catch (err) {
        console.error('Error fetching driver history:', err);
      } finally {
        setLoading(false);
      }
    };
    if (profile?.id && token) fetchHistory();
  }, [profile, token]);

  // Filter by selected month
  const monthOrders = useMemo(() => {
    return history.filter(o => {
      const d = new Date(o.updated_at);
      return d.getFullYear() === selectedOption.year && d.getMonth() === selectedOption.month;
    });
  }, [history, selectedOption]);

  // Build per-day chart data
  const chartData = useMemo(() => {
    const daysInMonth = new Date(selectedOption.year, selectedOption.month + 1, 0).getDate();
    const dayMap = {};

    monthOrders.forEach(o => {
      const day = new Date(o.updated_at).getDate();
      const fee = parseFloat(o.delivery_fee) || DELIVERY_FEE_FALLBACK;
      if (!dayMap[day]) dayMap[day] = { orders: 0, earnings: 0 };
      dayMap[day].orders += 1;
      dayMap[day].earnings += fee;
    });

    return Array.from({ length: daysInMonth }, (_, i) => ({
      day: i + 1,
      orders: dayMap[i + 1]?.orders || 0,
      earnings: dayMap[i + 1]?.earnings || 0,
    }));
  }, [monthOrders, selectedOption]);

  const totalOrders = monthOrders.length;
  const totalEarnings = monthOrders.reduce(
    (sum, o) => sum + (parseFloat(o.delivery_fee) || DELIVERY_FEE_FALLBACK),
    0
  );

  if (loading) {
    return (
      <div className="py-32 flex flex-col items-center">
        <SyncOutlined spin className="text-4xl text-primary/30 mb-4" />
        <p className="font-bold text-gray-400 uppercase tracking-widest text-xs">Loading summary...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Monthly Summary</h1>
          <p className="text-gray-500 font-medium mt-1">Your performance overview for the selected month</p>
        </div>

        {/* Month Selector */}
        <div className="relative group">
          <div 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="bg-white border border-gray-100 rounded-2xl shadow-soft px-5 py-3 flex items-center gap-4 cursor-pointer hover:border-primary/30 transition-all min-w-[200px]"
          >
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <BarChartOutlined />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-widest font-black text-gray-400 leading-none mb-1">Select Period</span>
              <span className="text-sm font-bold text-gray-700">{selectedOption.label}</span>
            </div>
            <SyncOutlined className={`ml-auto text-xs text-gray-300 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </div>

          {isDropdownOpen && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setIsDropdownOpen(false)}
              ></div>
              <div className="absolute top-full right-0 mt-2 w-[280px] bg-white rounded-[2rem] shadow-2xl border border-gray-100 p-5 z-20 animate-in fade-in slide-in-from-top-4 duration-300">
                {/* Year Selection Header */}
                <div className="flex items-center justify-between mb-5 px-1">
                  <button 
                    onClick={() => {
                        const newYear = selectedOption.year - 1;
                        const opt = monthOptions.find(o => o.year === newYear && o.month === selectedOption.month) || { label: `${MONTH_NAMES[selectedOption.month]} ${newYear}`, year: newYear, month: selectedOption.month };
                        setSelectedOption(opt);
                    }}
                    className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 transition-colors"
                  >
                    <LeftOutlined className="text-[10px]" />
                  </button>
                  <span className="text-sm font-black text-gray-800 tracking-tighter">{selectedOption.year}</span>
                  <button 
                    onClick={() => {
                        const newYear = selectedOption.year + 1;
                        const opt = monthOptions.find(o => o.year === newYear && o.month === selectedOption.month) || { label: `${MONTH_NAMES[selectedOption.month]} ${newYear}`, year: newYear, month: selectedOption.month };
                        setSelectedOption(opt);
                    }}
                    className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 transition-colors"
                  >
                    <RightOutlined className="text-[10px]" />
                  </button>
                </div>

                {/* Month Grid (4x3) */}
                <div className="grid grid-cols-3 gap-2">
                  {MONTH_NAMES.map((m, idx) => {
                    const isActive = idx === selectedOption.month;
                    return (
                      <div 
                        key={m}
                        onClick={() => {
                          setSelectedOption({ label: `${m} ${selectedOption.year}`, year: selectedOption.year, month: idx });
                          setIsDropdownOpen(false);
                        }}
                        className={`py-3 rounded-2xl text-center text-xs font-bold cursor-pointer transition-all ${
                          isActive 
                            ? 'bg-primary text-white shadow-lg shadow-primary/30' 
                            : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                        }`}
                      >
                        {m.slice(0, 3)}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-7 rounded-2xl shadow-soft border-l-4 border-primary flex items-center gap-6">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary text-2xl flex-shrink-0">
            <TrophyOutlined />
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest font-bold text-gray-400 mb-1">Total Orders Delivered</p>
            <p className="text-4xl font-black text-gray-800">{totalOrders}</p>
            <p className="text-xs text-gray-400 mt-1">{selectedOption.label}</p>
          </div>
        </div>

        <div className="bg-white p-7 rounded-2xl shadow-soft border-l-4 border-green-500 flex items-center gap-6">
          <div className="w-14 h-14 rounded-2xl bg-green-50 flex items-center justify-center text-green-500 text-2xl flex-shrink-0">
            <DollarOutlined />
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest font-bold text-gray-400 mb-1">Total Earnings</p>
            <p className="text-4xl font-black text-gray-800">{totalEarnings.toLocaleString()}đ</p>
            <p className="text-xs text-gray-400 mt-1">Delivery fees only</p>
          </div>
        </div>
      </div>

      {/* Bar Chart — Orders per day */}
      <div className="bg-white p-8 rounded-2xl shadow-soft border border-gray-100">
        <h2 className="text-lg font-bold text-gray-800 mb-1">Orders Delivered per Day</h2>
        <p className="text-xs text-gray-400 mb-6 uppercase tracking-wide font-semibold">{selectedOption.label}</p>

        {totalOrders === 0 ? (
          <div className="h-56 flex items-center justify-center text-gray-300 text-sm font-semibold italic">
            No deliveries in this month.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} barSize={16} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 11, fill: '#9ca3af', fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
                label={{ value: 'Day', position: 'insideBottomRight', offset: -4, fontSize: 10, fill: '#d1d5db' }}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: '#9ca3af', fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomBarTooltip />} cursor={{ fill: '#fff7f3', radius: 8 }} />
              <Bar dataKey="orders" fill="#FF6B35" radius={[6, 6, 0, 0]} name="Orders" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Line Chart — Daily earnings */}
      <div className="bg-white p-8 rounded-2xl shadow-soft border border-gray-100">
        <h2 className="text-lg font-bold text-gray-800 mb-1">Daily Earnings Trend</h2>
        <p className="text-xs text-gray-400 mb-6 uppercase tracking-wide font-semibold">{selectedOption.label}</p>

        {totalOrders === 0 ? (
          <div className="h-56 flex items-center justify-center text-gray-300 text-sm font-semibold italic">
            No earnings data for this month.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 11, fill: '#9ca3af', fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
                label={{ value: 'Day', position: 'insideBottomRight', offset: -4, fontSize: 10, fill: '#d1d5db' }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#9ca3af', fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => v >= 1000 ? `${v / 1000}k` : v}
              />
              <Tooltip content={<CustomLineTooltip />} />
              <Line
                type="monotone"
                dataKey="earnings"
                stroke="#22c55e"
                strokeWidth={2.5}
                dot={{ r: 3, fill: '#22c55e', strokeWidth: 0 }}
                activeDot={{ r: 6, fill: '#22c55e', strokeWidth: 0 }}
                name="Earnings (đ)"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
