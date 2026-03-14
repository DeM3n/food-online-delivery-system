import React, { useState } from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

const RegisterSchema = Yup.object().shape({
    full_name: Yup.string().required('Full name is required'),
    email: Yup.string().email('Invalid email').required('Email is required'),
    password: Yup.string().min(6, 'Password must be at least 6 characters').required('Password is required'),
    phone_number: Yup.string().required('Phone number is required'),
    role: Yup.string().oneOf(['customer', 'restaurant', 'delivery_partner'], 'Invalid role').required('Role is required'),
});

export default function Register() {
    const navigate = useNavigate();
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
            <div className="bg-white p-8 rounded-2xl shadow-soft w-full max-w-md">
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-primary">Register</h2>
                    <p className="text-gray-500 mt-2">Join the FoodDelivery network</p>
                </div>

                {error && <div className="bg-red-100 text-red-600 p-3 rounded-lg mb-4 text-sm text-center">{error}</div>}
                {success && <div className="bg-green-100 text-green-600 p-3 rounded-lg mb-4 text-sm text-center">{success}</div>}

                <Formik
                    initialValues={{
                        full_name: '',
                        email: '',
                        password: '',
                        phone_number: '',
                        role: 'customer'
                    }}
                    validationSchema={RegisterSchema}
                    onSubmit={async (values, { setSubmitting }) => {
                        try {
                            setError('');
                            const response = await axios.post('http://localhost:5001/api/auth/register', values);
                            if (response.data.success) {
                                setSuccess('Registration successful! Redirecting...');
                                setTimeout(() => navigate('/login'), 2000);
                            }
                        } catch (err) {
                            setError(err.response?.data?.message || 'Registration failed. Please try again.');
                            setSubmitting(false);
                        }
                    }}
                >
                    {({ isSubmitting }) => (
                        <Form className="flex flex-col gap-4">
                            <div>
                                <Field type="text" name="full_name" className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-primary" placeholder="Full Name" />
                                <ErrorMessage name="full_name" component="div" className="text-red-500 text-sm mt-1" />
                            </div>

                            <div>
                                <Field type="email" name="email" className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-primary" placeholder="Email Address" />
                                <ErrorMessage name="email" component="div" className="text-red-500 text-sm mt-1" />
                            </div>

                            <div>
                                <Field type="password" name="password" className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-primary" placeholder="Password" />
                                <ErrorMessage name="password" component="div" className="text-red-500 text-sm mt-1" />
                            </div>

                            <div>
                                <Field type="text" name="phone_number" className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-primary" placeholder="Phone Number" />
                                <ErrorMessage name="phone_number" component="div" className="text-red-500 text-sm mt-1" />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">I am a:</label>
                                <Field as="select" name="role" className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-primary">
                                    <option value="customer">Customer</option>
                                    <option value="restaurant">Restaurant Owner</option>
                                    <option value="delivery_partner">Delivery Driver</option>
                                </Field>
                                <ErrorMessage name="role" component="div" className="text-red-500 text-sm mt-1" />
                            </div>

                            <button type="submit" disabled={isSubmitting} className="btn-primary w-full mt-4">
                                {isSubmitting ? 'Registering...' : 'Register Now'}
                            </button>

                            <div className="text-sm text-center mt-4 text-gray-500">
                                Already have an account? <Link to="/login" className="text-primary font-bold">Sign In</Link>
                            </div>
                        </Form>
                    )}
                </Formik>
            </div>
        </div>
    );
}
