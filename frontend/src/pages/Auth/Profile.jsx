import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import axios from '../../api/axios';
import { loginSuccess } from '../../redux/slices/authSlice';
import { notification } from 'antd';
import { UserOutlined } from '@ant-design/icons';
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
    const [totalOrders, setTotalOrders] = useState(0);
    const [confirmedOrders, setConfirmedOrders] = useState(0);
    const [dateFilter, setDateFilter] = useState('');
    const [limit, setLimit] = useState(5);
    const [favoriteRestaurant, setFavoriteRestaurant] = useState(null);
    const [addresses, setAddresses] = useState([]);

    const fetchUserOrders = async (currentDate = dateFilter, currentLimit = limit) => {
        try {
            const query = `?date=${currentDate}&limit=${currentLimit}`;
            const response = await axios.get(`/orders/me${query}`);
            if (response.data.success) {
                setOrders(response.data.data);
                setTotalOrders(response.data.total);
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
            socket.on('ORDER_STATUS_UPDATED', (data) => {
                notification.info({
                    message: 'Order Update',
                    description: `Your order #${data.orderId.slice(0, 8)} is now ${data.status.replace(/_/g, ' ')}!`
                });
                fetchUserOrders(); // Auto refresh list
            });

            return () => {
                socket.off('ORDER_STATUS_UPDATED');
            };
        }
    }, [user]);

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

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-8 animate-fade-in">
            <div className="bg-white rounded-3xl shadow-soft overflow-hidden border border-gray-100">
                <div className="bg-gradient-to-r from-primary to-orange-400 p-10 text-white relative">
                    <div className="relative z-10">
                        <h2 className="text-4xl font-bold mb-2">My Profile</h2>
                        <p className="text-white/80 text-lg">Manage your account information and preferences</p>
                    </div>
                    <div className="absolute top-0 right-0 p-10 opacity-10">
                        <UserOutlined style={{ fontSize: '120px' }} />
                    </div>
                </div>

                <div className="p-10">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                        {/* Profile Info Form */}
                        <div className="lg:col-span-2">
                            <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                                <span className="w-2 h-8 bg-primary rounded-full"></span>
                                User Information
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
                                                message: 'Success',
                                                description: 'Profile updated successfully!',
                                                placement: 'topRight',
                                            });
                                        }
                                    } catch (err) {
                                        notification.error({
                                            message: 'Error',
                                            description: err.response?.data?.message || 'Update failed. Please try again.',
                                            placement: 'topRight',
                                        });
                                    } finally {
                                        setLoading(false);
                                        setSubmitting(false);
                                    }
                                }}
                            >
                                {({ isSubmitting }) => (
                                    <Form className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="col-span-1">
                                            <label className="block text-sm font-semibold text-gray-600 mb-1">Full Name</label>
                                            <Field type="text" name="full_name" className="input-field" />
                                            <ErrorMessage name="full_name" component="div" className="text-red-500 text-xs mt-1" />
                                        </div>

                                        <div className="col-span-1">
                                            <label className="block text-sm font-semibold text-gray-600 mb-1">Phone Number</label>
                                            <Field type="text" name="phone_number" className="input-field" />
                                            <ErrorMessage name="phone_number" component="div" className="text-red-500 text-xs mt-1" />
                                        </div>

                                        <div className="col-span-1">
                                            <label className="block text-sm font-semibold text-gray-600 mb-1">Email (Locked)</label>
                                            <input type="email" value={user.email} disabled className="input-field bg-gray-50 text-gray-400 cursor-not-allowed" />
                                        </div>

                                        <div className="col-span-1">
                                            <label className="block text-sm font-semibold text-gray-600 mb-1">New Password</label>
                                            <Field type="password" name="password" className="input-field" placeholder="••••••••" />
                                            <ErrorMessage name="password" component="div" className="text-red-500 text-xs mt-1" />
                                        </div>

                                        {user.role === 'customer' && (
                                            <div className="col-span-full">
                                                <label className="block text-sm font-semibold text-gray-600 mb-1">Delivery Address</label>
                                                <Field type="text" name="address" className="input-field" />
                                            </div>
                                        )}

                                        {user.role === 'restaurant' && (
                                            <>
                                                <div className="col-span-1">
                                                    <label className="block text-sm font-semibold text-gray-600 mb-1">Restaurant Name</label>
                                                    <Field type="text" name="restaurant_name" className="input-field" />
                                                </div>
                                                <div className="col-span-1">
                                                    <label className="block text-sm font-semibold text-gray-600 mb-1">Cuisine Type</label>
                                                    <Field type="text" name="cuisine_type" className="input-field" />
                                                </div>
                                            </>
                                        )}

                                        <div className="col-span-full flex justify-end mt-4">
                                            <button
                                                type="submit"
                                                disabled={isSubmitting || loading}
                                                className="btn-primary px-10"
                                            >
                                                {isSubmitting ? 'Saving...' : 'Save Changes'}
                                            </button>
                                        </div>
                                    </Form>
                                )}
                            </Formik>
                        </div>

                        {/* Order Stats & Favorites */}
                        <div className="lg:col-span-1 space-y-8">
                            {user.role === 'customer' && (
                                <>
                                    <div className="bg-orange-50 rounded-2xl p-6 border border-orange-100">
                                        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                                            <span className="text-2xl">🏆</span> Monthly Favorite
                                        </h3>
                                        {favoriteRestaurant ? (
                                            <div className="flex items-center gap-4">
                                                <div className="w-16 h-16 rounded-xl overflow-hidden shadow-sm">
                                                    <img
                                                        src={favoriteRestaurant.image_url || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=100'}
                                                        alt={favoriteRestaurant.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-800">{favoriteRestaurant.name}</p>
                                                    <p className="text-xs text-primary mb-1">{favoriteRestaurant.cuisine_type || 'Restaurant'}</p>
                                                    <p className="text-sm text-gray-500">Ordered {favoriteRestaurant.count} times this month</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="text-gray-500 italic">No orders yet this month</p>
                                        )}
                                    </div>

                                    <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100">
                                        <h3 className="text-xl font-bold text-gray-800 mb-2">Confirmed Orders</h3>
                                        <p className="text-4xl font-black text-blue-600">{confirmedOrders}</p>
                                        <p className="text-sm text-gray-500 mt-1">Total completed deliveries</p>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Order History Section */}
            {user.role === 'customer' && (
                <div className="bg-white rounded-3xl shadow-soft p-10 border border-gray-100">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                        <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                            <span className="w-2 h-8 bg-primary rounded-full"></span>
                            Order History
                        </h3>
                        
                        <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-xl border border-gray-100 w-full md:w-auto">
                            <label className="text-xs font-bold text-gray-500 uppercase ml-2">Filter by Date:</label>
                            <input 
                                type="date" 
                                value={dateFilter}
                                onChange={(e) => {
                                    setDateFilter(e.target.value);
                                    setLimit(5); // Reset limit when changing date
                                    fetchUserOrders(e.target.value, 5);
                                }}
                                className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-primary transition-colors"
                            />
                            {dateFilter && (
                                <button 
                                    onClick={() => {
                                        setDateFilter('');
                                        setLimit(5);
                                        fetchUserOrders('', 5);
                                    }}
                                    className="text-xs text-gray-400 hover:text-red-500 font-bold px-2"
                                >
                                    Clear
                                </button>
                            )}
                        </div>
                    </div>

                    {orders.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="text-left border-b border-gray-100">
                                        <th className="pb-4 font-bold text-gray-600">Restaurant</th>
                                        <th className="pb-4 font-bold text-gray-600">Date</th>
                                        <th className="pb-4 font-bold text-gray-600">Total</th>
                                        <th className="pb-4 font-bold text-gray-600">Status</th>
                                        <th className="pb-4 font-bold text-gray-600">Items</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {orders.map(order => (
                                        <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="py-4 font-medium text-gray-800">{order.Restaurant?.name}</td>
                                            <td className="py-4 text-gray-500 text-sm">
                                                {new Date(order.created_at).toLocaleDateString()} {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                            <td className="py-4 font-bold text-primary">${order.total_amount}</td>
                                            <td className="py-4">
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${order.status === 'delivered' ? 'bg-green-100 text-green-600' :
                                                    order.status === 'cancelled' ? 'bg-red-100 text-red-600' :
                                                        'bg-orange-100 text-orange-600'
                                                    }`}>
                                                    {order.status}
                                                </span>
                                            </td>
                                            <td className="py-4 text-sm text-gray-500">
                                                {order.OrderItems?.length} items
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {orders.length < totalOrders && (
                                <div className="mt-8 flex justify-center">
                                    <button 
                                        onClick={() => {
                                            const newLimit = limit + 5;
                                            setLimit(newLimit);
                                            fetchUserOrders(dateFilter, newLimit);
                                        }}
                                        className="btn-secondary px-8 py-2 text-sm shadow-sm md:hover:scale-105 transition-transform"
                                    >
                                        Show More Orders
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-10">
                            <div className="text-5xl mb-4">🥡</div>
                            <p className="text-gray-500 text-lg">You haven't placed any orders yet.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
