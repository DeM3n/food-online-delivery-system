import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from '../../api/axios';
import socket from '../../socket';
import { 
  SearchOutlined, 
  StarFilled, 
  CheckCircleFilled, 
  CloseCircleFilled, 
  ClockCircleOutlined,
  FireOutlined,
  ThunderboltOutlined,
  SafetyCertificateOutlined
} from '@ant-design/icons';

// Dummy data for categories
const categories = [
  { id: 'All', name: 'All', emoji: '🍽️' },
  { id: 'Pizza', name: 'Pizza', emoji: '🍕' },
  { id: 'Burger', name: 'Burgers', emoji: '🍔' },
  { id: 'Sushi', name: 'Sushi', emoji: '🍣' },
  { id: 'Pasta', name: 'Pasta', emoji: '🍝' },
  { id: 'Desserts', name: 'Desserts', emoji: '🍰' },
  { id: 'Drinks', name: 'Drinks', emoji: '🥤' },
  { id: 'Healthy', name: 'Healthy', emoji: '🥗' },
  { id: 'Asian', name: 'Asian', emoji: '🥢' },
];

export default function RestaurantList() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const searchParam = queryParams.get('search') || '';
  const categoryParam = queryParams.get('category') || '';

  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(searchParam);

  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        setLoading(true);
        let url = '/restaurants';
        const params = new URLSearchParams();
        if (searchParam) params.append('search', searchParam);
        if (categoryParam && categoryParam !== 'All') params.append('category', categoryParam);

        if (params.toString()) {
          url += '?' + params.toString();
        }

        const response = await axios.get(url);
        if (response.data.success) {
          setRestaurants(response.data.data);
        }
      } catch (error) {
        console.error('Error fetching restaurants:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchRestaurants();
  }, [searchParam, categoryParam]);

  useEffect(() => {
    const handleRestaurantStatusUpdated = (data) => {
      setRestaurants((prev) => prev.map((restaurant) => (
        String(restaurant.id) === String(data.restaurantId)
          ? { ...restaurant, is_open: data.is_open }
          : restaurant
      )));
    };

    socket.on('RESTAURANT_STATUS_UPDATED', handleRestaurantStatusUpdated);
    return () => socket.off('RESTAURANT_STATUS_UPDATED', handleRestaurantStatusUpdated);
  }, []);

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchTerm.trim()) params.append('search', searchTerm.trim());
    if (categoryParam) params.append('category', categoryParam);
    navigate(`/customer/restaurants?${params.toString()}`);
  };

  const setCategory = (catId) => {
    const params = new URLSearchParams();
    if (searchParam) params.append('search', searchParam);
    if (catId !== 'All') params.append('category', catId);
    navigate(`/customer/restaurants?${params.toString()}`);
  };

  return (
    <div className="pb-12 animate-slide-up">
      {/* 1. HERO SECTION */}
      <div className="relative overflow-hidden rounded-[2rem] mb-10 hero-gradient p-8 md:p-16 text-white min-h-[300px] flex flex-col justify-center items-center shadow-2xl">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none overflow-hidden">
          <FireOutlined className="absolute text-9xl -top-10 -left-10 rotate-12" />
          <ThunderboltOutlined className="absolute text-9xl bottom-0 right-10 -rotate-12" />
        </div>
        
        <div className="relative z-10 text-center max-w-2xl stagger-1">
          <h1 className="text-4xl md:text-6xl font-black mb-4 tracking-tight">Craving Something?</h1>
          <p className="text-lg md:text-xl opacity-90 mb-8 font-medium">Discover the best food from 2,000+ local restaurants, delivered straight to your doorstep.</p>
          
          <div className="bg-white p-2 rounded-2xl shadow-xl flex items-center gap-2 border border-white/20 w-full max-w-xl mx-auto">
            <div className="pl-4 text-gray-400">
              <SearchOutlined className="text-xl" />
            </div>
            <input
              type="text"
              placeholder="Search dishes, restaurants or cuisines..."
              className="flex-1 outline-none px-2 py-2 text-gray-800 font-medium placeholder:text-gray-400"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button
              className="bg-primary text-white px-6 py-2.5 rounded-xl font-bold hover:bg-orange-600 transition-all hover:scale-105 active:scale-95 shadow-md flex items-center gap-2"
              onClick={handleSearch}
            >
              Search
            </button>
          </div>
        </div>
      </div>

      {/* 2. CATEGORY SCROLL */}
      <div className="mb-12 stagger-2">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-black text-gray-800 tracking-tight">Explore Categories</h2>
          <span className="text-primary font-bold text-sm cursor-pointer hover:underline">See All</span>
        </div>
        <div className="flex gap-4 overflow-x-auto pt-2 pb-8 hide-scrollbar snap-x">
          {categories.map((cat) => (
            <div 
              key={cat.id} 
              onClick={() => setCategory(cat.id)}
              className={`category-chip snap-center ${((categoryParam || 'All') === cat.id) ? 'active scale-105' : ''}`}
            >
              <span className="text-3xl">{cat.emoji}</span>
              <span className="text-sm font-bold whitespace-nowrap">{cat.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 3. RESTAURANT GRID */}
      <div className="stagger-3">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-3xl font-black text-gray-800 tracking-tight">
              {categoryParam ? `${categoryParam} Choice` : searchParam ? `Results for "${searchParam}"` : 'Picked For You'}
            </h2>
            <p className="text-gray-500 font-medium text-sm mt-1">Based on location and ratings</p>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-400">Sort by:</span>
            <select className="bg-transparent font-bold text-gray-700 outline-none cursor-pointer">
              <option>Recommended</option>
              <option>Relevance</option>
              <option>Rating</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {loading ? (
            Array(6).fill(0).map((_, i) => (
              <div key={i} className="bg-gray-100 rounded-[2rem] h-[350px] animate-pulse"></div>
            ))
          ) : restaurants.length > 0 ? (
            restaurants.map(rest => (
              <div
                key={rest.id}
                className={`group bg-white rounded-[2rem] overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 border border-gray-100 cursor-pointer flex flex-col h-full transform translate-y-0 hover:-translate-y-2`}
                onClick={() => {
                  if (rest.is_open) navigate(`/customer/restaurant/${rest.id}`);
                }}
              >
                {/* Image Container */}
                <div className="h-56 overflow-hidden relative">
                  <img
                    src={rest.image_url || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&h=400&fit=crop'}
                    alt={rest.name}
                    className={`w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ${!rest.is_open ? 'grayscale' : ''}`}
                  />
                  
                  {/* Floating Badges */}
                  <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-2xl shadow-sm text-xs font-black text-gray-800 flex items-center gap-1">
                    <ClockCircleOutlined className="text-primary" /> 20-30 min
                  </div>
                  
                  <div className="absolute top-4 right-4 glass-card px-3 py-1.5 flex items-center gap-1 rounded-2xl shadow-md text-xs font-black text-gray-800">
                    <StarFilled className="text-yellow-400" /> {rest.rating}
                  </div>

                  {!rest.is_open && (
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center">
                      <span className="text-white text-sm font-black bg-red-600 px-4 py-2 rounded-2xl shadow-lg flex items-center gap-2">
                        <CloseCircleFilled /> CLOSED NOW
                      </span>
                    </div>
                  )}

                  {rest.is_open && (
                    <div className="absolute bottom-4 left-4 flex gap-2">
                      <span className="bg-green-500 text-white text-[10px] font-black px-2 py-1 rounded-lg shadow-sm flex items-center gap-1">
                        <SafetyCertificateOutlined /> PROMO
                      </span>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-6 flex flex-col flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xl font-black text-gray-800 leading-tight group-hover:text-primary transition-colors">{rest.name}</h3>
                  </div>
                  
                  <div className="flex items-center gap-2 text-gray-400 text-xs font-bold mb-4">
                    <span className="bg-gray-100 px-2 py-1 rounded-lg">{rest.cuisine_type}</span>
                    <span>•</span>
                    <span>Free Delivery</span>
                  </div>

                  <div className="mt-auto flex items-center justify-between pt-4 border-t border-gray-50">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Starting from</span>
                      <span className="text-base font-black text-gray-800">$5.00</span>
                    </div>
                    <button
                      className={`px-6 py-2 rounded-2xl font-black text-sm transition-all ${rest.is_open ? 'bg-orange-50 text-primary group-hover:bg-primary group-hover:text-white group-hover:scale-105' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                    >
                      {rest.is_open ? 'Order Now' : 'Closed'}
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-24 text-center">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-2xl font-black text-gray-800">No restaurants found</h3>
              <p className="text-gray-500 font-medium">Try adjusting your filters or search term</p>
              <button onClick={() => navigate('/customer/restaurants')} className="mt-6 text-primary font-bold hover:underline">
                Clear all filters
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
