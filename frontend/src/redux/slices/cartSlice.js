import { createSlice } from '@reduxjs/toolkit';

const cartSlice = createSlice({
  name: 'cart',
  initialState: {
    items: [],
    restaurantId: null,
    total: 0,
  },
  reducers: {
    addToCart: (state, action) => {
      const item = action.payload;
      if (state.restaurantId && state.restaurantId !== item.restaurantId) {
        state.items = [{ ...item, quantity: 1 }];
        state.restaurantId = item.restaurantId;
        state.total = item.price;
      } else {
        const existing = state.items.find(i => i.id === item.id);
        if (existing) {
          existing.quantity += 1;
        } else {
          state.items.push({ ...item, quantity: 1 });
        }
        state.restaurantId = item.restaurantId;
        state.total = state.items.reduce((acc, i) => acc + (i.price * i.quantity), 0);
      }
    },
    removeFromCart: (state, action) => {
      const itemId = action.payload;
      state.items = state.items.filter(i => i.id !== itemId);
      if (state.items.length === 0) state.restaurantId = null;
      state.total = state.items.reduce((acc, i) => acc + (i.price * i.quantity), 0);
    },
    updateQuantity: (state, action) => {
      const { id, quantity } = action.payload;
      const item = state.items.find(i => i.id === id);
      if (item) {
        if (quantity <= 0) {
          state.items = state.items.filter(i => i.id !== id);
        } else {
          item.quantity = quantity;
        }
      }
      if (state.items.length === 0) state.restaurantId = null;
      state.total = state.items.reduce((acc, i) => acc + (i.price * i.quantity), 0);
    },
    clearCart(state) {
      state.items = [];
      state.restaurantId = null;
      state.total = 0;
    }
  },
});

export const { addToCart, removeFromCart, updateQuantity, clearCart } = cartSlice.actions;
export default cartSlice.reducer;
