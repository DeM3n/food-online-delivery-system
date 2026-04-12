import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import axios from '../../api/axios';
import { 
  SearchOutlined, 
  FireOutlined, 
  ThunderboltOutlined, 
  ArrowRightOutlined,
  GiftOutlined,
  StarFilled,
  ClockCircleOutlined
} from '@ant-design/icons';

const mockOffers = [
  { 
    id: 1, 
    title: '50% Off First Order!', 
    desc: 'Welcome to FoodieExpress!',
    color: 'from-orange-500 to-red-600',
    img: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&h=300&fit=crop' 
  },
  { 
    id: 2, 
    title: 'Free Delivery', 
    desc: 'On all orders above $20',
    color: 'from-emerald-500 to-teal-600',
    img: 'https://images.unsplash.com/photo-1544148103-0773bf10d330?w=600&h=300&fit=crop' 
  },
];

const categories = [
  { id: 'Pizza', name: 'Pizza', emoji: '🍕' },
  { id: 'Burger', name: 'Burgers', emoji: '🍔' },
  { id: 'Sushi', name: 'Sushi', emoji: '🍣' },
  { id: 'Pasta', name: 'Pasta', emoji: '🍝' },
  { id: 'Desserts', name: 'Desserts', emoji: '🍰' },
  { id: 'Drinks', name: 'Drinks', emoji: '🥤' },
  { id: 'Healthy', name: 'Healthy', emoji: '🥗' },
  { id: 'Asian', name: 'Asian', emoji: '🥢' },
];

