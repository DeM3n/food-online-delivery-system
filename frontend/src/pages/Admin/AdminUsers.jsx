import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { UserOutlined, MailOutlined, PhoneOutlined, SafetyOutlined } from '@ant-design/icons';

export default function AdminUsers() {
  const { token } = useSelector(state => state.auth);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const response = await axios.get('http://localhost:5001/api/admin/users', config);
        if (response.data.success) {
          setUsers(response.data.data);
        }
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [token]);

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin': return <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border border-red-200">Admin</span>;
      case 'restaurant': return <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border border-orange-200">Restaurant</span>;
      case 'delivery_partner': return <span className="bg-teal-100 text-teal-700 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border border-teal-200">Driver</span>;
      default: return <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border border-blue-200">Customer</span>;
    }
  };

  return (
    <div className="animate-fade-in max-w-6xl mx-auto p-4 md:p-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">User Management</h1>
          <p className="text-gray-500 mt-1">Manage all system users and their roles</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-soft border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-gray-400">Loading users...</div>
        ) : users.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b text-gray-500 text-xs uppercase tracking-widest font-bold">
                  <th className="p-6">User Details</th>
                  <th className="p-6">Contact</th>
                  <th className="p-6">Role</th>
                  <th className="p-6">Joined Date</th>
                  <th className="p-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users.map(user => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold">
                          {user.full_name?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <div className="text-gray-800 font-bold text-sm tracking-tight">{user.full_name || 'N/A'}</div>
                          <div className="text-xs text-gray-400 font-mono mt-0.5">{user.id.slice(0, 8)}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-6">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <MailOutlined className="text-primary text-[10px]" /> {user.email}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <PhoneOutlined className="text-secondary text-[10px]" /> {user.phone_number || 'No phone'}
                        </div>
                      </div>
                    </td>
                    <td className="p-6">
                      {getRoleBadge(user.role)}
                    </td>
                    <td className="p-6">
                      <div className="text-xs text-gray-500 font-medium">
                        {new Date(user.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                    </td>
                    <td className="p-6 text-right">
                      <button className="text-xs font-bold text-primary hover:text-orange-600 transition-colors uppercase tracking-widest">
                        Manage
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-20 text-center text-gray-400 italic">No users found.</div>
        )}
      </div>
    </div>
  );
}
