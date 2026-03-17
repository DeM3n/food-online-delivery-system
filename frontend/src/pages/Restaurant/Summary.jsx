import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import axios from '../../api/axios';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { DollarOutlined, ShoppingOutlined, BarChartOutlined, SyncOutlined } from '@ant-design/icons';

const PIE_COLORS = ['#FF6B35', '#22c55e', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899'];

const STATUS_STYLES = {
  pending:   { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  accepted:  { bg: 'bg-blue-100',   text: 'text-blue-700' },
  preparing: { bg: 'bg-orange-100', text: 'text-orange-700' },
  picked_up: { bg: 'bg-purple-100', text: 'text-purple-700' },
  delivered: { bg: 'bg-green-100',  text: 'text-green-700' },
  completed: { bg: 'bg-green-100',  text: 'text-green-700' },
  cancelled: { bg: 'bg-red-100',    text: 'text-red-700' },
};

function buildYearOptions() {
  const now = new Date().getFullYear();
  return Array.from({ length: 5 }, (_, i) => now - i);
}

const RevenueTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div className="bg-white border border-gray-100 rounded-2xl shadow-soft px-4 py-3 text-sm">
        <p className="font-bold text-gray-500 mb-1">{label}</p>
        <p className="text-primary font-black">{Number(payload[0].value).toLocaleString()}đ</p>
      </div>
    );
  }
  return null;
};

const DishTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div className="bg-white border border-gray-100 rounded-2xl shadow-soft px-4 py-3 text-sm">
        <p className="font-bold text-gray-500 mb-1">{label}</p>
        <p className="text-primary font-black">{payload[0].value} sold</p>
      </div>
    );
  }
  return null;
};

