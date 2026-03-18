import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { addToCartAsync } from '../../redux/slices/cartSlice';
import axios from '../../api/axios';
import { notification } from 'antd';
import socket from '../../socket';

export default function RestaurantMenu() {
    const { restaurantId } = useParams();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const [restaurant, setRestaurant] = useState(null);
    const [menu, setMenu] = useState([]);
    const [loading, setLoading] = useState(true);
    const [restaurantClosed, setRestaurantClosed] = useState(false);
    const [closedMessage, setClosedMessage] = useState('This restaurant is currently closed.');

    useEffect(() => {
        if (!restaurantId) return;

        const fetchMenuData = async () => {
            try {
                const resResponse = await axios.get(`/restaurants/${restaurantId}`);

                if (resResponse.data.success) {
                    setRestaurant(resResponse.data.data);
                    setRestaurantClosed(false);

                    const menuResponse = await axios.get(`/menu/full/${restaurantId}`);
                    if (menuResponse.data.success) {
                        setMenu(menuResponse.data.data);
                    }
                }
            } catch (error) {
                if (error.response?.data?.type === 'RESTAURANT_CLOSED') {
                    setRestaurantClosed(true);
                    setClosedMessage(error.response?.data?.message || 'This restaurant is currently closed.');
                    setRestaurant(null);
                    setMenu([]);
                    return;
                }
                console.error('Error fetching menu:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchMenuData();

        // Real-time menu updates
        socket.on('MENU_ITEM_UPDATED', (data) => {
            console.log('Real-time menu update received:', data);
            if (String(data.restaurantId) === String(restaurantId)) {
                setMenu(prevMenu => prevMenu.map(category => ({
                    ...category,
                    MenuItems: category.MenuItems?.map(item => 
                        String(item.id) === String(data.itemId) 
                            ? { ...item, ...data } 
                            : item
                    )
                })));
            }
        });

        socket.on('RESTAURANT_STATUS_UPDATED', (data) => {
            if (String(data.restaurantId) !== String(restaurantId)) return;

            if (!data.is_open) {
                setRestaurantClosed(true);
                setClosedMessage(`${data.name || 'This restaurant'} is currently closed.`);
                notification.warning({
                    message: 'Restaurant closed',
                    description: `${data.name || 'This restaurant'} is no longer accepting orders.`,
                    placement: 'topRight'
                });
            } else {
                setRestaurantClosed(false);
                setClosedMessage('');
                setRestaurant((prev) => prev ? { ...prev, is_open: true } : prev);
            }
        });

        return () => {
            socket.off('MENU_ITEM_UPDATED');
            socket.off('RESTAURANT_STATUS_UPDATED');
        };
    }, [restaurantId]);

    const handleAdd = async (item) => {
        if (restaurantClosed || !restaurant?.is_open) {
            notification.warning({
                message: 'Restaurant is closed',
                description: 'You cannot add items while this restaurant is closed.',
                placement: 'topRight'
            });
            return;
        }

        const loadingNotify = notification.info({
            message: 'Đang thêm...',
            description: 'Vui lòng đợi trong giây lát',
            duration: 0,
        });

        try {
            await dispatch(addToCartAsync({
                menu_item_id: item.id,
                quantity: 1,
                restaurant_id: restaurant.id
            })).unwrap();

            notification.destroy();
            notification.success({
                message: 'Đã thêm vào giỏ hàng',
                description: `${item.name} đã được thêm vào giỏ hàng của bạn!`,
                placement: 'bottomRight',
                duration: 2,
            });
        } catch (error) {
            notification.destroy();
            notification.error({
                message: 'Lỗi',
                description: 'Không thể thêm món vào giỏ hàng. Vui lòng thử lại!',
            });
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-40 animate-pulse">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-gray-500 font-medium text-lg">Loading delicious menu...</p>
        </div>
    );

    if (restaurantClosed) {
        return (
            <div className="py-20 text-center flex flex-col items-center bg-white rounded-3xl border border-red-100 shadow-soft">
                <span className="text-6xl mb-4">🔒</span>
                <h2 className="text-3xl font-bold text-gray-800">Restaurant Closed</h2>
                <p className="text-gray-500 mt-2 mb-6">{closedMessage}</p>
                <button
                    type="button"
                    onClick={() => navigate('/customer/restaurants')}
                    className="btn-primary px-8 py-3"
                >
                    Back to Restaurants
                </button>
            </div>
        );
    }

    if (!restaurant) return (
        <div className="py-20 text-center flex flex-col items-center">
            <span className="text-6xl mb-4">🍽️</span>
            <h2 className="text-2xl font-bold text-gray-800">Restaurant not found</h2>
            <p className="text-gray-500 mt-2">We couldn't find the restaurant you're looking for.</p>
        </div>
    );

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Restaurant Header */}
            <div className="relative h-64 rounded-3xl overflow-hidden shadow-lg">
                <img
                    src={restaurant.image_url || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&h=400&fit=crop'}
                    className="w-full h-full object-cover"
                    alt={restaurant.name}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-8">
                    <div>
                        <h1 className="text-4xl font-bold text-white mb-2">{restaurant.name}</h1>
                        <div className="flex items-center gap-4 text-white/90">
                            <span className="flex items-center gap-1 font-bold">⭐ {restaurant.rating}</span>
                            <span>•</span>
                            <span>{restaurant.cuisine_type}</span>
                            <span>•</span>
                            <span>{restaurant.is_open ? '🟢 Open Now' : '🔴 Closed'}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Menu Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-12">
                    {menu.length > 0 ? (
                        menu.map(category => (
                            <section key={category.id}>
                                <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-2">{category.name}</h2>
                                <div className="space-y-4">
                                    {category.MenuItems && category.MenuItems.length > 0 ? (
                                        category.MenuItems.map(item => (
                                            <div key={item.id} className={`bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex gap-4 hover:shadow-md transition-shadow relative overflow-hidden ${!item.is_available ? 'grayscale-[0.5] opacity-80' : ''}`}>
                                                {!item.is_available && (
                                                    <div className="absolute top-2 right-2 z-10">
                                                        <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm uppercase tracking-tighter">OOO</span>
                                                    </div>
                                                )}
                                                <img
                                                    src={item.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&h=200&fit=crop'}
                                                    className="w-24 h-24 rounded-xl object-cover"
                                                    alt={item.name}
                                                />
                                                <div className="flex-1">
                                                    <h3 className="text-lg font-bold text-gray-800">{item.name}</h3>
                                                    <p className="text-gray-500 text-sm line-clamp-2 mt-1">{item.description}</p>
                                                        <div className="flex justify-between items-center mt-3">
                                                            <span className="text-xl font-bold text-primary">{Number(item.price).toLocaleString()}đ</span>
                                                            {item.is_available ? (
                                                                <button
                                                                    onClick={() => handleAdd(item)}
                                                                    className="bg-orange-100 text-primary px-4 py-1.5 rounded-full font-bold hover:bg-primary hover:text-white transition-colors"
                                                                >
                                                                    Add +
                                                                </button>
                                                            ) : (
                                                                <span className="text-red-500 font-bold text-sm bg-red-50 px-3 py-1 rounded-full border border-red-100 italic">
                                                                    Out of Order
                                                                </span>
                                                            )}
                                                        </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-gray-400 italic text-sm">No items in this category</p>
                                    )}
                                </div>
                            </section>
                        ))
                    ) : (
                        <div className="text-center py-20 bg-white rounded-3xl shadow-sm border border-dashed border-gray-200">
                            <span className="text-4xl mb-4 block">🍳</span>
                            <p className="text-gray-400 font-medium">
                                This restaurant hasn't added any menu categories yet.
                            </p>
                        </div>
                    )}
                </div>

                {/* Floating Cart Summary / Info */}
                <div className="hidden lg:block">
                    <div className="bg-white p-6 rounded-2xl shadow-soft sticky top-24 border border-gray-100">
                        <h3 className="text-xl font-bold mb-4">Restaurant Info</h3>
                        <div className="space-y-4 text-gray-600">
                            <div className="flex justify-between">
                                <span>Min. Order</span>
                                <span className="font-bold">{Number(restaurant.min_order_amount).toLocaleString()}đ</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Delivery Radius</span>
                                <span className="font-bold">{restaurant.delivery_radius} km</span>
                            </div>
                            <div className="pt-4 border-t">
                                <p className="text-sm font-medium mb-1">Location</p>
                                <p className="text-xs">{restaurant.location}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
