import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import axios from '../../api/axios';
import { loginSuccess } from '../../redux/slices/authSlice';
import { notification } from 'antd';
import { UserOutlined, HeartFilled, HistoryOutlined, SyncOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons';
import socket from '../../socket';

const ProfileSchema = Yup.object().shape({
    full_name: Yup.string().required('Họ và tên là bắt buộc'),
    phone_number: Yup.string().required('Số điện thoại là bắt buộc'),
    password: Yup.string().min(6, 'Mật khẩu phải ít nhất 6 ký tự'),
    // Restaurant specific fields
    restaurant_name: Yup.string(),
    location: Yup.string(),
    cuisine_type: Yup.string(),
    // Driver specific fields
    vehicle_license: Yup.string(),
});

export default function Profile() {
    const { user, profile, token } = useSelector((state) => state.auth);
    const dispatch = useDispatch();
    const [loading, setLoading] = useState(false);
    const [orders, setOrders] = useState([]);
    const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
    const [currentPage, setCurrentPage] = useState(1);
    const [ordersPerPage] = useState(10);
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [totalOrders, setTotalOrders] = useState(0);
    const [confirmedOrders, setConfirmedOrders] = useState(0);
    const [favoriteRestaurant, setFavoriteRestaurant] = useState(null);

    const fetchUserOrders = async (currentDate = dateFilter, page = currentPage) => {
        try {
            const offset = (page - 1) * ordersPerPage;
            const query = `?date=${currentDate}&limit=${ordersPerPage}&offset=${offset}`;
            const response = await axios.get(`/orders/me${query}`);
            if (response.data.success) {
                setOrders(response.data.data);
                setTotalOrders(response.data.total || 0);
                setConfirmedOrders(response.data.confirmedCount || 0);
            }
        } catch (error) {
            console.error('Error fetching orders:', error);
        }
    };

    useEffect(() => {
        if (user && user.role === 'customer') {
            fetchUserOrders();
            fetchFavoriteRestaurant();
            
            // Real-time status updates
            const handleUpdate = (data) => {
                notification.info({
                    message: 'Order Update',
                    description: `Your order #${data.orderId.slice(0, 8)} is now ${data.status.replace(/_/g, ' ')}!`
                });
                fetchUserOrders();
            };

            socket.on('ORDER_STATUS_UPDATED', handleUpdate);
            return () => {
                socket.off('ORDER_STATUS_UPDATED', handleUpdate);
            };
        }
    }, [user, dateFilter, currentPage]);

    const fetchFavoriteRestaurant = async () => {
        try {
            const response = await axios.get(`/orders/me/favorite`);
            if (response.data.success) {
                setFavoriteRestaurant(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching favorite restaurant:', error);
        }
    };

    // If no user, show message (should be protected by route anyway)
    if (!user) return <div className="p-8 text-center text-gray-500 font-medium">Please login to view your profile.</div>;

    const totalPages = Math.ceil(totalOrders / ordersPerPage);

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-8 animate-fade-in pb-20">
            <div className="bg-white rounded-[2.5rem] shadow-soft overflow-hidden border border-gray-100">
                <div className="bg-gradient-to-br from-primary via-orange-500 to-orange-400 p-12 text-white relative">
                    <div className="relative z-10">
                        <span className="bg-white/20 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest mb-4 inline-block backdrop-blur-md">Account Settings</span>
                        <h2 className="text-5xl font-black mb-2 tracking-tighter">My Account</h2>
                        <p className="text-white/80 text-lg font-medium">Personalize your profile and track history</p>
                    </div>
                    <div className="absolute top-0 right-0 p-10 opacity-10">
                        <UserOutlined style={{ fontSize: '180px' }} />
                    </div>
                </div>

                <div className="p-12">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                        {/* Profile Info Form */}
                        <div className="lg:col-span-2">
                            <h3 className="text-2xl font-black text-gray-800 mb-8 flex items-center gap-3 tracking-tight">
                                <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                                    <UserOutlined />
                                </div>
                                Personal Information
                            </h3>
                            <Formik
                                enableReinitialize
                                initialValues={{
                                    full_name: user.full_name || '',
                                    phone_number: user.phone_number || '',
                                    password: '',
                                    restaurant_name: profile?.name || '',
                                    location: profile?.location || '',
                                    cuisine_type: profile?.cuisine_type || '',
                                    vehicle_license: profile?.vehicle_license || '',
                                    address: profile?.Addresses?.find(a => a.is_default)?.street || profile?.Addresses?.[0]?.street || profile?.address || '',
                                }}
                                validationSchema={ProfileSchema}
                                onSubmit={async (values, { setSubmitting }) => {
                                    try {
                                        setLoading(true);
                                        const response = await axios.put('/auth/profile', values);

                                        if (response.data.success) {
                                            const updatedData = response.data.data;
                                            let activeProfile = null;
                                            if (updatedData.Customer) activeProfile = updatedData.Customer;
                                            else if (updatedData.Restaurant) activeProfile = updatedData.Restaurant;
                                            else if (updatedData.DeliveryPartner) activeProfile = updatedData.DeliveryPartner;
                                            else if (updatedData.Admin) activeProfile = updatedData.Admin;

                                            dispatch(loginSuccess({
                                                user: {
                                                    id: updatedData.id,
                                                    email: updatedData.email,
                                                    role: updatedData.role,
                                                    full_name: updatedData.full_name,
                                                    phone_number: updatedData.phone_number
                                                },
                                                profile: activeProfile,
                                                token: token
                                            }));

                                            notification.success({
                                                message: 'Profile Updated',
                                                description: 'Your changes have been saved successfully.',
                                                placement: 'topRight',
                                            });
                                        }
                                    } catch (err) {
                                        notification.error({
                                            message: 'Update Failed',
                                            description: err.response?.data?.message || 'Something went wrong.',
                                        });
                                    } finally {
                                        setLoading(false);
                                        setSubmitting(false);
                                    }
                                }}
                            >
                                {({ isSubmitting }) => (
                                    <Form className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="col-span-1">
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Full Name</label>
                                            <Field type="text" name="full_name" className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all outline-none" />
                                            <ErrorMessage name="full_name" component="div" className="text-red-500 text-[10px] font-bold mt-1" />
                                        </div>

                                        <div className="col-span-1">
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Phone Number</label>
                                            <Field type="text" name="phone_number" className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all outline-none" />
                                            <ErrorMessage name="phone_number" component="div" className="text-red-500 text-[10px] font-bold mt-1" />
                                        </div>

                                        <div className="col-span-1">
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Email Address</label>
                                            <input type="email" value={user.email} disabled className="w-full bg-gray-100/50 border-none rounded-2xl px-5 py-4 text-sm font-bold text-gray-400 cursor-not-allowed" />
                                        </div>

                                        <div className="col-span-1 relative">
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">New Password</label>
                                            <Field type="password" name="password" className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all outline-none" placeholder="Leave blank to keep current" />
                                            <ErrorMessage name="password" component="div" className="text-red-500 text-[10px] font-bold mt-1" />
                                        </div>

                                        {user.role === 'customer' && (
                                            <div className="col-span-full">
                                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Delivery Address</label>
                                                <Field type="text" name="address" className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all outline-none" />
                                            </div>
                                        )}

                                        {user.role === 'restaurant' && (
                                            <>
                                                <div className="col-span-1">
                                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Restaurant Name</label>
                                                    <Field type="text" name="restaurant_name" className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all outline-none" />
                                                </div>
                                                <div className="col-span-1">
                                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Cuisine Type</label>
                                                    <Field type="text" name="cuisine_type" className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all outline-none" />
                                                </div>
                                                <div className="col-span-full">
                                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Restaurant Location</label>
                                                    <Field type="text" name="location" className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all outline-none" />
                                                </div>
                                            </>
                                        )}

                                        {user.role === 'delivery_partner' && (
                                            <div className="col-span-full">
                                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Vehicle License</label>
                                                <Field type="text" name="vehicle_license" className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all outline-none" />
                                            </div>
                                        )}

                                        <div className="col-span-full">
                                            <button
                                                type="submit"
                                                disabled={isSubmitting || loading}
                                                className="w-full md:w-auto bg-slate-900 hover:bg-primary text-white px-12 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl transition-all"
                                            >
                                                {isSubmitting ? 'Updating...' : 'Save Changes'}
                                            </button>
                                        </div>
                                    </Form>
                                )}
                            </Formik>
                        </div>

                        {/* Stats Panel */}
                        <div className="lg:col-span-1 space-y-6">
                            {user.role === 'customer' && (
                                <>
                                    <div className="bg-orange-50 rounded-[2rem] p-8 border border-orange-100 flex flex-col items-center text-center">
                                        <div className="w-20 h-20 rounded-3xl bg-white shadow-lg overflow-hidden mb-5">
                                            <img
                                                src={favoriteRestaurant?.image_url || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=200'}
                                                alt="Favorite"
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Most Ordered</h3>
                                        <p className="font-black text-xl text-gray-900 mb-1">{favoriteRestaurant?.name || 'Exploring...'}</p>
                                        <p className="text-sm font-bold text-primary">{favoriteRestaurant?.count || 0} Orders this month</p>
                                    </div>

                                    <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden group">
                                        <div className="relative z-10">
                                            <h3 className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-4">Account Reliability</h3>
                                            <div className="text-6xl font-black mb-2 tracking-tighter">{confirmedOrders}</div>
                                            <p className="text-sm font-medium text-white/60">Successfully delivered orders</p>
                                        </div>
                                        <HistoryOutlined className="absolute bottom-[-20px] right-[-20px] text-[150px] text-white/5 group-hover:scale-110 transition-transform duration-700" />
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Order History - Scalable Version */}
            {user.role === 'customer' && (
                <div className="bg-white rounded-[3rem] shadow-soft p-12 border border-gray-100 min-h-[600px] flex flex-col">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
                        <div>
                            <h3 className="text-3xl font-black text-gray-800 tracking-tight flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                                    <HistoryOutlined />
                                </div>
                                Order History
                            </h3>
                            <p className="text-gray-400 font-medium mt-1">Review your transaction history and status</p>
                        </div>
                        
                        {/* Premium Date Picker */}
                        <div className="relative">
                            <div 
                                onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
                                className="bg-gray-50 rounded-2xl px-6 py-3.5 flex items-center gap-4 cursor-pointer hover:bg-gray-100 transition-all border-none"
                            >
                                <div className="flex flex-col">
                                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Filter Date</span>
                                    <span className="text-sm font-bold text-gray-800">
                                        {dateFilter ? new Date(dateFilter).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'All Time'}
                                    </span>
                                </div>
                                <SyncOutlined className={`text-xs text-gray-300 transition-transform ${isDatePickerOpen ? 'rotate-180':''}`} />
                            </div>

                            {isDatePickerOpen && (
                                <>
                                    <div className="fixed inset-0 z-20" onClick={() => setIsDatePickerOpen(false)}></div>
                                    <div className="absolute top-full right-0 mt-3 bg-white p-6 rounded-[2.5rem] shadow-2xl border border-gray-50 z-30 min-w-[320px] animate-in fade-in slide-in-from-top-4 duration-300">
                                        {/* Date Picker Header */}
                                        <div className="flex items-center justify-between mb-6 px-1">
                                            <button 
                                                onClick={() => {
                                                    const d = new Date(dateFilter);
                                                    d.setMonth(d.getMonth() - 1);
                                                    setDateFilter(d.toISOString().split('T')[0]);
                                                }}
                                                className="w-10 h-10 rounded-2xl hover:bg-gray-50 flex items-center justify-center text-gray-400 transition-all"
                                            >
                                                <LeftOutlined className="text-[10px]" />
                                            </button>
                                            
                                            <div className="flex flex-col items-center">
                                                <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-0.5">
                                                    {new Date(dateFilter).toLocaleDateString('en-US', { month: 'long' })}
                                                </span>
                                                <span className="text-lg font-black text-gray-800 tracking-tighter">
                                                    {new Date(dateFilter).getFullYear()}
                                                </span>
                                            </div>

                                            <button 
                                                onClick={() => {
                                                    const d = new Date(dateFilter);
                                                    d.setMonth(d.getMonth() + 1);
                                                    setDateFilter(d.toISOString().split('T')[0]);
                                                }}
                                                className="w-10 h-10 rounded-2xl hover:bg-gray-50 flex items-center justify-center text-gray-400 transition-all"
                                            >
                                                <RightOutlined className="text-[10px]" />
                                            </button>
                                        </div>

                                        {/* Days Grid */}
                                        <div className="grid grid-cols-7 gap-1">
                                            {['S','M','T','W','T','F','S'].map(day => (
                                                <div key={day} className="text-[9px] font-black text-gray-300 text-center pb-2 uppercase">{day}</div>
                                            ))}
                                            {(() => {
                                                const d = new Date(dateFilter);
                                                const firstDay = new Date(d.getFullYear(), d.getMonth(), 1).getDay();
                                                const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
                                                const currentDay = new Date(dateFilter).getDate();
                                                
                                                const blanks = Array(firstDay).fill(null);
                                                const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
                                                
                                                return [...blanks, ...days].map((day, idx) => (
                                                    <div 
                                                        key={idx}
                                                        onClick={() => {
                                                            if (day) {
                                                                const newDate = new Date(dateFilter);
                                                                newDate.setDate(day);
                                                                setDateFilter(newDate.toISOString().split('T')[0]);
                                                                setCurrentPage(1);
                                                                setIsDatePickerOpen(false);
                                                            }
                                                        }}
                                                        className={`h-10 w-10 flex items-center justify-center text-xs font-black rounded-xl transition-all cursor-pointer ${
                                                            !day ? 'cursor-default' : 
                                                            day === currentDay 
                                                                ? 'bg-primary text-white shadow-lg shadow-primary/30 scale-110' 
                                                                : 'text-gray-500 hover:bg-gray-50 hover:text-primary'
                                                        }`}
                                                    >
                                                        {day}
                                                    </div>
                                                ));
                                            })()}
                                        </div>

                                        <button 
                                            onClick={() => {
                                                setDateFilter(new Date().toISOString().split('T')[0]);
                                                setCurrentPage(1);
                                                setIsDatePickerOpen(false);
                                            }}
                                            className="w-full mt-6 py-3 rounded-2xl bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:bg-primary/5 hover:text-primary transition-all"
                                        >
                                            Jump to Today
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {orders.length > 0 ? (
                        <>
                            <div className="flex-1">
                                <div className="grid grid-cols-1 gap-4">
                                    {orders.map(order => (
                                        <div key={order.id} className="group bg-gray-50 hover:bg-white rounded-3xl p-7 transition-all border-2 border-transparent hover:border-primary/10 hover:shadow-xl flex flex-col md:flex-row items-center gap-6">
                                            <div className="flex-1 text-center md:text-left">
                                                <h4 className="font-black text-gray-800 text-xl mb-0.5 tracking-tight">{order.Restaurant?.name}</h4>
                                                <div className="flex items-center justify-center md:justify-start gap-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                                                    <span>{new Date(order.created_at).toLocaleDateString()}</span>
                                                    <span>•</span>
                                                    <span>{order.OrderItems?.length} items</span>
                                                </div>
                                            </div>
                                            <div className="text-center md:text-right px-6">
                                                <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Status</p>
                                                <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                                    order.status === 'delivered' ? 'bg-green-100 text-green-600' :
                                                    order.status === 'cancelled' ? 'bg-red-100 text-red-600' :
                                                    'bg-orange-100 text-orange-600'
                                                }`}>
                                                    {order.status.replace('_', ' ')}
                                                </span>
                                            </div>
                                            <div className="text-center md:text-right min-w-[120px]">
                                                <p className="text-[9px] font-black text-gray-400 uppercase mb-1">Total Paid</p>
                                                <span className="text-2xl font-black text-gray-900 tracking-tighter">
                                                    {order.total_amount.toLocaleString()}đ
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Pagination Controls */}
                            {totalPages > 1 && (
                                <div className="mt-12 flex items-center justify-center gap-4">
                                    <button 
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className="w-12 h-12 rounded-2xl bg-gray-50 hover:bg-primary hover:text-white flex items-center justify-center transition-all disabled:opacity-30 disabled:hover:bg-gray-50"
                                    >
                                        <LeftOutlined />
                                    </button>
                                    <div className="flex items-center gap-2">
                                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                                            <button 
                                                key={p}
                                                onClick={() => setCurrentPage(p)}
                                                className={`w-10 h-10 rounded-xl font-black text-xs transition-all ${
                                                    currentPage === p ? 'bg-slate-900 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'
                                                }`}
                                            >
                                                {p}
                                            </button>
                                        ))}
                                    </div>
                                    <button 
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                        className="w-12 h-12 rounded-2xl bg-gray-50 hover:bg-primary hover:text-white flex items-center justify-center transition-all disabled:opacity-30 disabled:hover:bg-gray-50"
                                    >
                                        <RightOutlined />
                                    </button>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center py-20 text-center opacity-40">
                            <HistoryOutlined className="text-[120px] mb-6 text-gray-100" />
                            <h4 className="text-2xl font-black text-gray-700">No orders found</h4>
                            <p className="text-gray-400 font-medium">Try choosing a different date or clearing the filter</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
