import React, { useState } from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { useDispatch } from 'react-redux';
import { loginSuccess } from '../../redux/slices/authSlice';
import { fetchCart } from '../../redux/slices/cartSlice';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

const LoginSchema = Yup.object().shape({
  email: Yup.string().email('Invalid email').required('Required'),
  password: Yup.string().required('Required'),
});

export default function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  const handleRedirect = (role) => {
    switch (role.toLowerCase()) {
      case 'customer': navigate('/customer'); break;
      case 'restaurant': navigate('/restaurant'); break;
      case 'delivery_partner': navigate('/delivery'); break;
      case 'admin': navigate('/admin'); break;
      case 'customer_support': navigate('/admin'); break; // Assuming support shares admin layout or has its own
      default: navigate('/customer');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-2xl shadow-soft w-96">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-primary">Login</h2>
          <p className="text-gray-500 mt-2">Welcome back to FoodDelivery</p>
        </div>

        {error && <div className="bg-red-100 text-red-600 p-3 rounded-lg mb-4 text-sm">{error}</div>}

        <Formik
          initialValues={{ email: '', password: '' }}
          validationSchema={LoginSchema}
          onSubmit={async (values, { setSubmitting }) => {
            try {
              setError('');
              // Connecting to real backend
              const response = await axios.post('http://localhost:5001/api/auth/login', values);
              const { data } = response.data;

              dispatch(loginSuccess({
                user: { 
                  id: data.id,
                  email: data.email, 
                  role: data.role,
                  full_name: data.full_name,
                  phone_number: data.phone_number
                },
                profile: data.profile,
                token: data.token
              }));

              // Fetch cart right after login if customer
              if (data.role.toLowerCase() === 'customer') {
                dispatch(fetchCart());
              }

              handleRedirect(data.role);
            } catch (err) {
              setError(err.response?.data?.message || 'Login failed. Please try again.');
              setSubmitting(false);
            }
          }}
        >
          {({ isSubmitting }) => (
            <Form className="flex flex-col gap-4">
              <div>
                <Field type="email" name="email" className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-primary" placeholder="Email Address" />
                <ErrorMessage name="email" component="div" className="text-red-500 text-sm mt-1" />
              </div>

              <div>
                <Field type="password" name="password" className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-primary" placeholder="Password" />
                <ErrorMessage name="password" component="div" className="text-red-500 text-sm mt-1" />
              </div>

              <button type="submit" disabled={isSubmitting} className="btn-primary w-full mt-4">
                {isSubmitting ? 'Signing In...' : 'Sign In'}
              </button>

              <div className="text-sm text-center mt-4 text-gray-500">
                Don't have an account? <Link to="/register" className="text-primary cursor-pointer font-bold">Sign Up</Link>
              </div>
            </Form>
          )}
        </Formik>
      </div>
    </div>
  );
}
