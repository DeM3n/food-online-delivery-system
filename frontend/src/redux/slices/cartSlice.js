import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

// API BASE URL
const API_URL = 'http://localhost:5001/api/cart';

// Utility to get config
const getThunkConfig = (thunkAPI) => {
    const token = thunkAPI.getState().auth.token;
    return { headers: { Authorization: `Bearer ${token}` } };
};

// Async Thunks
export const fetchCart = createAsyncThunk('cart/fetch', async (_, thunkAPI) => {
    const response = await axios.get(API_URL, getThunkConfig(thunkAPI));
    return response.data.data; // This will be the Cart object with CartItems
});

export const addToCartAsync = createAsyncThunk('cart/add', async (itemData, thunkAPI) => {
    // itemData: { menu_item_id, quantity, restaurant_id }
    await axios.post(`${API_URL}/items`, itemData, getThunkConfig(thunkAPI));
    thunkAPI.dispatch(fetchCart());
});

export const updateQuantityAsync = createAsyncThunk('cart/updateQuantity', async ({ itemId, quantity }, thunkAPI) => {
    await axios.put(`${API_URL}/items/${itemId}`, { quantity }, getThunkConfig(thunkAPI));
    thunkAPI.dispatch(fetchCart());
});

export const removeItemAsync = createAsyncThunk('cart/removeItem', async (itemId, thunkAPI) => {
    await axios.delete(`${API_URL}/items/${itemId}`, getThunkConfig(thunkAPI));
    thunkAPI.dispatch(fetchCart());
});

export const clearCartAsync = createAsyncThunk('cart/clear', async (_, thunkAPI) => {
    await axios.delete(API_URL, getThunkConfig(thunkAPI));
    return null;
});

const initialState = {
    items: [],
    restaurantId: null,
    total: 0,
    loading: false,
    error: null
};

const cartSlice = createSlice({
    name: 'cart',
    initialState,
    reducers: {
        // Local state cleanup on logout
        resetCartState: (state) => {
            state.items = [];
            state.restaurantId = null;
            state.total = 0;
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchCart.pending, (state) => {
                state.loading = true;
            })
            .addCase(fetchCart.fulfilled, (state, action) => {
                state.loading = false;
                const cartData = action.payload;
                
                if (cartData && cartData.CartItems) {
                    state.items = cartData.CartItems
                        .filter(ci => ci.MenuItem) // Safety: ensure MenuItem exists
                        .map(ci => ({
                            cartItemId: ci.id,
                            id: ci.MenuItem.id,
                            name: ci.MenuItem.name,
                            price: ci.MenuItem.price,
                            image: ci.MenuItem.image_url,
                            quantity: ci.quantity,
                            isAvailable: ci.MenuItem.is_available
                        }));
                    state.restaurantId = cartData.restaurant_id;
                    state.total = state.items
                        .filter(i => i.isAvailable)
                        .reduce((acc, i) => acc + (i.price * i.quantity), 0);
                } else {
                    state.items = [];
                    state.restaurantId = null;
                    state.total = 0;
                }
            })
            .addCase(fetchCart.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message;
            })
            .addCase(clearCartAsync.fulfilled, (state) => {
                state.items = [];
                state.restaurantId = null;
                state.total = 0;
            });
    }
});

export const { resetCartState } = cartSlice.actions;
export default cartSlice.reducer;
