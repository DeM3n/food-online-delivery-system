import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from '../../api/axios';

const mockOffers = [
  { id: 1, title: '50% Off First Order!', img: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&h=300&fit=crop' },
  { id: 2, title: 'Free Delivery Weekend', img: 'https://images.unsplash.com/photo-1544148103-0773bf10d330?w=600&h=300&fit=crop' },
];

export default function Dashboard() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await axios.get('/menu/global-categories');
        if (response.data.success) {
          setCategories(response.data.data);
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchCategories();
  }, []);

  const handleSearch = () => {
    if (searchTerm.trim()) {
      navigate(`/customer/restaurants?search=${encodeURIComponent(searchTerm)}`);
    } else {
      navigate('/customer/restaurants');
    }
  };

  const handleCategoryClick = (category) => {
    navigate(`/customer/restaurants?category=${encodeURIComponent(category)}`);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Search Bar */}
      <div className="bg-white p-6 rounded-2xl shadow-soft flex items-center gap-4">
        <span className="text-xl">🔍</span>
        <input
          type="text"
          placeholder="Search for restaurants, cuisines, or dishes..."
          className="flex-1 outline-none text-lg bg-transparent"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
        />
        <button className="btn-primary" onClick={handleSearch}>Search</button>
      </div>

      {/* Hero Offers */}
      <section>
        <h2 className="text-2xl font-bold mb-4 text-gray-800">Special Offers</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {mockOffers.map(offer => (
            <div key={offer.id} className="relative rounded-2xl overflow-hidden shadow-soft h-48 group cursor-pointer">
              <img src={offer.img} alt={offer.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end p-6">
                <h3 className="text-white text-2xl font-bold">{offer.title}</h3>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section>
        <h2 className="text-2xl font-bold mb-4 text-gray-800">Categories</h2>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {loading ? (
            <div className="text-gray-400 italic">Loading categories...</div>
          ) : categories.length > 0 ? (
            categories.map(cat => (
              <div
                key={cat}
                className="min-w-[100px] bg-white rounded-full py-3 px-6 shadow-sm text-center font-medium cursor-pointer hover:bg-primary hover:text-white transition-colors duration-300"
                onClick={() => handleCategoryClick(cat)}
              >
                {cat}
              </div>
            ))
          ) : (
            <div className="text-gray-400 italic">No categories available</div>
          )}
        </div>
      </section>

      {/* Quick Links */}
      <div className="text-center mt-10">
        <Link to="/customer/restaurants" className="btn-secondary text-lg px-8 py-3">
          Explore All Restaurants
        </Link>
      </div>
    </div>
  );
}
