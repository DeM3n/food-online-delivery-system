import React, { useState } from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { useNavigate, Link } from 'react-router-dom';
import axios from '../../api/axios';
import { 
    UserOutlined, 
    MailOutlined, 
    LockOutlined, 
    PhoneOutlined, 
    SolutionOutlined, 
    ArrowRightOutlined, 
    ShopOutlined, 
    IdcardOutlined, 
    ArrowLeftOutlined,
    EnvironmentOutlined,
    SafetyCertificateOutlined,
    CarOutlined
} from '@ant-design/icons';
import authHero from '../../assets/auth-hero.png';

const RegisterSchema = Yup.object().shape({
    full_name: Yup.string().required('Full name is required'),
    email: Yup.string().email('Invalid email').required('Email is required'),
    password: Yup.string().min(6, 'Password must be at least 6 characters').required('Password is required'),
    confirm_password: Yup.string()
        .oneOf([Yup.ref('password'), null], 'Passwords must match')
        .required('Confirm password is required'),
    phone_number: Yup.string().required('Phone number is required'),
    role: Yup.string().oneOf(['customer', 'restaurant', 'delivery_partner'], 'Invalid role').required('Role is required'),
    
    // Restaurant specific validation
    name: Yup.string().when('role', {
        is: 'restaurant',
        then: () => Yup.string().required('Restaurant name is required'),
        otherwise: () => Yup.string().notRequired()
    }),
    address: Yup.string().when('role', {
        is: 'restaurant',
        then: () => Yup.string().required('Restaurant address is required'),
        otherwise: () => Yup.string().notRequired()
    }),
    business_license: Yup.string().when('role', {
        is: 'restaurant',
        then: () => Yup.string().required('Business license is required'),
        otherwise: () => Yup.string().notRequired()
    }),

    // Driver specific validation
    vehicle_license: Yup.string().when('role', {
        is: 'delivery_partner',
        then: () => Yup.string().required('License plate is required'),
        otherwise: () => Yup.string().notRequired()
    }),
    id_card: Yup.string().when('role', {
        is: 'delivery_partner',
        then: () => Yup.string().required('ID Card number is required'),
        otherwise: () => Yup.string().notRequired()
    }),
    vehicle_type: Yup.string().when('role', {
        is: 'delivery_partner',
        then: () => Yup.string().required('Vehicle type is required'),
        otherwise: () => Yup.string().notRequired()
    })
});

