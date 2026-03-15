import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from '../../api/axios';

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
        if (categoryParam) params.append('category', categoryParam);

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

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchTerm.trim()) params.append('search', searchTerm.trim());
    if (categoryParam) params.append('category', categoryParam);
    navigate(`/customer/restaurants?${params.toString()}`);
  };

  const clearFilters = () => {
    setSearchTerm('');
    navigate('/customer/restaurants');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">
            {categoryParam ? `${categoryParam} Restaurants` : searchParam ? `Search Results for "${searchParam}"` : 'Popular Restaurants'}
          </h1>
          {(searchParam || categoryParam) && (
            <button
              onClick={clearFilters}
              className="text-primary text-sm font-medium hover:underline mt-1"
            >
              Clear all filters
            </button>
          )}
        </div>

        <div className="bg-white p-2 rounded-xl shadow-sm flex items-center gap-2 border border-gray-100 w-full md:w-96">
          <input
            type="text"
            placeholder="Search restaurants or cuisines..."
            className="flex-1 outline-none px-2 py-1 bg-transparent"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button
            className="bg-primary text-white p-2 rounded-lg hover:bg-primary-dark transition-colors"
            onClick={handleSearch}
          >
            🔍
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {loading ? (
          <div className="col-span-full py-20 text-center text-gray-500 text-xl font-medium">
            Loading restaurants...
          </div>
        ) : restaurants.length > 0 ? (
          restaurants.map(rest => (
            <div
              key={rest.id}
              className="card overflow-hidden group cursor-pointer border border-gray-100"
              onClick={() => navigate(`/customer/restaurant/${rest.id}`)}
            >
              <div className="h-48 overflow-hidden relative">
                <img
                  src={rest.image_url || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&h=400&fit=crop'}
                  alt={rest.name}
                  className={`w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 ${!rest.is_open ? 'grayscale' : ''}`}
                />
                <div className="absolute top-4 right-4 bg-white px-2 py-1 flex items-center gap-1 rounded-full shadow-md text-sm font-bold text-gray-700">
                  ⭐ {rest.rating}
                </div>
                {!rest.is_open && (
                  <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
                    <span className="text-white font-bold bg-red-500 px-3 py-1 rounded">CLOSED</span>
                  </div>
                )}
              </div>
              <div className="p-5">
                <h3 className="text-xl font-bold text-gray-800 mb-1">{rest.name}</h3>
                <div className="flex justify-between items-center text-gray-500 text-sm">
                  <span>{rest.cuisine_type}</span>
                  <span className="flex items-center gap-1">{rest.is_open ? '🟢 Open Now' : '🔴 Closed'}</span>
                </div>
                <button
                  className="w-full mt-4 py-2 bg-orange-50 hover:bg-orange-100 text-primary rounded-lg font-semibold transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/customer/restaurant/${rest.id}`);
                  }}
                >
                  View Menu
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-20 text-center text-gray-500 text-xl font-medium">
            No restaurants found.
          </div>
        )}
      </div>
    </div>
  );
}
