import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { updateQuantity, removeFromCart } from '../../redux/slices/cartSlice';
import { Link, useNavigate } from 'react-router-dom';

export default function CartPage() {
  const { items, total } = useSelector(state => state.cart);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const deliveryFee = items.length > 0 ? 15000 : 0;
  const grandTotal = total + deliveryFee;

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
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Your Cart</h1>

      <div className="bg-white rounded-2xl shadow-soft p-6 flex flex-col md:flex-row gap-8">
        <div className="flex-1 space-y-4">
          {items.map(item => (
            <div key={item.id} className="flex justify-between items-center p-4 border border-gray-100 rounded-xl">
              <div className="flex items-center gap-4">
                <img
                  src={item.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100&h=100&fit=crop'}
                  className="w-16 h-16 rounded-lg object-cover"
                  alt={item.name}
                />
                <div>
                  <h4 className="font-bold text-gray-800">{item.name}</h4>
                  <p className="text-primary font-medium">{item.price.toLocaleString()}đ</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => dispatch(updateQuantity({ id: item.id, quantity: item.quantity - 1 }))}
                    className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200"
                  >-</button>
                  <span className="font-semibold w-4 text-center">{item.quantity}</span>
                  <button
                    onClick={() => dispatch(updateQuantity({ id: item.id, quantity: item.quantity + 1 }))}
                    className="w-8 h-8 rounded-full bg-primary text-white hover:bg-orange-600"
                  >+</button>
                </div>
                <button
                  onClick={() => dispatch(removeFromCart(item.id))}
                  className="text-xs text-red-400 hover:text-red-600 font-medium"
                >Remove</button>
              </div>
            </div>
          ))}
        </div>

        <div className="w-full md:w-1/3 bg-gray-50 p-6 rounded-xl h-fit">
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
          <button 
            className="btn-primary w-full py-3 text-lg"
            onClick={() => navigate('/customer/checkout')}
          >
            Checkout
          </button>
        </div>
      </div>
    </div>
  );
}