export default function Register() {
    const navigate = useNavigate();
    const [step, setStep] = useState(0); // 0: Selection, 1: Form
    const [selectedRole, setSelectedRole] = useState('customer');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const roles = [
        { 
            id: 'customer', 
            title: 'Customer', 
            desc: 'Order delicious food from your favorite restaurants.',
            icon: <UserOutlined className="text-3xl" />,
            color: 'bg-orange-500'
        },
        { 
            id: 'restaurant', 
            title: 'Restaurant', 
            desc: 'Partner with us and grow your food business.',
            icon: <SolutionOutlined className="text-3xl" />,
            color: 'bg-emerald-500'
        },
        { 
            id: 'delivery_partner', 
            title: 'Delivery', 
            desc: 'Earn money on your own schedule with deliveries.',
            icon: <PhoneOutlined className="rotate-90 text-3xl" />,
            color: 'bg-blue-500'
        }
    ];

    const handleRoleSelect = (roleId) => {
        setSelectedRole(roleId);
        setStep(1);
    };

    // Determine if we should show the expanded layout
    const isExpanded = step === 1 && selectedRole !== 'customer';

    return (
        <div className="min-h-screen flex items-center justify-center auth-bg p-4 py-8">
            <div className={`auth-card z-10 animate-fade-in shadow-2xl ${isExpanded ? 'expanded' : ''}`}>
                {/* Illustration Side */}
                <div className="auth-illustration-side">
                    <div className="z-10 animate-slide-up" key={selectedRole === 'customer' ? `title-${step}` : 'partner-title'}>
                        <h1 className="text-4xl font-extrabold mb-4 tracking-tight stagger-1">
                            {step === 0 ? 'Start Your Journey' : 'Create Account'}
                        </h1>
                        <p className="text-lg opacity-90 max-w-xs stagger-2">
                            {step === 0 
                                ? 'Choose how you want to join the FoodieExpress community.' 
                                : `You're joining as a ${selectedRole.split('_').join(' ')}.`}
                        </p>
                    </div>
                    
                    <div className="relative z-10 flex justify-center py-6 animate-slide-up stagger-3" key={selectedRole === 'customer' ? `img-${step}` : 'partner-img'}>
                        <img 
                            src={authHero} 
                            alt="Food" 
                            className="w-full max-w-[280px] drop-shadow-2xl animate-float-slow"
                            style={{ filter: 'drop-shadow(0 20px 30px rgba(0,0,0,0.2)) rotate(-5deg)' }}
                        />
                    </div>

                    <div className="z-10 text-sm opacity-75 animate-slide-up stagger-4" key={selectedRole === 'customer' ? `footer-${step}` : 'partner-footer'}>
                        Trusted by 10,000+ local partners and foodies.
                    </div>
                    
                    {/* Decorative elements */}
                    <div className="absolute top-[-5%] left-[-10%] w-72 h-72 bg-white/10 rounded-full blur-3xl"></div>
                    <div className="absolute bottom-[20%] right-[-5%] w-40 h-40 bg-black/5 rounded-full blur-2xl"></div>
                </div>

                {/* Form Side */}
                <div className="auth-form-side">
                    {step === 0 ? (
                        <div className="animate-slide-up">
                            <div className="mb-6 text-center md:text-left stagger-1">
                                <h2 className="text-2xl font-black text-gray-800 mb-1">How do you want to join?</h2>
                                <p className="text-gray-500 text-sm">Select your path to get started</p>
                            </div>

                            <div className="flex flex-col gap-3 stagger-2">
                                {roles.map((role) => (
                                    <div 
                                        key={role.id}
                                        onClick={() => handleRoleSelect(role.id)}
                                        className="role-selection-card group"
                                    >
                                        <div className={`w-14 h-14 rounded-2xl ${role.color} text-white flex items-center justify-center transition-transform group-hover:scale-110 shadow-lg`}>
                                            {role.icon}
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-bold text-gray-800 text-lg group-hover:text-primary transition-colors">{role.title}</h3>
                                            <p className="text-xs text-gray-500 font-medium">{role.desc}</p>
                                        </div>
                                        <ArrowRightOutlined className="text-gray-300 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                                    </div>
                                ))}
                            </div>

                            <div className="text-center mt-6 text-gray-500 text-sm stagger-3">
                                Already have an account? 
                                <Link to="/login" className="text-primary font-black ml-2 hover:underline">
                                    Sign In
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col justify-center">
                            <div className="mb-4 flex items-center gap-3 animate-slide-up stagger-1">
                                <span 
                                    onClick={() => setStep(0)} 
                                    className="p-2 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors text-gray-400 hover:text-primary flex items-center justify-center"
                                >
                                    <ArrowLeftOutlined />
                                </span>
                                <div>
                                    <h2 className="text-2xl font-black text-gray-800 mb-0">Join as {selectedRole.split('_').join(' ')}</h2>
                                    <p className="text-gray-500 text-[11px] font-medium">Please provide your details below to create your profile.</p>
                                </div>
                            </div>

                            {error && (
                                <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-2.5 rounded-xl mb-3 animate-slide-up stagger-1 text-[11px] font-medium">
                                    {error}
                                </div>
                            )}
                            {success && (
                                <div className="bg-green-50 border-l-4 border-green-500 text-green-700 p-2.5 rounded-xl mb-3 animate-slide-up stagger-1 text-[11px] font-medium">
                                    {success}
                                </div>
                            )}

                            <Formik
                                initialValues={{
                                    full_name: '',
                                    email: '',
                                    password: '',
                                    confirm_password: '',
                                    phone_number: '',
                                    role: selectedRole,
                                    name: '',
                                    address: '',
                                    business_license: '',
                                    vehicle_license: '',
                                    id_card: '',
                                    vehicle_type: 'Motorcycle'
                                }}
                                validationSchema={RegisterSchema}
                                enableReinitialize={true}
                                onSubmit={async (values, { setSubmitting }) => {
                                    try {
                                        setError('');
                                        const response = await axios.post('/auth/register', values);
                                        if (response.data.success) {
                                            setSuccess('Registration successful! Redirecting...');
                                            setTimeout(() => navigate('/login'), 2000);
                                        }
                                    } catch (err) {
                                        console.error('Registration error:', err.response?.data);
                                        setError(err.response?.data?.message || 'Registration failed. Check your details.');
                                        setSubmitting(false);
                                    }
                                }}
                            >
                                {({ isSubmitting }) => (
                                    <Form className="flex flex-col gap-3">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
                                            {/* Common Fields - Staggered */}
                                            <div className="col-span-1 animate-slide-up stagger-2">
                                                <div className="relative group">
                                                    <UserOutlined className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors z-10" />
                                                    <Field 
                                                        type="text" 
                                                        name="full_name" 
                                                        className="floating-input py-2.5 input-with-icon" 
                                                        placeholder={selectedRole === 'customer' ? 'Full Name' : 'Owner Name'} 
                                                    />
                                                </div>
                                                <ErrorMessage name="full_name" component="div" className="text-red-500 text-[10px] mt-0.5 ml-1" />
                                            </div>

                                            <div className="col-span-1 animate-slide-up stagger-2">
                                                <div className="relative group">
                                                    <PhoneOutlined className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors z-10" />
                                                    <Field type="text" name="phone_number" className="floating-input py-2.5 input-with-icon" placeholder="Phone Number" />
                                                </div>
                                                <ErrorMessage name="phone_number" component="div" className="text-red-500 text-[10px] mt-0.5 ml-1" />
                                            </div>

                                            <div className="col-span-full animate-slide-up stagger-3">
                                                <div className="relative group">
                                                    <MailOutlined className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors z-10" />
                                                    <Field type="email" name="email" className="floating-input py-2.5 input-with-icon" placeholder="Email Address" />
                                                </div>
                                                <ErrorMessage name="email" component="div" className="text-red-500 text-[10px] mt-0.5 ml-1" />
                                            </div>

                                            <div className="col-span-full animate-slide-up stagger-4">
                                                <div className="relative group">
                                                    <LockOutlined className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors z-10" />
                                                    <Field type="password" name="password" className="floating-input py-2.5 input-with-icon" placeholder="Password" />
                                                </div>
                                                <ErrorMessage name="password" component="div" className="text-red-500 text-[10px] mt-0.5 ml-1" />
                                            </div>

                                            <div className="col-span-full animate-slide-up stagger-4">
                                                <div className="relative group">
                                                    <LockOutlined className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors z-10" />
                                                    <Field type="password" name="confirm_password" className="floating-input py-2.5 input-with-icon" placeholder="Confirm Password" />
                                                </div>
                                                <ErrorMessage name="confirm_password" component="div" className="text-red-500 text-[10px] mt-0.5 ml-1" />
                                            </div>

                                            {/* ROLE SPECIFIC FIELDS - Grid items will flow into 2 columns if expanded */}
                                            {selectedRole === 'restaurant' && (
                                                <>
                                                    <div className="col-span-1 animate-slide-up stagger-4">
                                                        <div className="relative group">
                                                            <ShopOutlined className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors z-10" />
                                                            <Field type="text" name="name" className="floating-input py-2.5 input-with-icon" placeholder="Restaurant Name" />
                                                        </div>
                                                        <ErrorMessage name="name" component="div" className="text-red-500 text-[10px] mt-0.5 ml-1" />
                                                    </div>
                                                    <div className="col-span-1 animate-slide-up stagger-4">
                                                        <div className="relative group">
                                                            <SafetyCertificateOutlined className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors z-10" />
                                                            <Field type="text" name="business_license" className="floating-input py-2.5 input-with-icon" placeholder="Business License No." />
                                                        </div>
                                                        <ErrorMessage name="business_license" component="div" className="text-red-500 text-[10px] mt-0.5 ml-1" />
                                                    </div>
                                                    <div className="col-span-full animate-slide-up stagger-5">
                                                        <div className="relative group">
                                                            <EnvironmentOutlined className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors z-10" />
                                                            <Field type="text" name="address" className="floating-input py-2.5 input-with-icon" placeholder="Full Restaurant Address" />
                                                        </div>
                                                        <ErrorMessage name="address" component="div" className="text-red-500 text-[10px] mt-0.5 ml-1" />
                                                    </div>
                                                </>
                                            )}

                                            {selectedRole === 'delivery_partner' && (
                                                <>
                                                    <div className="col-span-1 animate-slide-up stagger-4">
                                                        <div className="relative group">
                                                            <IdcardOutlined className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors z-10" />
                                                            <Field type="text" name="id_card" className="floating-input py-2.5 input-with-icon" placeholder="Driver ID / CCCD" />
                                                        </div>
                                                        <ErrorMessage name="id_card" component="div" className="text-red-500 text-[10px] mt-0.5 ml-1" />
                                                    </div>
                                                    <div className="col-span-1 animate-slide-up stagger-4">
                                                        <div className="relative group">
                                                            <IdcardOutlined className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors z-10" />
                                                            <Field type="text" name="vehicle_license" className="floating-input py-2.5 input-with-icon" placeholder="Vehicle License Plate" />
                                                        </div>
                                                        <ErrorMessage name="vehicle_license" component="div" className="text-red-500 text-[10px] mt-0.5 ml-1" />
                                                    </div>
                                                    <div className="col-span-full animate-slide-up stagger-5">
                                                        <div className="relative group">
                                                            <CarOutlined className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors z-10" />
                                                            <Field as="select" name="vehicle_type" className="floating-input py-2.5 input-with-icon appearance-none">
                                                                <option value="Motorcycle">Motorcycle</option>
                                                                <option value="Bicycle">Bicycle</option>
                                                                <option value="Car">Car / Van</option>
                                                            </Field>
                                                        </div>
                                                        <ErrorMessage name="vehicle_type" component="div" className="text-red-500 text-[10px] mt-0.5 ml-1" />
                                                    </div>
                                                </>
                                            )}
                                        </div>

                                        {/* Informational Note */}
                                        <div className={`text-[10px] p-2.5 rounded-xl border animate-slide-up stagger-5 ${selectedRole === 'customer' ? 'bg-gray-50 border-gray-100 text-gray-400' : 'bg-orange-50 border-orange-100 text-orange-600 font-bold'}`}>
                                            {selectedRole === 'customer' 
                                                ? 'By creating an account, you agree to our Terms of Service.' 
                                                : 'IMPORTANT: As a partner, your profile requires document verification by our Team before you can start operations.'}
                                        </div>

                                        <button 
                                            type="submit" 
                                            disabled={isSubmitting} 
                                            className="btn-primary py-3.5 text-base mt-2 flex items-center justify-center gap-2 group shadow-lg animate-slide-up stagger-5"
                                        >
                                            {isSubmitting ? 'Processing...' : (
                                                <>
                                                    Complete Registration
                                                    <ArrowRightOutlined className="group-hover:translate-x-1 transition-transform" />
                                                </>
                                            )}
                                        </button>

                                        <div className="text-center mt-3 text-gray-500 text-xs animate-slide-up stagger-5">
                                            Return to <span onClick={() => setStep(0)} className="text-primary font-black cursor-pointer hover:underline">Selection</span>
                                        </div>
                                    </Form>
                                )}
                            </Formik>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
