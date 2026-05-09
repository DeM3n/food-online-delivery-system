import React, { useState } from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { useDispatch } from 'react-redux';
import { loginSuccess } from '../../redux/slices/authSlice';
import { fetchCart } from '../../redux/slices/cartSlice';
import { useNavigate, Link } from 'react-router-dom';
import axios from '../../api/axios';
import { MailOutlined, LockOutlined, GoogleOutlined, ArrowRightOutlined, ExclamationCircleFilled } from '@ant-design/icons';
import authHero from '../../assets/auth-hero.png';

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
      default: navigate('/customer');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center auth-bg p-4">
      <div className="auth-card z-10 animate-slide-up shadow-2xl">
        {/* Illustration Side */}
        <div className="auth-illustration-side">
          <div className="z-10 animate-slide-up stagger-1">
            <h1 className="text-4xl font-extrabold mb-4 tracking-tight">FoodieExpress</h1>
            <p className="text-lg opacity-90 max-w-xs">Connecting you with the best restaurants in town, delivered right to your door.</p>
          </div>
          
          <div className="relative z-10 flex justify-center py-8 animate-slide-up stagger-2">
            <img 
              src={authHero} 
              alt="Food" 
              className="w-full max-w-[320px] drop-shadow-2xl animate-float"
              style={{ filter: 'drop-shadow(0 20px 30px rgba(0,0,0,0.2))' }}
            />
          </div>

          <div className="z-10 text-sm opacity-75 animate-slide-up stagger-3">
            © 2026 FoodieExpress Inc. All rights reserved.
          </div>
          
          {/* Decorative elements */}
          <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-[-5%] left-[-5%] w-48 h-48 bg-black/10 rounded-full blur-2xl"></div>
        </div>

        {/* Form Side */}
        <div className="auth-form-side">
          <div className="mb-6 text-center md:text-left animate-slide-up stagger-1">
            <h2 className="text-3xl font-black text-gray-800 mb-1">Welcome Back!</h2>
            <p className="text-gray-500 text-sm">Sign in to continue your culinary journey.</p>
          </div>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-3 rounded-xl mb-4 flex items-center gap-3 animate-slide-up stagger-1 text-sm">
              <ExclamationCircleFilled />
              {error}
            </div>
          )}

          <Formik
            initialValues={{ email: '', password: '' }}
            validationSchema={LoginSchema}
            onSubmit={async (values, { setSubmitting }) => {
              try {
                setError('');
                const response = await axios.post('/auth/login', values);
                const { data } = response.data;
                let profileData = data.profile;

                // Microservices: Fetch restaurant profile manually
                if (data.role.toLowerCase() === 'restaurant' && !profileData) {
                  try {
                    const profileRes = await axios.get('/restaurants/my-profile', {
                      headers: { Authorization: `Bearer ${data.token}` }
                    });
                    profileData = profileRes.data.data;
                  } catch (profileErr) {
                    if (profileErr.response?.status === 404) {
                        try {
                            const createRes = await axios.post('/restaurants', {
                              name: data.full_name + "'s Restaurant"
                            }, { headers: { Authorization: `Bearer ${data.token}` } });
                            profileData = createRes.data.data;
                          } catch (createErr) {
                            console.error('Failed to auto-create restaurant profile:', createErr);
                          }
                    } else {
                        console.error("Could not fetch restaurant profile", profileErr);
                    }
                  }
                }

                dispatch(loginSuccess({
                  user: { 
                    id: data.id,
                    email: data.email, 
                    role: data.role,
                    full_name: data.full_name,
                    phone_number: data.phone_number
                  },
                  profile: profileData,
                  token: data.token
                }));

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
                <div className="animate-slide-up stagger-2">
                  <div className="relative group">
                    <MailOutlined className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors text-lg z-10" />
                    <Field 
                      type="email" 
                      name="email" 
                      className="floating-input input-with-icon" 
                      placeholder="Email Address" 
                    />
                  </div>
                  <ErrorMessage name="email" component="div" className="text-red-500 text-xs mt-1 ml-2 font-medium" />
                </div>

                <div className="animate-slide-up stagger-2">
                  <div className="relative group">
                    <LockOutlined className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors text-lg z-10" />
                    <Field 
                      type="password" 
                      name="password" 
                      className="floating-input input-with-icon" 
                      placeholder="Password" 
                    />
                  </div>
                  <ErrorMessage name="password" component="div" className="text-red-500 text-xs mt-1 ml-2 font-medium" />
                </div>

                <div className="flex justify-end animate-slide-up stagger-2">
                  <span className="text-xs font-semibold text-primary hover:underline cursor-pointer">Forgot Password?</span>
                </div>

                <button 
                  type="submit" 
                  disabled={isSubmitting} 
                  className="btn-primary py-3 text-base mt-2 flex items-center justify-center gap-2 group animate-slide-up stagger-3"
                >
                  {isSubmitting ? 'Signing In...' : (
                    <>
                      Sign In
                      <ArrowRightOutlined className="group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>

                <div className="relative my-4 animate-slide-up stagger-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-100"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white text-gray-400 font-medium uppercase tracking-wider">Or continue with</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 animate-slide-up stagger-4">
                  <button type="button" className="social-btn">
                    <GoogleOutlined className="text-red-500" /> Google
                  </button>
                  <button type="button" className="social-btn">
                    <span className="text-blue-600 font-bold">f</span> Facebook
                  </button>
                </div>

                <div className="text-center mt-6 text-gray-500 flex flex-col items-center animate-slide-up stagger-5">
                  <span>Don't have an account?</span>
                  <Link to="/register" className="text-primary font-black text-lg hover:translate-x-1 transition-transform inline-flex items-center gap-1 group">
                    Create Account 
                    <ArrowRightOutlined className="text-sm group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </Form>
            )}
          </Formik>
        </div>
      </div>
    </div>
  );
}
