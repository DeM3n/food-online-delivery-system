import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { clearCartAsync } from '../../redux/slices/cartSlice';
import { notification } from 'antd';
import { CreditCardOutlined, MoneyCollectOutlined, HomeOutlined, PhoneOutlined, MessageOutlined } from '@ant-design/icons';

export default function CheckoutPage() {
    const { items, total, restaurantId } = useSelector(state => state.cart);
    const { user, profile, token } = useSelector(state => state.auth);
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(false);
    const [address, setAddress] = useState(profile?.Addresses?.[0]?.street || '');
    const [phone, setPhone] = useState(user?.phone_number || '');
    const [notes, setNotes] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('cod');

    const deliveryFee = 15000;
    const grandTotal = total + deliveryFee;

    const handlePlaceOrder = async () => {
        if (!address.trim() || !phone.trim()) {
            notification.warning({
                message: 'Incomplete Information',
                description: 'Please enter delivery address and phone number.',
                placement: 'topRight'
            });
            return;
        }

        try {
            setLoading(true);
            const orderData = {
                restaurant_id: restaurantId,
                items,
                subtotal: total,
                delivery_fee: deliveryFee,
                total_amount: grandTotal,
                address_details: address,
                notes,
                payment_method: paymentMethod
            };

            console.log('Sending order data:', orderData);

            const config = {
                headers: { Authorization: `Bearer ${token}` }
            };

            const response = await axios.post('http://localhost:5000/api/orders', orderData, config);

            if (response.data.success) {
                notification.success({
                    message: 'Order Placed Successfully',
                    description: 'Your order has been received!',
                    placement: 'topRight'
                });
                dispatch(clearCartAsync());
                navigate('/customer'); // Redirect to Home after successful order
            }
        } catch (error) {
            console.error('Checkout error:', error);
            notification.error({
                message: 'Order Error',
                description: error.response?.data?.message || 'There was an error placing your order. Please try again.',
                placement: 'topRight'
            });
        } finally {
            setLoading(false);
        }
    };

    if (items.length === 0) {
        return (
            <div className="max-w-4xl mx-auto py-20 text-center">
                <h1 className="text-3xl font-bold text-gray-800 mb-4">Your Cart is Empty</h1>
                <p className="text-gray-500 mb-8">You cannot checkout with an empty cart.</p>
                <button onClick={() => navigate('/customer/restaurants')} className="btn-primary px-8 py-3">
                    Go back to Restaurants
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-8 animate-fade-in">
            <h1 className="text-3xl font-bold text-gray-800 mb-8">Checkout</h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Delivery & Payment Info */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Delivery Info */}
                    <div className="bg-white rounded-2xl shadow-soft p-8 border border-gray-100">
                        <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                            <HomeOutlined className="text-primary" /> Delivery Information
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-600 mb-1">Delivery Address</label>
                                <div className="relative">
                                    <input 
                                        type="text" 
                                        className="input-field pl-10" 
                                        value={address}
                                        onChange={(e) => setAddress(e.target.value)}
                                        placeholder="e.g. 123 ABC Street, District 1..."
                                    />
                                    <HomeOutlined className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-600 mb-1">Phone Number</label>
                                    <div className="relative">
                                        <input 
                                            type="text" 
                                            className="input-field pl-10" 
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                            placeholder="Your phone number"
                                        />
                                        <PhoneOutlined className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-600 mb-1">Notes (Optional)</label>
                                    <div className="relative">
                                        <input 
                                            type="text" 
                                            className="input-field pl-10" 
                                            value={notes}
                                            onChange={(e) => setNotes(e.target.value)}
                                            placeholder="Notes for restaurant..."
                                        />
                                        <MessageOutlined className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Payment Method */}
                    <div className="bg-white rounded-2xl shadow-soft p-8 border border-gray-100">
                        <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                            <CreditCardOutlined className="text-primary" /> Payment Method
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div 
                                className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center gap-4 ${paymentMethod === 'cod' ? 'border-primary bg-orange-50' : 'border-gray-100 hover:border-orange-200'}`}
                                onClick={() => setPaymentMethod('cod')}
                            >
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${paymentMethod === 'cod' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500'}`}>
                                    <MoneyCollectOutlined className="text-xl" />
                                </div>
                                <div>
                                    <p className="font-bold text-gray-800">Cash on Delivery</p>
                                    <p className="text-xs text-gray-500">Pay when you receive the order (COD)</p>
                                </div>
                            </div>

                            <div 
                                className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center gap-4 ${paymentMethod === 'online' ? 'border-primary bg-orange-50' : 'border-gray-100 hover:border-orange-200 opacity-50'}`}
                                onClick={() => setPaymentMethod('online')}
                            >
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${paymentMethod === 'online' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500'}`}>
                                    <CreditCardOutlined className="text-xl" />
                                </div>
                                <div>
                                    <p className="font-bold text-gray-800">Online Payment</p>
                                    <p className="text-xs text-gray-500">Coming Soon!</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Order Summary */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-2xl shadow-soft p-6 border border-gray-100 sticky top-24">
                        <h3 className="text-xl font-bold mb-6 pb-4 border-b">Order Summary</h3>
                        
                        <div className="max-h-60 overflow-y-auto mb-6 space-y-4 pr-2 custom-scrollbar">
                            {items.map(item => (
                                <div key={item.id} className="flex justify-between items-start gap-4">
                                    <div className="flex-1">
                                        <p className="font-bold text-gray-800 line-clamp-1">{item.name}</p>
                                        <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                                    </div>
                                    <p className="font-semibold text-gray-700">{(item.price * item.quantity).toLocaleString()}đ</p>
                                </div>
                            ))}
                        </div>

                        <div className="space-y-3 mb-6 pt-4 border-t">
                            <div className="flex justify-between text-gray-600">
                                <span>Subtotal ({items.length} items)</span>
                                <span>{total.toLocaleString()}đ</span>
                            </div>
                            <div className="flex justify-between text-gray-600">
                                <span>Delivery Fee</span>
                                <span>{deliveryFee.toLocaleString()}đ</span>
                            </div>
                        </div>

                        <div className="flex justify-between items-center mb-8">
                            <span className="text-lg font-bold text-gray-800">Total</span>
                            <span className="text-2xl font-black text-primary">{grandTotal.toLocaleString()}đ</span>
                        </div>

                        <button 
                            className="btn-primary w-full py-4 text-xl font-bold disabled:opacity-50"
                            onClick={handlePlaceOrder}
                            disabled={loading}
                        >
                            {loading ? 'Processing...' : 'PLACE ORDER'}
                        </button>
                        
                        <p className="text-center text-xs text-gray-400 mt-4">
                            By clicking Place Order, you agree to our Terms and Conditions.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
