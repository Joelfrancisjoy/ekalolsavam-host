import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const IDBasedRegistration = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1); // 1: ID Verification, 2: Registration Form
    const [idCode, setIdCode] = useState('');
    const [idDetails, setIdDetails] = useState(null);
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        password_confirm: '',
        first_name: '',
        last_name: '',
        phone: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

    // Step 1: Verify ID Code
    const handleVerifyId = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await axios.post(`${API_URL}/api/auth/ids/check/`, {
                id_code: idCode.trim().toUpperCase()
            });

            if (response.data.valid) {
                setIdDetails(response.data);

                // Pre-fill name if assigned
                if (response.data.assigned_name) {
                    const nameParts = response.data.assigned_name.split(' ');
                    setFormData(prev => ({
                        ...prev,
                        first_name: nameParts[0] || '',
                        last_name: nameParts.slice(1).join(' ') || ''
                    }));
                }

                setStep(2);
            } else {
                setError(response.data.error || 'Invalid ID code');
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to verify ID. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Step 2: Submit Registration
    const handleRegister = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        // Validate password
        if (formData.password !== formData.password_confirm) {
            setError('Passwords do not match');
            setLoading(false);
            return;
        }

        if (formData.password.length < 8) {
            setError('Password must be at least 8 characters');
            setLoading(false);
            return;
        }

        try {
            const response = await axios.post(`${API_URL}/api/auth/register/with-id/`, {
                id_code: idCode.trim().toUpperCase(),
                username: formData.username,
                password: formData.password,
                email: formData.email,
                first_name: formData.first_name,
                last_name: formData.last_name,
                phone: formData.phone
            });

            setSuccess(true);
            setError('');

            // Show success message and redirect after 3 seconds
            setTimeout(() => {
                navigate('/login');
            }, 3000);
        } catch (err) {
            const errorData = err.response?.data;
            if (typeof errorData === 'object' && errorData.error) {
                setError(errorData.error);
            } else if (typeof errorData === 'string') {
                setError(errorData);
            } else {
                setError('Registration failed. Please check your information and try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
                <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
                    <div className="mb-6">
                        <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">Registration Successful!</h2>
                    <p className="text-gray-600 mb-4">
                        Your {idDetails?.role} account has been created and is pending verification.
                    </p>
                    {idDetails?.role === 'student' && (
                        <p className="text-sm text-blue-700 bg-blue-50 p-3 rounded-lg mb-4">
                            📚 A designated volunteer will verify your account.
                        </p>
                    )}
                    {(idDetails?.role === 'volunteer' || idDetails?.role === 'judge') && (
                        <p className="text-sm text-purple-700 bg-purple-50 p-3 rounded-lg mb-4">
                            {idDetails?.role === 'volunteer' ? '🤝' : '⚖️'} An admin will verify your account.
                        </p>
                    )}
                    <p className="text-gray-600 mb-6">
                        You will receive an email once your account is activated.
                    </p>
                    <p className="text-sm text-gray-500">
                        Redirecting to login page...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 py-12 px-4">
            <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-gray-800">
                        {idDetails?.role ? `${idDetails.role.charAt(0).toUpperCase() + idDetails.role.slice(1)} Registration` : 'ID-Based Registration'}
                    </h2>
                    <p className="text-gray-600 mt-2">
                        {step === 1 ? 'Enter your assigned ID to begin' : 'Complete your registration'}
                    </p>
                </div>

                {/* Progress Indicator */}
                <div className="flex items-center justify-center mb-8">
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                        1
                    </div>
                    <div className={`h-1 w-16 ${step >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                        2
                    </div>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                        {error}
                    </div>
                )}

                {/* Step 1: ID Verification */}
                {step === 1 && (
                    <form onSubmit={handleVerifyId} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Registration ID *
                            </label>
                            <input
                                type="text"
                                value={idCode}
                                onChange={(e) => setIdCode(e.target.value.toUpperCase())}
                                placeholder="Enter your ID (e.g., VOL1234 or JUD5678)"
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase"
                                required
                                disabled={loading}
                            />
                            <p className="mt-2 text-sm text-gray-500">
                                Enter the ID provided by the administrator
                            </p>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !idCode.trim()}
                            className="w-full py-3 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {loading ? 'Verifying...' : 'Verify ID'}
                        </button>

                        <div className="text-center">
                            <button
                                type="button"
                                onClick={() => navigate('/login')}
                                className="text-blue-600 hover:underline text-sm"
                            >
                                ← Back to Login
                            </button>
                        </div>
                    </form>
                )}

                {/* Step 2: Registration Form */}
                {step === 2 && idDetails && (
                    <form onSubmit={handleRegister} className="space-y-4">
                        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-sm text-blue-800">
                                <span className="font-semibold">ID:</span> {idCode}
                                {idDetails.assigned_name && (
                                    <span className="ml-2">
                                        <span className="font-semibold">• Assigned to:</span> {idDetails.assigned_name}
                                    </span>
                                )}
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    First Name *
                                </label>
                                <input
                                    type="text"
                                    name="first_name"
                                    value={formData.first_name}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    required
                                    disabled={loading}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Last Name *
                                </label>
                                <input
                                    type="text"
                                    name="last_name"
                                    value={formData.last_name}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    required
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Username *
                            </label>
                            <input
                                type="text"
                                name="username"
                                value={formData.username}
                                onChange={handleInputChange}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                required
                                disabled={loading}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Email *
                            </label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleInputChange}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                required
                                disabled={loading}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Phone *
                            </label>
                            <input
                                type="tel"
                                name="phone"
                                value={formData.phone}
                                onChange={handleInputChange}
                                placeholder="10-digit mobile number"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                required
                                disabled={loading}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Password *
                            </label>
                            <input
                                type="password"
                                name="password"
                                value={formData.password}
                                onChange={handleInputChange}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                required
                                minLength={8}
                                disabled={loading}
                            />
                            <p className="mt-1 text-xs text-gray-500">Minimum 8 characters</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Confirm Password *
                            </label>
                            <input
                                type="password"
                                name="password_confirm"
                                value={formData.password_confirm}
                                onChange={handleInputChange}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                required
                                disabled={loading}
                            />
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setStep(1);
                                    setIdDetails(null);
                                    setError('');
                                }}
                                className="flex-1 py-3 px-4 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-colors"
                                disabled={loading}
                            >
                                ← Back
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-1 py-3 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {loading ? 'Registering...' : 'Register'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default IDBasedRegistration;
