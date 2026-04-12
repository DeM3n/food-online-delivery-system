import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { updateQuantityAsync, removeItemAsync, fetchCart } from '../../redux/slices/cartSlice';
import { Link, useNavigate } from 'react-router-dom';
import { notification } from 'antd';
import socket from '../../socket';
import { ExclamationCircleFilled } from '@ant-design/icons';

export default function CartPage() {
  const { items, total } = useSelector(state => state.cart);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const deliveryFee = items.length > 0 ? 15000 : 0;
  const grandTotal = total + deliveryFee;
  const hasUnavailableItems = items.some(i => !i.isAvailable);

  React.useEffect(() => {
    socket.on('MENU_ITEM_UPDATED', (data) => {
      if (items.some(i => i.id === data.itemId)) {
        if (!data.isAvailable) {
          notification.warning({
            message: 'Item Unavailable',
            description: `"${data.name}" has just gone Out of Order and will be excluded from your order.`,
            duration: 5
          });
        } else {
          notification.success({
            message: 'Item Back in Stock!',
            description: `"${data.name}" is now available again.`,
            duration: 3
          });
        }
        dispatch(fetchCart());
      }
    });

    return () => {
      socket.off('MENU_ITEM_UPDATED');
    };
  }, [items, dispatch]);

  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto py-20 text-center">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">Your Cart is Empty</h1>
        <p className="text-gray-500 mb-8">Looks like you haven't added anything to your cart yet.</p>
        <Link to="/customer/restaurants" className="btn-primary px-8 py-3">
          Explore Restaurants
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Your Cart</h1>

      <div className="bg-white rounded-2xl shadow-soft p-6 flex flex-col md:flex-row gap-8">
        <div className="flex-1 space-y-4">
          {items.map(item => (
            <div key={item.id} className={`flex justify-between items-center p-4 border rounded-xl transition-all ${!item.isAvailable ? 'bg-red-50 border-red-200 grayscale-[0.5]' : 'border-gray-100 hover:border-primary'}`}>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <img
                    src={item.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100&h=100&fit=crop'}
                    className="w-16 h-16 rounded-lg object-cover"
                    alt={item.name}
                  />
                  {!item.isAvailable && (
                    <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center rounded-lg">
                      <span className="bg-red-600 text-white text-[8px] font-bold px-1 rounded shadow-sm">OOO</span>
                    </div>
                  )}
                </div>
                <div>
                  <h4 className={`font-bold ${!item.isAvailable ? 'text-red-700' : 'text-gray-800'}`}>
                    {item.name}
                    {!item.isAvailable && <span className="ml-2 text-[10px] text-red-500 uppercase italic">(Out of Order)</span>}
                  </h4>
                  <p className={`${!item.isAvailable ? 'text-gray-400 line-through' : 'text-primary font-medium'}`}>
                    {item.price.toLocaleString()}đ
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => dispatch(updateQuantityAsync({ itemId: item.cartItemId, quantity: item.quantity - 1 }))}
                    className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 flex items-center justify-center font-bold"
                  >-</button>
                  <span className="font-semibold w-6 text-center">{item.quantity}</span>
                  <button
                    onClick={() => {
                        if (item.quantity >= 20) {
                            notification.info({
                                message: 'Limit Reached',
                                description: 'You can only order up to 20 units of each item per order.',
                                placement: 'topRight'
                            });
                            return;
                        }
                        dispatch(updateQuantityAsync({ itemId: item.cartItemId, quantity: item.quantity + 1 }));
                    }}
                    disabled={!item.isAvailable || item.quantity >= 20}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${(!item.isAvailable || item.quantity >= 20) ? 'bg-gray-300 cursor-not-allowed' : 'bg-primary hover:bg-orange-600'}`}
                  >+</button>
                </div>
                <button
                  onClick={() => dispatch(removeItemAsync(item.cartItemId))}
                  className="text-xs text-red-400 hover:text-red-800 font-medium underline"
                >Remove</button>
              </div>
            </div>
          ))}
        </div>

        <div className="w-full md:w-1/3 bg-gray-50 p-6 rounded-xl h-fit border border-gray-100">
          <h3 className="text-xl font-bold mb-4">Summary</h3>
          <div className="space-y-2 mb-4 text-gray-600">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{total.toLocaleString()}đ</span>
            </div>
            <div className="flex justify-between">
              <span>Delivery Fee</span>
              <span>{deliveryFee.toLocaleString()}đ</span>
            </div>
          </div>
          <div className="border-t pt-4 flex justify-between font-bold text-xl text-gray-800 mb-6">
            <span>Total</span>
            <span className="text-primary">{grandTotal.toLocaleString()}đ</span>
          </div>
          
          {hasUnavailableItems && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 text-xs rounded-lg border border-red-200 font-medium animate-pulse flex items-center gap-2">
              <ExclamationCircleFilled /> Some items are Out of Order. They are excluded from your total.
            </div>
          )}
          
          <button 
            className="btn-primary w-full py-4 text-lg rounded-xl shadow-lg hover:-translate-y-1 transition-transform"
            onClick={() => navigate('/customer/checkout')}
          >
            Go to Checkout
          </button>
        </div>
      </div>
    </div>
  );
}
