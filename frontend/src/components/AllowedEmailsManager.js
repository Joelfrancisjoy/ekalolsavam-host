import React, { useState, useEffect } from 'react';
import allowedEmailService from '../services/allowedEmailService';

const AllowedEmailsManager = () => {
    const [emails, setEmails] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Form states
    const [singleEmail, setSingleEmail] = useState('');
    const [bulkEmails, setBulkEmails] = useState('');
    const [activeTab, setActiveTab] = useState('list');
    const [singleEmailValidation, setSingleEmailValidation] = useState(null); // null, 'verified', 'not-registered'

    useEffect(() => {
        fetchAllowedEmails();
    }, []);

    const fetchAllowedEmails = async () => {
        try {
            setLoading(true);
            const data = await allowedEmailService.getAllowedEmails();
            setEmails(data);
            setError('');
        } catch (err) {
            if (err.response?.status === 401) {
                setError('Authentication failed. Please log in again.');
                setTimeout(() => {
                    window.location.href = '/login';
                }, 2000);
            } else {
                setError('Failed to fetch allowed emails');
            }
            console.error('Error fetching emails:', err);
            setTimeout(() => setError(''), 5000);
        } finally {
            setLoading(false);
        }
    };

    const handleSingleEmailChange = async (email) => {
        setSingleEmail(email);
        if (email.trim()) {
            try {
                const response = await allowedEmailService.checkEmailRegistered(email.trim());
                setSingleEmailValidation(response.data.is_registered ? 'verified' : 'not-registered');
            } catch (err) {
                setSingleEmailValidation(null);
            }
        } else {
            setSingleEmailValidation(null);
        }
    };

    const handleAddSingleEmail = async (e) => {
        e.preventDefault();
        if (!singleEmail.trim()) return;

        try {
            await allowedEmailService.addAllowedEmail(singleEmail.trim());
            setSuccess('Email added successfully!');
            setSingleEmail('');
            setSingleEmailValidation(null);
            fetchAllowedEmails();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            if (err.response?.status === 401) {
                setError('Authentication failed. Please log in again.');
                setTimeout(() => {
                    window.location.href = '/login';
                }, 2000);
            } else {
                setError(err.response?.data?.email?.[0] || 'Failed to add email');
            }
            setTimeout(() => setError(''), 5000);
        }
    };

    const handleBulkAddEmails = async (e) => {
        e.preventDefault();
        if (!bulkEmails.trim()) return;

        const emailList = bulkEmails
            .split('\n')
            .map(email => email.trim())
            .filter(email => email && email.includes('@'));

        if (emailList.length === 0) {
            setError('Please enter valid email addresses');
            return;
        }

        try {
            const response = await allowedEmailService.bulkAddAllowedEmails(emailList);
            setSuccess(`Successfully added ${response.created_emails.length} email(s)!`);
            setBulkEmails('');
            fetchAllowedEmails();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            if (err.response?.status === 401) {
                setError('Authentication failed. Please log in again.');
                setTimeout(() => {
                    window.location.href = '/login';
                }, 2000);
            } else {
                setError(err.response?.data?.message || 'Failed to add emails');
            }
            setTimeout(() => setError(''), 5000);
        }
    };

    const handleToggleStatus = async (id) => {
        try {
            await allowedEmailService.toggleEmailStatus(id);
            setSuccess('Email status updated successfully!');
            fetchAllowedEmails();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            if (err.response?.status === 401) {
                setError('Authentication failed. Please log in again.');
                setTimeout(() => {
                    window.location.href = '/login';
                }, 2000);
            } else {
                setError('Failed to update email status');
            }
            setTimeout(() => setError(''), 5000);
        }
    };

    const handleDeleteEmail = async (id) => {
        if (!window.confirm('Are you sure you want to delete this email?')) return;

        try {
            await allowedEmailService.deleteAllowedEmail(id);
            setSuccess('Email deleted successfully!');
            fetchAllowedEmails();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError('Failed to delete email');
            setTimeout(() => setError(''), 5000);
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="max-w-6xl mx-auto p-6">
            <div className="bg-white rounded-lg shadow-lg">
                <div className="border-b border-gray-200">
                    <div className="p-6">
                        <h2 className="text-2xl font-bold text-gray-900">
                            Google Signup Email Management
                        </h2>
                        <p className="mt-2 text-gray-600">
                            Manage which email addresses are allowed to sign up using Google OAuth
                        </p>
                    </div>

                    {/* Tab Navigation */}
                    <div className="flex space-x-8 px-6">
                        <button
                            onClick={() => setActiveTab('list')}
                            className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'list'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            Email List ({emails.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('add')}
                            className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'add'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            Add Emails
                        </button>
                    </div>
                </div>

                {/* Alert Messages */}
                {error && (
                    <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
                        <div className="flex">
                            <div className="text-red-800 text-sm">{error}</div>
                        </div>
                    </div>
                )}

                {success && (
                    <div className="mx-6 mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
                        <div className="flex">
                            <div className="text-green-800 text-sm">{success}</div>
                        </div>
                    </div>
                )}

                <div className="p-6">
                    {activeTab === 'list' && (
                        <EmailList
                            emails={emails}
                            loading={loading}
                            onToggleStatus={handleToggleStatus}
                            onDelete={handleDeleteEmail}
                            formatDate={formatDate}
                        />
                    )}

                    {activeTab === 'add' && (
                        <AddEmailForms
                            singleEmail={singleEmail}
                            setSingleEmail={handleSingleEmailChange}
                            bulkEmails={bulkEmails}
                            setBulkEmails={setBulkEmails}
                            onAddSingle={handleAddSingleEmail}
                            onBulkAdd={handleBulkAddEmails}
                            singleEmailValidation={singleEmailValidation}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

const EmailList = ({ emails, loading, onToggleStatus, onDelete, formatDate }) => {
    if (loading) {
        return (
            <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (emails.length === 0) {
        return (
            <div className="text-center py-12">
                <div className="text-gray-500 text-lg">No allowed emails found</div>
                <p className="text-gray-400 mt-2">Add some emails to get started</p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Email Address
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Added By
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date Added
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                        </th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {emails.map((email) => (
                        <tr key={email.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">{email.email}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <span
                                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${email.is_active
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-red-100 text-red-800'
                                        }`}
                                >
                                    {email.is_active ? 'Active' : 'Inactive'}
                                </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {email.created_by_username || 'System'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {formatDate(email.created_at)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                <button
                                    onClick={() => onToggleStatus(email.id)}
                                    className={`${email.is_active
                                        ? 'text-red-600 hover:text-red-900'
                                        : 'text-green-600 hover:text-green-900'
                                        }`}
                                >
                                    {email.is_active ? 'Deactivate' : 'Activate'}
                                </button>
                                <button
                                    onClick={() => onDelete(email.id)}
                                    className="text-red-600 hover:text-red-900"
                                >
                                    Delete
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const AddEmailForms = ({
    singleEmail,
    setSingleEmail,
    bulkEmails,
    setBulkEmails,
    onAddSingle,
    onBulkAdd,
    singleEmailValidation,
}) => {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Single Email Form */}
            <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Add Single Email</h3>
                <form onSubmit={onAddSingle} className="space-y-4">
                    <div>
                        <label htmlFor="single-email" className="block text-sm font-medium text-gray-700">
                            Email Address
                        </label>
                        <input
                            type="email"
                            id="single-email"
                            value={singleEmail}
                            onChange={(e) => setSingleEmail(e.target.value)}
                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                            placeholder="user@example.com"
                            required
                        />
                        {singleEmailValidation === 'verified' && (
                            <p className="mt-1 text-sm text-green-600">Verified ID</p>
                        )}
                        {singleEmailValidation === 'not-registered' && (
                            <p className="mt-1 text-sm text-red-600">Not a Registered ID</p>
                        )}
                    </div>
                    <button
                        type="submit"
                        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                        Add Email
                    </button>
                </form>
            </div>

            {/* Bulk Email Form */}
            <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Bulk Add Emails</h3>
                <form onSubmit={onBulkAdd} className="space-y-4">
                    <div>
                        <label htmlFor="bulk-emails" className="block text-sm font-medium text-gray-700">
                            Email Addresses (one per line)
                        </label>
                        <textarea
                            id="bulk-emails"
                            value={bulkEmails}
                            onChange={(e) => setBulkEmails(e.target.value)}
                            rows={8}
                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                            placeholder={`user1@example.com\nuser2@example.com\nuser3@example.com`}
                        />
                        <p className="mt-2 text-sm text-gray-500">
                            Enter one email address per line. Invalid emails will be ignored.
                        </p>
                    </div>
                    <button
                        type="submit"
                        className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                    >
                        Add All Emails
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AllowedEmailsManager;