export default function Dashboard() {
  const { user } = useSelector(state => state.auth);
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTopRestaurants = async () => {
      try {
        const response = await axios.get('/restaurants?limit=3');
        if (response.data.success) {
          setRestaurants(response.data.data.slice(0, 3));
        }
      } catch (error) {
        console.error('Error fetching top restaurants:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchTopRestaurants();
  }, []);

  const handleSearch = () => {
    if (searchTerm.trim()) {
      navigate(`/customer/restaurants?search=${encodeURIComponent(searchTerm)}`);
    } else {
      navigate('/customer/restaurants');
    }
  };

  const handleCategoryClick = (catId) => {
    navigate(`/customer/restaurants?category=${encodeURIComponent(catId)}`);
  };

  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <div className="pb-12 animate-slide-up">
      {/* 1. PERSONALIZED HERO SECTION */}
      <div className="relative overflow-hidden rounded-[2.5rem] mb-12 hero-gradient p-10 md:p-20 text-white shadow-2xl">
        <div className="absolute top-0 right-0 w-1/2 h-full opacity-10 pointer-events-none">
          <FireOutlined className="absolute text-[20rem] -top-20 -right-20 rotate-12" />
        </div>
        
        <div className="relative z-10 stagger-1">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-black tracking-widest uppercase mb-6">
            <ThunderboltOutlined /> Premium Food Delivery
          </div>
          <h1 className="text-4xl md:text-6xl font-black mb-4 tracking-tight">
            {getTimeGreeting()},<br />
            <span className="text-black/20">{user?.full_name || 'Foodie'}!</span>
          </h1>
          <p className="text-lg md:text-xl opacity-90 mb-10 font-medium max-w-md">What are you craving today? We have 2,000+ restaurants ready to serve you.</p>
          
          <div className="bg-white p-2 rounded-2xl shadow-2xl flex items-center gap-2 w-full max-w-xl">
            <div className="pl-4 text-gray-400">
              <SearchOutlined className="text-xl" />
            </div>
            <input
              type="text"
              placeholder="Search for restaurants, cuisines, or dishes..."
              className="flex-1 outline-none px-2 py-3 text-gray-800 font-medium placeholder:text-gray-400 text-lg"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button
              className="bg-primary text-white px-8 py-3.5 rounded-xl font-black hover:bg-orange-600 transition-all hover:scale-105 active:scale-95 shadow-lg hidden md:block"
              onClick={handleSearch}
            >
              FIND FOOD
            </button>
          </div>
        </div>
      </div>

      {/* 2. SPECIAL OFFERS */}
      <section className="mb-12 stagger-2">
        <div className="flex justify-between items-center mb-6 px-2">
          <h2 className="text-2xl font-black text-gray-800 tracking-tight flex items-center gap-2">
            <GiftOutlined className="text-primary" /> Exclusive Offers
          </h2>
          <span className="text-primary font-bold text-sm cursor-pointer hover:underline">View All</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {mockOffers.map(offer => (
            <div key={offer.id} className="relative rounded-[2rem] overflow-hidden shadow-xl h-56 group cursor-pointer transition-all hover:shadow-2xl hover:-translate-y-1">
              <img src={offer.img} alt={offer.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
              <div className={`absolute inset-0 bg-gradient-to-r ${offer.color} opacity-40 group-hover:opacity-50 transition-opacity`}></div>
              <div className="absolute inset-0 flex flex-col justify-end p-8">
                <div className="bg-white/90 backdrop-blur-md w-fit px-3 py-1 rounded-xl text-[10px] font-black text-primary mb-2 shadow-sm uppercase tracking-tighter">Limited Time</div>
                <h3 className="text-white text-3xl font-black leading-tight drop-shadow-md">{offer.title}</h3>
                <p className="text-white/90 font-bold mb-4">{offer.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. VISUAL CATEGORIES */}
      <section className="mb-12 stagger-3">
        <h2 className="text-2xl font-black text-gray-800 mb-6 tracking-tight px-2">What's on your mind?</h2>
        <div className="flex gap-5 overflow-x-auto pt-2 pb-8 hide-scrollbar px-2 snap-x">
          {categories.map(cat => (
            <div
              key={cat.id}
              className={`category-chip snap-center min-w-[120px] hover:scale-110 active:scale-95 transition-all ${((new URLSearchParams(location.search).get('category')) === cat.id) ? 'active scale-105' : ''}`}
              onClick={() => handleCategoryClick(cat.id)}
            >
              <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center text-4xl mb-1 shadow-inner group-hover:bg-white transition-colors">
                {cat.emoji}
              </div>
              <span className="text-sm font-black text-gray-700">{cat.name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 4. FEATURED RESTAURANTS PREVIEW */}
      <section className="stagger-4">
        <div className="flex justify-between items-center mb-8 px-2">
          <div>
            <h2 className="text-3xl font-black text-gray-800 tracking-tight">Popular Near You</h2>
            <p className="text-gray-400 font-bold text-sm">Top rated spots in your area</p>
          </div>
          <Link to="/customer/restaurants" className="group flex items-center gap-2 bg-orange-50 text-primary font-black px-6 py-2.5 rounded-2xl hover:bg-primary hover:text-white transition-all shadow-sm">
            See All <ArrowRightOutlined className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {loading ? (
             Array(3).fill(0).map((_, i) => (
              <div key={i} className="bg-gray-100 rounded-[2rem] h-64 animate-pulse"></div>
            ))
          ) : restaurants.map(rest => (
            <div
              key={rest.id}
              onClick={() => navigate(`/customer/restaurant/${rest.id}`)}
              className="group bg-white rounded-[2rem] overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 border border-gray-50 flex flex-col cursor-pointer"
            >
              <div className="h-44 overflow-hidden relative">
                <img src={rest.image_url || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&h=400&fit=crop'} alt={rest.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                <div className="absolute top-4 right-4 glass-card px-3 py-1.5 flex items-center gap-1 rounded-2xl shadow-md text-xs font-black text-gray-800">
                  <StarFilled className="text-yellow-400" /> {rest.rating}
                </div>
                <div className="absolute bottom-4 left-4 flex gap-2">
                  <span className="bg-white/90 backdrop-blur-md text-gray-800 text-[10px] font-black px-2 py-1 rounded-lg shadow-sm flex items-center gap-1">
                    <ClockCircleOutlined className="text-primary" /> 20-30 min
                  </span>
                </div>
              </div>
              <div className="p-6">
                <h3 className="font-black text-gray-800 text-lg group-hover:text-primary transition-colors leading-tight">{rest.name}</h3>
                <p className="text-gray-400 text-xs font-bold mt-1 uppercase tracking-widest">{rest.cuisine_type}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
