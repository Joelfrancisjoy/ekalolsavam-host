import React, { useState, useEffect } from 'react';
import axios from 'axios';
import axiosInstance from '../services/axiosInstance';

const IDManagementEnhanced = () => {
    const [activeTab, setActiveTab] = useState('generate');
    const [requestTab, setRequestTab] = useState('pending'); // For requests tab - pending vs all
    const [role, setRole] = useState('volunteer');
    const [count, setCount] = useState(1);
    const [assignments, setAssignments] = useState([{ name: '', phone: '', notes: '' }]);
    const [generatedIds, setGeneratedIds] = useState([]);
    const [allIds, setAllIds] = useState([]);
    const [signupRequests, setSignupRequests] = useState([]);
    const [allRequests, setAllRequests] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterRole, setFilterRole] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
    const getToken = () => localStorage.getItem('access_token');

    // Generate IDs with name assignments
    const generateIds = async () => {
        setLoading(true);
        setMessage('');

        try {
            const token = getToken();

            if (!token) {
                setMessage('Authentication token not found. Please log in again.');
                setLoading(false);
                return;
            }

            // Filter out empty assignments
            const validAssignments = assignments.filter(a => a.name.trim());

            const response = await axios.post(
                `${API_URL}/api/auth/admin/ids/generate/`,
                {
                    role,
                    assignments: validAssignments.length > 0 ? validAssignments : undefined,
                    count: validAssignments.length > 0 ? validAssignments.length : count
                },
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            setGeneratedIds(response.data.ids);
            setMessage(response.data.message || `Generated ${response.data.count} ID(s) successfully`);

            // Reset form
            setAssignments([{ name: '', phone: '', notes: '' }]);
            setCount(1);

            // Reload all IDs
            loadAllIds();
        } catch (error) {
            console.error('ID Generation Error:', error.response || error);

            if (error.response?.status === 401) {
                setMessage('Authentication failed. Please log in again.');
            } else if (error.response?.status === 403) {
                setMessage('Permission denied. Admin access required.');
            } else {
                setMessage(error.response?.data?.error || error.response?.data?.detail || 'Failed to generate IDs');
            }
        } finally {
            setLoading(false);
        }
    };

    // Load all issued IDs
    const loadAllIds = async () => {
        setLoading(true);
        try {
            const token = getToken();

            if (!token) {
                setMessage('Authentication token not found. Please log in again.');
                setLoading(false);
                return;
            }

            const params = new URLSearchParams();
            if (filterRole) params.append('role', filterRole);
            if (filterStatus !== 'all') params.append('status', filterStatus);
            if (searchTerm) params.append('search', searchTerm);

            const response = await axios.get(
                `${API_URL}/api/auth/admin/ids/?${params.toString()}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            setAllIds(response.data);
        } catch (error) {
            console.error('Failed to load IDs:', error);

            if (error.response?.status === 401) {
                setMessage('Authentication failed. Please log in again.');
            } else if (error.response?.status === 403) {
                setMessage('Permission denied. Admin access required.');
            }
        } finally {
            setLoading(false);
        }
    };

    // Load signup requests
    const loadSignupRequests = async (status = 'pending') => {
        setLoading(true);
        try {
            const token = getToken();

            if (!token) {
                setMessage('Authentication token not found. Please log in again.');
                setLoading(false);
                return;
            }

            const params = new URLSearchParams();
            if (status !== 'all') {
                params.append('status', status);
            }

            const response = await axios.get(
                `${API_URL}/api/auth/admin/signup-requests/?${params.toString()}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            if (status === 'all') {
                setAllRequests(response.data);
            } else if (status === 'pending') {
                setSignupRequests(response.data);
            }
        } catch (error) {
            console.error('Failed to load signup requests:', error);

            if (error.response?.status === 401) {
                setMessage('Authentication failed. Please log in again.');
            } else if (error.response?.status === 403) {
                setMessage('Permission denied. Admin access required.');
            }
        } finally {
            setLoading(false);
        }
    };

    // Approve or reject signup request
    const handleApproveRequest = async (requestId, status, notes = '') => {
        try {
            const token = getToken();

            if (!token) {
                setMessage('Authentication token not found. Please log in again.');
                return;
            }

            await axios.patch(
                `${API_URL}/api/auth/admin/signup-requests/${requestId}/`,
                { status, notes },
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            setMessage(`Request ${status} successfully`);
            loadSignupRequests('pending'); // Reload pending requests
            loadSignupRequests('all'); // Reload all requests
            loadAllIds(); // Refresh IDs list
        } catch (error) {
            console.error('Failed to approve request:', error.response || error);

            if (error.response?.status === 401) {
                setMessage('Authentication failed. Please log in again.');
            } else if (error.response?.status === 403) {
                setMessage('Permission denied. Admin access required.');
            } else {
                setMessage(error.response?.data?.error || error.response?.data?.detail || 'Failed to update request');
            }
        }
    };

    // Add assignment row
    const addAssignment = () => {
        setAssignments([...assignments, { name: '', phone: '', notes: '' }]);
    };

    // Remove assignment row
    const removeAssignment = (index) => {
        const updated = assignments.filter((_, i) => i !== index);
        setAssignments(updated.length > 0 ? updated : [{ name: '', phone: '', notes: '' }]);
    };

    // Update assignment
    const updateAssignment = (index, field, value) => {
        const updated = [...assignments];
        updated[index][field] = value;
        setAssignments(updated);
    };

    // Toggle ID active status
    const toggleIdStatus = async (id, currentStatus) => {
        try {
            const token = getToken();
            await axios.patch(
                `${API_URL}/api/auth/admin/ids/${id}/`,
                { is_active: !currentStatus },
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            setMessage(`ID ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
            loadAllIds();
        } catch (error) {
            setMessage(error.response?.data?.error || 'Failed to update ID status');
        }
    };

    useEffect(() => {
        if (activeTab === 'requests') {
            loadSignupRequests(requestTab);
        } else if (activeTab === 'manage') {
            loadAllIds();
        }
    }, [activeTab, requestTab, filterStatus, filterRole, searchTerm]);

    // Load both pending and all requests when requests tab is active
    useEffect(() => {
        if (activeTab === 'requests') {
            loadSignupRequests('pending');
            loadSignupRequests('all');
        }
    }, [activeTab]);

    return (
        <div className="max-w-7xl mx-auto p-6 space-y-8">
            {/* Header Section */}
            <div className="text-center mb-10">
                <h1 className="text-4xl font-bold text-gray-800 mb-2">🔑 ID Management System</h1>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">Generate and manage IDs for volunteers and judges with advanced approval workflows</p>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex flex-wrap gap-4">
                    <button
                        onClick={() => setActiveTab('generate')}
                        className={`py-4 px-6 border-b-2 font-bold text-lg ${activeTab === 'generate'
                            ? 'border-blue-500 text-blue-600 bg-blue-50 rounded-t-lg'
                            : 'border-transparent text-gray-600 hover:text-blue-600 hover:bg-gray-50 rounded-t-lg'
                            }`}
                    >
                        <span className="flex items-center">
                            <span className="mr-2">✨</span> Generate IDs
                        </span>
                    </button>
                    <button
                        onClick={() => setActiveTab('manage')}
                        className={`py-4 px-6 border-b-2 font-bold text-lg ${activeTab === 'manage'
                            ? 'border-blue-500 text-blue-600 bg-blue-50 rounded-t-lg'
                            : 'border-transparent text-gray-600 hover:text-blue-600 hover:bg-gray-50 rounded-t-lg'
                            }`}
                    >
                        <span className="flex items-center">
                            <span className="mr-2">📊</span> Manage IDs
                        </span>
                    </button>
                    <button
                        onClick={() => {
                            setActiveTab('requests');
                            setRequestTab('pending');
                        }}
                        className={`py-4 px-6 border-b-2 font-bold text-lg ${activeTab === 'requests' && requestTab === 'pending'
                            ? 'border-blue-500 text-blue-600 bg-blue-50 rounded-t-lg'
                            : 'border-transparent text-gray-600 hover:text-blue-600 hover:bg-gray-50 rounded-t-lg'
                            }`}
                    >
                        <span className="flex items-center">
                            <span className="mr-2">⏳</span> Pending Requests
                            {signupRequests.length > 0 && (
                                <span className="ml-2 px-3 py-1 bg-red-500 text-white rounded-full text-sm font-bold">
                                    {signupRequests.length}
                                </span>
                            )}
                        </span>
                    </button>
                    <button
                        onClick={() => {
                            setActiveTab('requests');
                            setRequestTab('all');
                        }}
                        className={`py-4 px-6 border-b-2 font-bold text-lg ${activeTab === 'requests' && requestTab === 'all'
                            ? 'border-blue-500 text-blue-600 bg-blue-50 rounded-t-lg'
                            : 'border-transparent text-gray-600 hover:text-blue-600 hover:bg-gray-50 rounded-t-lg'
                            }`}
                    >
                        <span className="flex items-center">
                            <span className="mr-2">📋</span> All Requests
                            {allRequests.length > 0 && (
                                <span className="ml-2 px-3 py-1 bg-blue-500 text-white rounded-full text-sm font-bold">
                                    {allRequests.length}
                                </span>
                            )}
                        </span>
                    </button>
                </nav>
            </div>

            {message && (
                <div className={`p-6 rounded-xl shadow-md ${message.includes('successfully') || message.includes('successfully')
                    ? 'bg-green-50 text-green-800 border-l-4 border-green-500'
                    : 'bg-red-50 text-red-800 border-l-4 border-red-500'
                    }`}>
                    <div className="flex items-start">
                        <div className="flex-shrink-0">
                            {message.includes('successfully') || message.includes('successfully') ? (
                                <span className="text-green-500 text-xl">✓</span>
                            ) : (
                                <span className="text-red-500 text-xl">!</span>
                            )}
                        </div>
                        <div className="ml-4">
                            <p className="font-medium text-lg">{message}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Generate IDs Tab */}
            {activeTab === 'generate' && (
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl shadow-xl p-8 border border-gray-100">
                    <div className="mb-6">
                        <h3 className="text-2xl font-bold text-gray-800 mb-2 flex items-center">
                            <span className="mr-3 text-blue-600">✨</span>
                            Generate New IDs
                        </h3>
                        <p className="text-lg text-gray-600">
                            Assign names to IDs for pre-registered volunteers and judges
                        </p>
                    </div>

                    <div>
                        <label className="block text-lg font-bold text-gray-700 mb-3">
                            Select Role *
                        </label>
                        <select
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                            className="w-full max-w-xs px-5 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-300 focus:border-blue-500 transition-all text-lg"
                        >
                            <option value="volunteer"> volunteering (Volunteer)</option>
                            <option value="judge"> judging (Judge)</option>
                        </select>
                    </div>

                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h4 className="text-xl font-bold text-gray-700 flex items-center">
                                <span className="mr-2">👥</span> Name Assignments (Optional)
                            </h4>
                            <button
                                onClick={addAssignment}
                                className="px-4 py-2 text-lg bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-xl hover:from-blue-700 hover:to-indigo-800 font-bold"
                            >
                                <span className="mr-2">+</span> Add Person
                            </button>
                        </div>

                        {assignments.map((assignment, index) => (
                            <div key={index} className="flex gap-4 items-start p-6 bg-white rounded-xl shadow-sm border border-gray-200">
                                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-base font-semibold text-gray-700 mb-2">Full Name *</label>
                                        <input
                                            type="text"
                                            placeholder="Enter full name"
                                            value={assignment.name}
                                            onChange={(e) => updateAssignment(index, 'name', e.target.value)}
                                            className="w-full px-5 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-300 focus:border-blue-500 transition-all text-lg"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-base font-semibold text-gray-700 mb-2">Phone (Optional)</label>
                                        <input
                                            type="text"
                                            placeholder="Enter phone number"
                                            value={assignment.phone}
                                            onChange={(e) => updateAssignment(index, 'phone', e.target.value)}
                                            className="w-full px-5 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-300 focus:border-blue-500 transition-all text-lg"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-base font-semibold text-gray-700 mb-2">Notes (Optional)</label>
                                        <input
                                            type="text"
                                            placeholder="Enter notes"
                                            value={assignment.notes}
                                            onChange={(e) => updateAssignment(index, 'notes', e.target.value)}
                                            className="w-full px-5 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-300 focus:border-blue-500 transition-all text-lg"
                                        />
                                    </div>
                                </div>
                                {assignments.length > 1 && (
                                    <button
                                        onClick={() => removeAssignment(index)}
                                        className="px-4 py-3 text-xl text-red-600 hover:bg-red-50 rounded-xl font-bold"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>

                    {assignments.filter(a => !a.name.trim()).length === assignments.length && (
                        <div>
                            <label className="block text-lg font-bold text-gray-700 mb-3">
                                Or Generate Count (without names)
                            </label>
                            <input
                                type="number"
                                min="1"
                                max="100"
                                value={count}
                                onChange={(e) => setCount(e.target.value)}
                                className="w-full max-w-xs px-5 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-300 focus:border-blue-500 transition-all text-lg"
                            />
                        </div>
                    )}

                    <button
                        onClick={generateIds}
                        disabled={loading}
                        className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-bold rounded-xl hover:from-blue-700 hover:to-indigo-800 disabled:opacity-50 text-xl transition-all"
                    >
                        {loading ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Generating...
                            </>
                        ) : '✨ Generate IDs'}
                    </button>

                    {generatedIds.length > 0 && (
                        <div className="mt-8">
                            <h3 className="text-2xl font-bold mb-4 text-gray-800 flex items-center">
                                <span className="mr-3 text-green-600">✅</span> Generated IDs:
                            </h3>
                            <div className="bg-white rounded-xl p-6 space-y-4 max-h-96 overflow-y-auto border border-gray-200 shadow-sm">
                                {generatedIds.map((id, index) => (
                                    <div key={index} className="flex items-center justify-between p-5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-gray-200">
                                        <div className="flex-1">
                                            <code className="font-mono text-2xl font-bold text-blue-700">{id.id_code}</code>
                                            {id.assigned_name && (
                                                <p className="text-lg text-gray-700 mt-2 flex items-center">
                                                    <span className="mr-2">👤</span> {id.assigned_name}
                                                </p>
                                            )}
                                            {id.assigned_phone && (
                                                <p className="text-base text-gray-600 flex items-center">
                                                    <span className="mr-2">📞</span> {id.assigned_phone}
                                                </p>
                                            )}
                                        </div>
                                        <div className="text-right">
                                            <span className="text-lg px-4 py-2 bg-gradient-to-r from-green-100 to-green-200 text-green-800 rounded-full font-bold">
                                                {id.role === 'volunteer' ? ' volunteering' : ' judging'}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <button
                                onClick={() => {
                                    const idsText = generatedIds.map(id =>
                                        `${id.id_code}${id.assigned_name ? ` - ${id.assigned_name}` : ''}`
                                    ).join('\n');
                                    navigator.clipboard.writeText(idsText);
                                    setMessage('IDs copied to clipboard!');
                                }}
                                className="mt-4 px-6 py-3 bg-gradient-to-r from-gray-600 to-gray-800 text-white rounded-xl hover:from-gray-700 hover:to-gray-900 font-bold text-lg"
                            >
                                📋 Copy All IDs
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Manage IDs Tab */}
            {activeTab === 'manage' && (
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl shadow-xl p-8 border border-gray-100">
                    <div className="mb-6">
                        <h3 className="text-2xl font-bold text-gray-800 mb-2 flex items-center">
                            <span className="mr-3 text-gray-600">📊</span>
                            Manage Existing IDs
                        </h3>
                        <p className="text-lg text-gray-600">Monitor and control all issued IDs for volunteers and judges</p>
                    </div>

                    <div className="flex flex-wrap gap-6 items-center mb-6">
                        <select
                            value={filterRole}
                            onChange={(e) => setFilterRole(e.target.value)}
                            className="px-5 py-3 border-2 border-gray-300 rounded-xl text-lg"
                        >
                            <option value="">All Roles</option>
                            <option value="volunteer">Volunteer</option>
                            <option value="judge">Judge</option>
                        </select>

                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="px-5 py-3 border-2 border-gray-300 rounded-xl text-lg"
                        >
                            <option value="all">All Status</option>
                            <option value="available">Available</option>
                            <option value="used">Pending Verification</option>
                            <option value="verified">Verified</option>
                            <option value="inactive">Inactive</option>
                        </select>

                        <input
                            type="text"
                            placeholder="Search ID, name, or username..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="flex-1 px-5 py-3 border-2 border-gray-300 rounded-xl text-lg min-w-[250px]"
                        />
                    </div>

                    <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                        {allIds.length === 0 ? (
                            <div className="text-center py-12 text-gray-500">
                                <p className="text-xl">No IDs found</p>
                                <p className="text-lg mt-2">Generate some IDs to get started</p>
                            </div>
                        ) : (
                            allIds.map((id) => (
                                <div key={id.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-4 flex-wrap">
                                                <code className="font-mono text-2xl font-bold text-blue-700">{id.id_code}</code>
                                                <span className={`px-4 py-2 text-lg rounded-full font-bold ${id.role === 'volunteer'
                                                    ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-800'
                                                    : 'bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800'
                                                    }`}>
                                                    {id.role === 'volunteer' ? ' volunte' : ' judg'}er
                                                </span>
                                                <span className={`px-4 py-2 text-lg rounded-full font-bold ${id.status_display === 'Verified' ? 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800' :
                                                    id.status_display === 'Pending Verification' ? 'bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800' :
                                                        id.status_display === 'Available' ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-800' :
                                                            'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800'
                                                    }`}>
                                                    {id.status_display}
                                                </span>
                                            </div>

                                            {id.assigned_name && (
                                                <p className="text-lg text-gray-700 mt-3 flex items-center">
                                                    <span className="mr-2 text-lg">👤</span> Assigned to: {id.assigned_name}
                                                </p>
                                            )}

                                            {id.used_by_details && (
                                                <div className="mt-3 text-lg text-gray-600">
                                                    <p className="flex items-center">✅ Used by: {id.used_by_details.first_name} {id.used_by_details.last_name}</p>
                                                    <p className="flex items-center text-base mt-1">
                                                        <span className="mr-2">📧</span> {id.used_by_details.email}
                                                    </p>
                                                </div>
                                            )}

                                            {id.notes && (
                                                <p className="text-base text-gray-500 mt-2 flex items-center">
                                                    <span className="mr-2">📝</span> {id.notes}
                                                </p>
                                            )}
                                        </div>

                                        <button
                                            onClick={() => toggleIdStatus(id.id, id.is_active)}
                                            className={`px-5 py-3 text-lg rounded-xl font-bold ${id.is_active
                                                ? 'bg-gradient-to-r from-red-100 to-red-200 text-red-700 hover:from-red-200 hover:to-red-300'
                                                : 'bg-gradient-to-r from-green-100 to-green-200 text-green-700 hover:from-green-200 hover:to-green-300'
                                                }`}
                                        >
                                            {id.is_active ? '🔴 Deactivate' : '🟢 Activate'}
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* Requests Tab - Both Pending and All */}
            {activeTab === 'requests' && (
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl shadow-xl p-8 border border-gray-100">
                    <div className="mb-6">
                        <h3 className="text-2xl font-bold text-gray-800 mb-2 flex items-center">
                            <span className="mr-3 text-amber-600">📋</span>
                            Manage Registration Requests
                        </h3>
                        <p className="text-lg text-gray-600">Review and approve registration requests from volunteers and judges</p>
                    </div>

                    <div className="flex border-b mb-6">
                        <button
                            onClick={() => setRequestTab('pending')}
                            className={`py-4 px-6 font-bold text-lg ${requestTab === 'pending'
                                ? 'border-b-2 border-blue-500 text-blue-600 bg-blue-50 rounded-t-lg'
                                : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50 rounded-t-lg'
                                }`}
                        >
                            <span className="flex items-center">
                                <span className="mr-2">⏳</span> Pending Requests ({signupRequests.length})
                            </span>
                        </button>
                        <button
                            onClick={() => setRequestTab('all')}
                            className={`py-4 px-6 font-bold text-lg ${requestTab === 'all'
                                ? 'border-b-2 border-blue-500 text-blue-600 bg-blue-50 rounded-t-lg'
                                : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50 rounded-t-lg'
                                }`}
                        >
                            <span className="flex items-center">
                                <span className="mr-2">📋</span> All Requests ({allRequests.length})
                            </span>
                        </button>
                    </div>

                    {requestTab === 'pending' ? (
                        <div>
                            <h3 className="text-2xl font-bold mb-6 text-gray-800 flex items-center">
                                <span className="mr-3 text-yellow-600">⏳</span> Pending Requests
                            </h3>

                            {signupRequests.length === 0 ? (
                                <div className="text-center py-12 text-gray-500">
                                    <p className="text-xl">No pending requests</p>
                                    <p className="text-lg mt-2">All requests have been processed</p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {signupRequests.map((request) => (
                                        <div key={request.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <p className="font-bold text-xl text-gray-800">{request.user_details?.first_name} {request.user_details?.last_name}</p>
                                                    <p className="text-lg text-gray-600 mt-1 flex items-center">
                                                        <span className="mr-2">👤</span> @{request.user_details?.username}
                                                    </p>
                                                    <p className="text-lg text-gray-600 flex items-center">
                                                        <span className="mr-2">📧</span> {request.user_details?.email}
                                                    </p>
                                                    <p className="text-base text-gray-500 mt-2 flex items-center">
                                                        <span className="mr-2">🔑</span> ID Used: <code className="font-mono font-bold text-lg">{request.issued_id_code}</code>
                                                    </p>
                                                </div>
                                                <span className="px-4 py-2 text-lg font-bold bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 rounded-full">
                                                    Pending
                                                </span>
                                            </div>

                                            <div className="flex gap-4 mt-6">
                                                <button
                                                    onClick={() => handleApproveRequest(request.id, 'approved')}
                                                    className="flex-1 px-6 py-4 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 font-bold text-lg transition-all"
                                                >
                                                    <span className="flex items-center justify-center">
                                                        <span className="mr-2">✅</span> Approve & Activate
                                                    </span>
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        const reason = prompt('Enter rejection reason (optional):');
                                                        if (reason !== null) {
                                                            handleApproveRequest(request.id, 'rejected', reason);
                                                        }
                                                    }}
                                                    className="flex-1 px-6 py-4 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:from-red-700 hover:to-red-800 font-bold text-lg transition-all"
                                                >
                                                    <span className="flex items-center justify-center">
                                                        <span className="mr-2">❌</span> Reject
                                                    </span>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div>
                            <h3 className="text-2xl font-bold mb-6 text-gray-800 flex items-center">
                                <span className="mr-3 text-blue-600">📋</span> All Requests
                            </h3>

                            {allRequests.length === 0 ? (
                                <div className="text-center py-12 text-gray-500">
                                    <p className="text-xl">No requests found</p>
                                    <p className="text-lg mt-2">No registration requests have been submitted yet</p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {allRequests.map((request) => (
                                        <div key={request.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <p className="font-bold text-xl text-gray-800">{request.user_details?.first_name} {request.user_details?.last_name}</p>
                                                    <p className="text-lg text-gray-600 mt-1 flex items-center">
                                                        <span className="mr-2">👤</span> @{request.user_details?.username}
                                                    </p>
                                                    <p className="text-lg text-gray-600 flex items-center">
                                                        <span className="mr-2">📧</span> {request.user_details?.email}
                                                    </p>
                                                    <p className="text-base text-gray-500 mt-2 flex items-center">
                                                        <span className="mr-2">🔑</span> ID Used: <code className="font-mono font-bold text-lg">{request.issued_id_code}</code>
                                                    </p>
                                                    <p className="text-base text-gray-500 mt-2 flex items-center">
                                                        <span className="mr-2">📅</span> Date: {new Date(request.created_at).toLocaleString()}
                                                    </p>
                                                </div>
                                                <span className={`px-4 py-2 text-lg font-bold rounded-full ${request.status === 'approved'
                                                    ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-800'
                                                    : request.status === 'rejected'
                                                        ? 'bg-gradient-to-r from-red-100 to-red-200 text-red-800'
                                                        : 'bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800'
                                                    }`}>
                                                    {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                                                </span>
                                            </div>

                                            {request.status === 'pending' && (
                                                <div className="flex gap-4 mt-6">
                                                    <button
                                                        onClick={() => handleApproveRequest(request.id, 'approved')}
                                                        className="flex-1 px-6 py-4 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 font-bold text-lg transition-all"
                                                    >
                                                        <span className="flex items-center justify-center">
                                                            <span className="mr-2">✅</span> Approve & Activate
                                                        </span>
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            const reason = prompt('Enter rejection reason (optional):');
                                                            if (reason !== null) {
                                                                handleApproveRequest(request.id, 'rejected', reason);
                                                            }
                                                        }}
                                                        className="flex-1 px-6 py-4 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:from-red-700 hover:to-red-800 font-bold text-lg transition-all"
                                                    >
                                                        <span className="flex items-center justify-center">
                                                            <span className="mr-2">❌</span> Reject
                                                        </span>
                                                    </button>
                                                </div>
                                            )}

                                            {request.status === 'rejected' && request.notes && (
                                                <div className="mt-4 p-4 bg-red-50 rounded-xl text-base text-red-700">
                                                    <span className="font-bold">Rejection Reason:</span> {request.notes}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default IDManagementEnhanced;