export default function RestaurantSummary() {
  const { profile } = useSelector(state => state.auth);
  const [year, setYear] = useState(new Date().getFullYear());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [orderPage, setOrderPage] = useState(1);
  const [monthFilter, setMonthFilter] = useState('all');
  const ORDER_PAGE_SIZE = 10;
  const yearOptions = buildYearOptions();
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  useEffect(() => {
    if (profile?.id) fetchSummary();
  }, [profile, year]);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      setOrderPage(1);
      setMonthFilter('all'); // reset month filter on year change
      const { data: res } = await axios.get('/orders/restaurant/me/yearly-summary', {
        params: { year }
      });
      if (res.success) setData(res.data);
    } catch (err) {
      console.error('Failed to fetch summary:', err);
    } finally {
      setLoading(false);
    }
  };

  const statCards = data
    ? [
        {
          label: 'Total Revenue',
          value: `${Number(data.stats.totalRevenue).toLocaleString()}đ`,
          icon: <DollarOutlined className="text-2xl" />,
          border: 'border-primary',
          iconBg: 'bg-orange-100 text-primary',
        },
        {
          label: 'Total Orders',
          value: data.stats.totalOrders,
          icon: <ShoppingOutlined className="text-2xl" />,
          border: 'border-secondary',
          iconBg: 'bg-teal-100 text-teal-600',
        },
        {
          label: 'Avg Order Value',
          value: `${Math.round(data.stats.avgOrderValue).toLocaleString()}đ`,
          icon: <BarChartOutlined className="text-2xl" />,
          border: 'border-accent',
          iconBg: 'bg-yellow-100 text-yellow-600',
        },
      ]
    : [];

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Yearly Overview</h1>
          <p className="text-gray-400 text-sm mt-1">Performance summary for {profile?.name || 'your restaurant'}</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-700 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {yearOptions.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button
            onClick={fetchSummary}
            disabled={loading}
            className="p-2.5 rounded-xl bg-gray-100 hover:bg-orange-100 text-gray-500 hover:text-primary transition-colors disabled:opacity-50"
          >
            <SyncOutlined spin={loading} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-24 text-center text-gray-400 text-lg">Loading summary...</div>
      ) : !data ? (
        <div className="py-24 text-center text-gray-400">No data available.</div>
      ) : (
        <>
          {/* Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {statCards.map((card, i) => (
              <div
                key={i}
                className={`bg-white p-6 rounded-2xl shadow-soft border-l-4 ${card.border} flex items-center gap-4`}
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${card.iconBg}`}>
                  {card.icon}
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">{card.label}</p>
                  <p className="text-2xl font-black text-gray-800 mt-0.5">{card.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Row 1: Line Chart + Pie Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Line Chart: Monthly Revenue */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-soft">
              <h2 className="text-lg font-bold text-gray-800 mb-5">Revenue by Month</h2>
              {data.monthlyRevenue.every(m => m.revenue === 0) ? (
                <div className="h-56 flex items-center justify-center text-gray-300 text-sm">
                  No revenue recorded for {year}
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart
                    data={data.monthlyRevenue}
                    margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#9ca3af' }} />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#9ca3af' }}
                      tickFormatter={v => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
                      width={50}
                    />
                    <Tooltip content={<RevenueTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="#FF6B35"
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: '#FF6B35', strokeWidth: 0 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Pie Chart: Category Distribution */}
            <div className="bg-white p-6 rounded-2xl shadow-soft">
              <h2 className="text-lg font-bold text-gray-800 mb-5">Category Distribution</h2>
              {data.categoryDistribution.length === 0 ? (
                <div className="h-56 flex items-center justify-center text-gray-300 text-sm">No data</div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie
                        data={data.categoryDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={42}
                        outerRadius={72}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {data.categoryDistribution.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v, name) => [`${v} items`, name]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-4 space-y-2">
                    {data.categoryDistribution.slice(0, 5).map((cat, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-gray-600">
                        <div
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                        />
                        <span className="truncate flex-1 font-medium">{cat.name}</span>
                        <span className="font-bold text-gray-700 tabular-nums">{cat.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Row 2: Horizontal Bar Chart - Top 5 Dishes */}
          <div className="bg-white p-6 rounded-2xl shadow-soft mb-6">
            <h2 className="text-lg font-bold text-gray-800 mb-5">Top 5 Best-Selling Dishes</h2>
            {data.topDishes.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-gray-300 text-sm">
                No sales data for {year}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={data.topDishes.length * 56 + 20}>
                <BarChart
                  layout="vertical"
                  data={data.topDishes}
                  margin={{ top: 0, right: 40, left: 10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af' }} allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={170}
                    tick={{ fontSize: 12, fill: '#374151' }}
                  />
                  <Tooltip content={<DishTooltip />} />
                  <Bar dataKey="quantity" fill="#FF6B35" radius={[0, 6, 6, 0]} barSize={30} label={{ position: 'right', fontSize: 11, fill: '#6b7280' }} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Row 3: Recent Orders Table */}
          <div className="bg-white p-6 rounded-2xl shadow-soft">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <h2 className="text-lg font-bold text-gray-800">Recent Orders</h2>
              <div className="flex items-center gap-3">
                {/* Month filter */}
                <select
                  value={monthFilter}
                  onChange={e => { setMonthFilter(e.target.value); setOrderPage(1); }}
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm font-semibold text-gray-700 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="all">All months</option>
                  {MONTHS.map((m, i) => (
                    <option key={i} value={i}>{m}</option>
                  ))}
                </select>
                {data.recentOrders.length > 0 && (
                  <span className="text-xs text-gray-400">
                    {(() => {
                      const filtered = monthFilter === 'all'
                        ? data.recentOrders
                        : data.recentOrders.filter(o => new Date(o.createdAt).getMonth() === Number(monthFilter));
                      return `${filtered.length} orders`;
                    })()}
                  </span>
                )}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-400 text-xs uppercase">
                    <th className="pb-3 pr-4 font-semibold tracking-wider">Order ID</th>
                    <th className="pb-3 pr-4 font-semibold tracking-wider">Customer</th>
                    <th className="pb-3 pr-4 font-semibold tracking-wider">Total</th>
                    <th className="pb-3 pr-4 font-semibold tracking-wider">Date</th>
                    <th className="pb-3 font-semibold tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const filtered = monthFilter === 'all'
                      ? data.recentOrders
                      : data.recentOrders.filter(o => new Date(o.createdAt).getMonth() === Number(monthFilter));
                    const paginated = filtered.slice((orderPage - 1) * ORDER_PAGE_SIZE, orderPage * ORDER_PAGE_SIZE);
                    if (filtered.length === 0) {
                      return (
                        <tr>
                          <td colSpan={5} className="py-10 text-center text-gray-300 text-sm">
                            No orders found
                          </td>
                        </tr>
                      );
                    }
                    return paginated.map(order => {
                      const s = STATUS_STYLES[order.status] || { bg: 'bg-gray-100', text: 'text-gray-600' };
                      return (
                        <tr key={order.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                          <td className="py-3.5 pr-4 font-mono text-xs text-gray-400">#{order.id.slice(0, 8)}</td>
                          <td className="py-3.5 pr-4 font-semibold text-gray-700 text-sm">{order.customerName}</td>
                          <td className="py-3.5 pr-4 font-bold text-gray-800 text-sm tabular-nums">{Number(order.subtotal).toLocaleString()}đ</td>
                          <td className="py-3.5 pr-4 text-gray-500 text-sm">
                            {new Date(order.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="py-3.5">
                            <span className={`${s.bg} ${s.text} px-2.5 py-1 rounded-full text-xs font-bold capitalize`}>
                              {order.status.replace('_', ' ')}
                            </span>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {(() => {
              const filtered = monthFilter === 'all'
                ? data.recentOrders
                : data.recentOrders.filter(o => new Date(o.createdAt).getMonth() === Number(monthFilter));
              const totalPages = Math.ceil(filtered.length / ORDER_PAGE_SIZE);
              if (filtered.length <= ORDER_PAGE_SIZE) return null;
              return (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => setOrderPage(p => Math.max(1, p - 1))}
                    disabled={orderPage === 1}
                    className="px-4 py-2 rounded-xl text-sm font-semibold bg-gray-100 hover:bg-orange-100 text-gray-600 hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    ← Previous
                  </button>
                  <span className="text-sm text-gray-500">
                    Page <span className="font-bold text-gray-700">{orderPage}</span> of{' '}
                    <span className="font-bold text-gray-700">{totalPages}</span>
                  </span>
                  <button
                    onClick={() => setOrderPage(p => Math.min(totalPages, p + 1))}
                    disabled={orderPage === totalPages}
                    className="px-4 py-2 rounded-xl text-sm font-semibold bg-gray-100 hover:bg-orange-100 text-gray-600 hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Next →
                  </button>
                </div>
              );
            })()}
          </div>
        </>
      )}
    </div>
  );
}
