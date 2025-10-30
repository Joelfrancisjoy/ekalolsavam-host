import React, { useState, useEffect } from 'react';
import axios from 'axios';
import axiosInstance from '../services/axiosInstance';

const IDManagementEnhanced = () => {
    const [activeTab, setActiveTab] = useState('generate');
    const [role, setRole] = useState('volunteer');
    const [count, setCount] = useState(1);
    const [assignments, setAssignments] = useState([{ name: '', phone: '', notes: '' }]);
    const [generatedIds, setGeneratedIds] = useState([]);
    const [allIds, setAllIds] = useState([]);
    const [signupRequests, setSignupRequests] = useState([]);
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
    const loadSignupRequests = async () => {
        setLoading(true);
        try {
            const token = getToken();

            if (!token) {
                setMessage('Authentication token not found. Please log in again.');
                setLoading(false);
                return;
            }

            const response = await axios.get(
                `${API_URL}/api/auth/admin/signup-requests/?status=pending`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            setSignupRequests(response.data);
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
            loadSignupRequests();
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
            loadSignupRequests();
        } else if (activeTab === 'manage') {
            loadAllIds();
        }
    }, [activeTab, filterStatus, filterRole, searchTerm]);

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-gray-800">ID Management System</h2>

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                    <button
                        onClick={() => setActiveTab('generate')}
                        className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'generate'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        Generate IDs
                    </button>
                    <button
                        onClick={() => setActiveTab('manage')}
                        className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'manage'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        Manage IDs
                    </button>
                    <button
                        onClick={() => setActiveTab('requests')}
                        className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'requests'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        Pending Verifications
                        {signupRequests.length > 0 && (
                            <span className="ml-2 px-2 py-1 text-xs bg-red-500 text-white rounded-full">
                                {signupRequests.length}
                            </span>
                        )}
                    </button>
                </nav>
            </div>

            {message && (
                <div className={`p-4 rounded-lg ${message.includes('successfully') || message.includes('successfully')
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                    {message}
                </div>
            )}

            {/* Generate IDs Tab */}
            {activeTab === 'generate' && (
                <div className="bg-white rounded-lg shadow p-6 space-y-6">
                    <div className="border-b pb-4">
                        <h3 className="text-lg font-semibold text-gray-900">Generate New IDs</h3>
                        <p className="text-sm text-gray-600 mt-1">
                            Assign names to IDs for pre-registered volunteers and judges
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Role *
                        </label>
                        <select
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                            className="w-full max-w-xs px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="volunteer">Volunteer</option>
                            <option value="judge">Judge</option>
                        </select>
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h4 className="text-md font-medium text-gray-700">Name Assignments (Optional)</h4>
                            <button
                                onClick={addAssignment}
                                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                                + Add Person
                            </button>
                        </div>

                        {assignments.map((assignment, index) => (
                            <div key={index} className="flex gap-3 items-start p-4 bg-gray-50 rounded-lg">
                                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <input
                                        type="text"
                                        placeholder="Full Name"
                                        value={assignment.name}
                                        onChange={(e) => updateAssignment(index, 'name', e.target.value)}
                                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Phone (optional)"
                                        value={assignment.phone}
                                        onChange={(e) => updateAssignment(index, 'phone', e.target.value)}
                                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Notes (optional)"
                                        value={assignment.notes}
                                        onChange={(e) => updateAssignment(index, 'notes', e.target.value)}
                                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                {assignments.length > 1 && (
                                    <button
                                        onClick={() => removeAssignment(index)}
                                        className="px-3 py-2 text-red-600 hover:bg-red-50 rounded"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>

                    {assignments.filter(a => !a.name.trim()).length === assignments.length && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Or Generate Count (without names)
                            </label>
                            <input
                                type="number"
                                min="1"
                                max="100"
                                value={count}
                                onChange={(e) => setCount(e.target.value)}
                                className="w-full max-w-xs px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    )}

                    <button
                        onClick={generateIds}
                        disabled={loading}
                        className="w-full py-3 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                        {loading ? 'Generating...' : 'Generate IDs'}
                    </button>

                    {generatedIds.length > 0 && (
                        <div className="mt-6">
                            <h3 className="text-lg font-semibold mb-3">Generated IDs:</h3>
                            <div className="bg-gray-50 rounded-lg p-4 space-y-2 max-h-96 overflow-y-auto">
                                {generatedIds.map((id, index) => (
                                    <div key={index} className="flex items-center justify-between p-3 bg-white rounded border">
                                        <div className="flex-1">
                                            <code className="font-mono text-lg font-bold text-blue-600">{id.id_code}</code>
                                            {id.assigned_name && (
                                                <p className="text-sm text-gray-700 mt-1">👤 {id.assigned_name}</p>
                                            )}
                                            {id.assigned_phone && (
                                                <p className="text-xs text-gray-500">📞 {id.assigned_phone}</p>
                                            )}
                                        </div>
                                        <div className="text-right">
                                            <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded">
                                                {id.role}
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
                                className="mt-3 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm"
                            >
                                📋 Copy All IDs
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Manage IDs Tab */}
            {activeTab === 'manage' && (
                <div className="bg-white rounded-lg shadow p-6 space-y-4">
                    <div className="flex flex-wrap gap-4 items-center">
                        <select
                            value={filterRole}
                            onChange={(e) => setFilterRole(e.target.value)}
                            className="px-4 py-2 border border-gray-300 rounded-lg"
                        >
                            <option value="">All Roles</option>
                            <option value="volunteer">Volunteer</option>
                            <option value="judge">Judge</option>
                        </select>

                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="px-4 py-2 border border-gray-300 rounded-lg"
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
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                        />
                    </div>

                    <div className="space-y-3 max-h-96 overflow-y-auto">
                        {allIds.length === 0 ? (
                            <p className="text-gray-500 text-center py-8">No IDs found</p>
                        ) : (
                            allIds.map((id) => (
                                <div key={id.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3">
                                                <code className="font-mono text-lg font-bold text-blue-600">{id.id_code}</code>
                                                <span className={`px-2 py-1 text-xs rounded ${id.role === 'volunteer'
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-purple-100 text-purple-800'
                                                    }`}>
                                                    {id.role}
                                                </span>
                                                <span className={`px-2 py-1 text-xs rounded ${id.status_display === 'Verified' ? 'bg-blue-100 text-blue-800' :
                                                    id.status_display === 'Pending Verification' ? 'bg-yellow-100 text-yellow-800' :
                                                        id.status_display === 'Available' ? 'bg-green-100 text-green-800' :
                                                            'bg-gray-100 text-gray-800'
                                                    }`}>
                                                    {id.status_display}
                                                </span>
                                            </div>

                                            {id.assigned_name && (
                                                <p className="text-sm text-gray-700 mt-2">👤 Assigned to: {id.assigned_name}</p>
                                            )}

                                            {id.used_by_details && (
                                                <div className="mt-2 text-sm text-gray-600">
                                                    <p>✅ Used by: {id.used_by_details.first_name} {id.used_by_details.last_name}</p>
                                                    <p className="text-xs">📧 {id.used_by_details.email}</p>
                                                </div>
                                            )}

                                            {id.notes && (
                                                <p className="text-xs text-gray-500 mt-1">📝 {id.notes}</p>
                                            )}
                                        </div>

                                        <button
                                            onClick={() => toggleIdStatus(id.id, id.is_active)}
                                            className={`px-3 py-1 text-sm rounded ${id.is_active
                                                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                                                }`}
                                        >
                                            {id.is_active ? 'Deactivate' : 'Activate'}
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* Pending Verifications Tab */}
            {activeTab === 'requests' && (
                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold mb-4">Pending Verifications</h3>

                    {signupRequests.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">No pending requests</p>
                    ) : (
                        <div className="space-y-4">
                            {signupRequests.map((request) => (
                                <div key={request.id} className="border border-gray-200 rounded-lg p-4 bg-yellow-50">
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <p className="font-semibold text-lg">{request.user_details?.first_name} {request.user_details?.last_name}</p>
                                            <p className="text-sm text-gray-600">@{request.user_details?.username}</p>
                                            <p className="text-sm text-gray-600">📧 {request.user_details?.email}</p>
                                            <p className="text-xs text-gray-500 mt-1">ID Used: <code className="font-mono font-bold">{request.issued_id_code}</code></p>
                                        </div>
                                        <span className="px-3 py-1 text-sm bg-yellow-100 text-yellow-800 rounded">
                                            Pending
                                        </span>
                                    </div>

                                    <div className="flex gap-2 mt-4">
                                        <button
                                            onClick={() => handleApproveRequest(request.id, 'approved')}
                                            className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-medium"
                                        >
                                            ✓ Approve & Activate
                                        </button>
                                        <button
                                            onClick={() => {
                                                const reason = prompt('Enter rejection reason (optional):');
                                                if (reason !== null) {
                                                    handleApproveRequest(request.id, 'rejected', reason);
                                                }
                                            }}
                                            className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 font-medium"
                                        >
                                            ✕ Reject
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default IDManagementEnhanced;
