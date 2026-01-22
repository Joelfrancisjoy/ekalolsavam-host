import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { userService } from '../services/userService';
import axios from 'axios';
import authManager from '../utils/authManager';

// Small utility for classNames
const cx = (...cls) => cls.filter(Boolean).join(' ');

const PAGE_SIZE = 10;

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [allUsers, setAllUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [query, setQuery] = useState('');
    const [selectedRegister, setSelectedRegister] = useState(''); // 'student', 'volunteer', 'judge'
    const [page, setPage] = useState(1);
    const [selectedStudentCategory, setSelectedStudentCategory] = useState(''); // 'LP' | 'UP' | 'HS' | 'HSS'

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return users.filter(u => {
            const matchesQuery = !q || [u.username, u.email, u.first_name, u.last_name].filter(Boolean).some(v => String(v).toLowerCase().includes(q));
            const matchesRegister = !selectedRegister || u.role === selectedRegister;
            const matchesStudentCategory = selectedRegister === 'student'
                ? (!selectedStudentCategory || (u.school_category_extra || 'LP') === selectedStudentCategory)
                : true;
            return matchesQuery && matchesRegister && matchesStudentCategory;
        });
    }, [users, query, selectedRegister, selectedStudentCategory]);

    const paged = useMemo(() => {
        const start = (page - 1) * PAGE_SIZE;
        return filtered.slice(start, start + PAGE_SIZE);
    }, [filtered, page]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

    const loadAllUsers = useCallback(async ({ silent = false } = {}) => {
        if (!silent) {
            setLoading(true);
        }
        setError('');

        try {
            const data = await userService.list();
            setAllUsers(Array.isArray(data) ? data : data.results || []);
        } catch (e) {
            if (!silent) {
                setError('Failed to load users.');
            }
        } finally {
            if (!silent) {
                setLoading(false);
            }
        }
    }, []);

    const loadUsers = useCallback(async ({ silent = false } = {}) => {
        if (!selectedRegister) {
            setUsers([]);
            return;
        }

        if (!silent) {
            setLoading(true);
        }
        setError('');

        try {
            const data = await userService.list({ role: selectedRegister });
            setUsers(Array.isArray(data) ? data : data.results || []);
        } catch (e) {
            if (!silent) {
                setError('Failed to load users.');
            }
        } finally {
            if (!silent) {
                setLoading(false);
            }
        }
    }, [selectedRegister]);

    useEffect(() => {
        loadAllUsers({ silent: true });
        loadUsers();
    }, [loadUsers, loadAllUsers]);

    useEffect(() => {
        const intervalMs = 5000;

        const tick = async () => {
            if (document.hidden) return;
            await loadAllUsers({ silent: true });
            await loadUsers({ silent: true });
        };

        const onVisibilityChange = () => {
            if (!document.hidden) {
                loadAllUsers({ silent: true });
                loadUsers({ silent: true });
            }
        };

        const timer = setInterval(tick, intervalMs);
        document.addEventListener('visibilitychange', onVisibilityChange);

        return () => {
            clearInterval(timer);
            document.removeEventListener('visibilitychange', onVisibilityChange);
        };
    }, [selectedRegister, loadUsers, loadAllUsers]);

    const updateUser = async (id, patch) => {
        try {
            const updated = await userService.update(id, patch);
            setUsers(prev => prev.map(u => (u.id === id ? { ...u, ...updated } : u)));
            loadAllUsers({ silent: true });
            loadUsers({ silent: true });
        } catch (e) {
            setError('Failed to update user.');
        }
    };

    const deleteUser = async (id) => {
        if (!window.confirm('Delete this user?')) return;
        try {
            await userService.remove(id);
            setUsers(prev => prev.filter(u => u.id !== id));
            loadAllUsers({ silent: true });
            loadUsers({ silent: true });
        } catch (e) {
            setError('Failed to delete user.');
        }
    };

    const onPhoneChange = (id, phone) => updateUser(id, { phone });

    const handleRegisterClick = (registerType) => {
        setSelectedRegister(registerType);
        // Reset student subcategory when switching categories
        setSelectedStudentCategory('');
        setPage(1);
    };

    const clearRegisterFilter = () => {
        setSelectedRegister('');
        setSelectedStudentCategory('');
        setPage(1);
    };

    // Get user counts by role and student categories
    const userCounts = useMemo(() => {
        const counts = { student: 0, volunteer: 0, judge: 0, admin: 0 };
        const studentCategories = { LP: 0, UP: 0, HS: 0, HSS: 0 };

        allUsers.forEach(user => {
            if (counts.hasOwnProperty(user.role)) {
                counts[user.role]++;
            }

            // Categorize students by school_category_extra
            if (user.role === 'student') {
                const category = user.school_category_extra || 'LP';
                if (studentCategories.hasOwnProperty(category)) {
                    studentCategories[category]++;
                }
            }
        });

        return { ...counts, studentCategories };
    }, [allUsers]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
            <div className="container mx-auto px-4 py-8">
                {/* Enhanced Header Section */}
                <div className="mb-10">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                        <div>
                            <h1 className="text-5xl font-bold bg-gradient-to-r from-gray-800 via-blue-800 to-purple-800 bg-clip-text text-transparent mb-3">
                                User Management
                            </h1>
                            <p className="text-xl text-gray-600 font-medium">Comprehensive user administration and system oversight</p>
                        </div>
                        <div className="flex flex-wrap gap-4">
                            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl px-6 py-4 shadow-lg border border-blue-200">
                                <span className="text-sm font-semibold text-blue-700 uppercase tracking-wide">Total Users</span>
                                <div className="text-3xl font-bold text-blue-800 mt-1">{allUsers.length}</div>
                            </div>
                            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl px-6 py-4 shadow-lg border border-green-200">
                                <span className="text-sm font-semibold text-green-700 uppercase tracking-wide">Active Students</span>
                                <div className="text-3xl font-bold text-green-800 mt-1">{userCounts.student}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <h3 className="text-sm font-medium text-red-800">{error}</h3>
                            </div>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 xl:grid-cols-5 gap-8">
                    {/* Enhanced User Statistics Cards */}
                    <div className="xl:col-span-2">
                        <div className="bg-white rounded-3xl shadow-xl p-8 sticky top-4 border border-gray-100">
                            <h3 className="text-2xl font-bold text-gray-900 mb-8 flex items-center">
                                <span className="w-2 h-8 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full mr-4"></span>
                                User Statistics
                            </h3>

                            {selectedRegister && (
                                <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl">
                                    <div className="flex items-center justify-between">
                                        <span className="text-lg font-semibold text-blue-800">
                                            Viewing {selectedRegister} register
                                        </span>
                                        <button
                                            onClick={clearRegisterFilter}
                                            className="text-blue-600 hover:text-blue-800 text-lg font-medium underline hover:no-underline transition-all"
                                        >
                                            Clear Filter
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-6">
                                <RegisterButton
                                    label="Students"
                                    role="student"
                                    count={userCounts.student}
                                    isSelected={selectedRegister === 'student'}
                                    onClick={() => handleRegisterClick('student')}
                                />
                                <RegisterButton
                                    label="Volunteers"
                                    role="volunteer"
                                    count={userCounts.volunteer}
                                    isSelected={selectedRegister === 'volunteer'}
                                    onClick={() => handleRegisterClick('volunteer')}
                                />
                                <RegisterButton
                                    label="Judges"
                                    role="judge"
                                    count={userCounts.judge}
                                    isSelected={selectedRegister === 'judge'}
                                    onClick={() => handleRegisterClick('judge')}
                                />
                            </div>

                            {/* Student Category Breakdown */}
                            {selectedRegister === 'student' && (
                                <div className="mt-8 pt-8 border-t border-gray-200">
                                    <h4 className="text-lg font-bold text-gray-900 mb-6 flex items-center">
                                        <span className="w-1.5 h-6 bg-gradient-to-b from-green-500 to-emerald-500 rounded-full mr-3"></span>
                                        Student Categories
                                    </h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <CategoryCard label="LP" count={userCounts.studentCategories.LP} color="from-orange-500 to-red-500" selected={selectedStudentCategory === 'LP'} onClick={() => setSelectedStudentCategory('LP')} />
                                        <CategoryCard label="UP" count={userCounts.studentCategories.UP} color="from-blue-500 to-cyan-500" selected={selectedStudentCategory === 'UP'} onClick={() => setSelectedStudentCategory('UP')} />
                                        <CategoryCard label="HS" count={userCounts.studentCategories.HS} color="from-green-500 to-emerald-500" selected={selectedStudentCategory === 'HS'} onClick={() => setSelectedStudentCategory('HS')} />
                                        <CategoryCard label="HSS" count={userCounts.studentCategories.HSS} color="from-purple-500 to-pink-500" selected={selectedStudentCategory === 'HSS'} onClick={() => setSelectedStudentCategory('HSS')} />
                                    </div>
                                    {!selectedStudentCategory && (
                                        <p className="mt-4 text-sm text-gray-600">Select a student subcategory to view the list.</p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Enhanced Main Content */}
                    <div className="xl:col-span-3">
                        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
                            {/* Enhanced Search and Filters */}
                            <div className="p-8 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-blue-50">
                                {selectedRegister ? (
                                    <div className="flex flex-col sm:flex-row gap-6">
                                        <div className="flex-1">
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                    <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                                    </svg>
                                                </div>
                                                <input
                                                    type="text"
                                                    placeholder="Search users by name, email, or username..."
                                                    value={query}
                                                    onChange={(e) => setQuery(e.target.value)}
                                                    className="block w-full pl-12 pr-4 py-4 text-lg border-2 border-gray-300 rounded-2xl focus:ring-4 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm hover:shadow-md"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center text-gray-600 text-lg">Choose a category to begin.</div>
                                )}
                            </div>

                            {/* Users Table */}
                            <div className="overflow-x-auto">
                                {loading ? (
                                    <div className="flex justify-center items-center py-12">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                    </div>
                                ) : !selectedRegister ? (
                                    <div className="text-center py-12">
                                        <h3 className="text-lg font-medium text-gray-900 mb-2">No category selected</h3>
                                        <p className="text-gray-500">Please select Student, Judge, or Volunteer to view users.</p>
                                    </div>
                                ) : (selectedRegister === 'student' && !selectedStudentCategory) ? (
                                    <div className="text-center py-12">
                                        <h3 className="text-lg font-medium text-gray-900 mb-2">Select a student subcategory</h3>
                                        <p className="text-gray-500">Choose LP, UP, HS, or HSS to view student users.</p>
                                    </div>
                                ) : paged.length === 0 ? (
                                    <div className="text-center py-12">
                                        <div className="text-gray-400 mb-4">
                                            <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                                            </svg>
                                        </div>
                                        <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
                                        <p className="text-gray-500">{selectedRegister ? `No ${selectedRegister}s found` : 'No users match your search criteria'}</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-gray-200">
                                        {paged.map(u => (
                                            <UserCard
                                                key={u.id}
                                                user={u}
                                                onPhoneChange={onPhoneChange}
                                                onDelete={deleteUser}
                                                onUpdate={updateUser}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Enhanced Pagination */}
                            {selectedRegister && totalPages > 1 && (
                                <div className="px-8 py-6 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-blue-50">
                                    <div className="flex items-center justify-between">
                                        <div className="text-lg font-semibold text-gray-700">
                                            Showing {((page - 1) * PAGE_SIZE) + 1} to {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} results
                                        </div>
                                        <div className="flex space-x-3">
                                            <button
                                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                                disabled={page === 1}
                                                className="px-6 py-3 text-lg font-bold text-gray-600 bg-white border-2 border-gray-300 rounded-xl hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg"
                                            >
                                                Previous
                                            </button>
                                            <button
                                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                                disabled={page === totalPages}
                                                className="px-6 py-3 text-lg font-bold text-gray-600 bg-white border-2 border-gray-300 rounded-xl hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg"
                                            >
                                                Next
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// User Card Component
const UserCard = ({ user, onPhoneChange, onDelete, onUpdate }) => {
    const [isEditingPhone, setIsEditingPhone] = useState(false);
    const [phoneValue, setPhoneValue] = useState(user.phone || '');

    const handlePhoneSave = () => {
        onPhoneChange(user.id, phoneValue);
        setIsEditingPhone(false);
    };

    const handlePhoneCancel = () => {
        setPhoneValue(user.phone || '');
        setIsEditingPhone(false);
    };

    const getRoleColor = (role) => {
        const colors = {
            admin: 'bg-purple-100 text-purple-800 border-purple-200',
            judge: 'bg-blue-100 text-blue-800 border-blue-200',
            volunteer: 'bg-green-100 text-green-800 border-green-200',
            student: 'bg-orange-100 text-orange-800 border-orange-200'
        };
        return colors[role] || 'bg-gray-100 text-gray-800 border-gray-200';
    };

    const getApprovalStatus = (user) => {
        // For students, show blacklist status instead of approval
        if (user.role === 'student') {
            if (user.approval_status === 'rejected') {
                return { status: 'blacklisted', color: 'bg-red-100 text-red-800 border-red-200', label: 'Blacklisted' };
            }
            return { status: 'active', color: 'bg-green-100 text-green-800 border-green-200', label: 'Active' };
        }

        // For judges and volunteers, show approval status
        if (user.role === 'judge' || user.role === 'volunteer') {
            const statusColors = {
                approved: 'bg-green-100 text-green-800 border-green-200',
                pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
                rejected: 'bg-red-100 text-red-800 border-red-200'
            };
            return {
                status: user.approval_status,
                color: statusColors[user.approval_status] || 'bg-gray-100 text-gray-800 border-gray-200',
                label: user.approval_status ? user.approval_status.charAt(0).toUpperCase() + user.approval_status.slice(1) : 'Unknown'
            };
        }

        // For admins, always show active
        return { status: 'active', color: 'bg-green-100 text-green-800 border-green-200', label: 'Active' };
    };

    const approvalInfo = getApprovalStatus(user);

    return (
        <div className="p-8 hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50 transition-all duration-300 border-b border-gray-100">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-6">
                    {/* Enhanced Avatar */}
                    <div className="flex-shrink-0">
                        <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                            {user.first_name ? user.first_name.charAt(0).toUpperCase() : user.username.charAt(0).toUpperCase()}
                        </div>
                    </div>

                    {/* Enhanced User Info */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-4 mb-3">
                            <h3 className="text-2xl font-bold text-gray-900 truncate">
                                {[user.first_name, user.last_name].filter(Boolean).join(' ') || user.username}
                            </h3>
                            <span className={`inline-flex items-center px-4 py-2 rounded-xl text-sm font-bold border-2 ${getRoleColor(user.role)}`}>
                                {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                            </span>
                            <span className={`inline-flex items-center px-4 py-2 rounded-xl text-sm font-bold border-2 ${approvalInfo.color}`}>
                                {approvalInfo.label}
                            </span>
                        </div>

                        <div className="text-lg text-gray-600 space-y-2">
                            <div className="flex items-center space-x-3">
                                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                <span className="font-medium">@{user.username}</span>
                            </div>
                            <div className="flex items-center space-x-3">
                                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                <span className="font-medium">{user.email}</span>
                            </div>
                            {user.phone && (
                                <div className="flex items-center space-x-3">
                                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                    </svg>
                                    <span className="font-medium">{user.phone}</span>
                                </div>
                            )}
                            {/* Show student category if available */}
                            {user.role === 'student' && user.school_category_extra && (
                                <div className="flex items-center space-x-3">
                                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                    </svg>
                                    <span className="font-medium text-blue-600">Category: {user.school_category_extra}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Enhanced Actions */}
                <div className="flex items-center space-x-4">
                    {/* Enhanced Phone Edit */}
                    <div className="flex items-center space-x-3">
                        {isEditingPhone ? (
                            <div className="flex items-center space-x-3">
                                <input
                                    type="tel"
                                    value={phoneValue}
                                    onChange={(e) => setPhoneValue(e.target.value)}
                                    className="px-4 py-2 text-lg border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                    placeholder="Phone number"
                                />
                                <button
                                    onClick={handlePhoneSave}
                                    className="px-4 py-2 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-colors"
                                >
                                    Save
                                </button>
                                <button
                                    onClick={handlePhoneCancel}
                                    className="px-4 py-2 bg-gray-500 text-white font-bold rounded-xl hover:bg-gray-600 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setIsEditingPhone(true)}
                                className="px-4 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors"
                            >
                                {user.phone ? 'Edit Phone' : 'Add Phone'}
                            </button>
                        )}
                    </div>

                    {/* Role-specific Actions */}
                    {user.role === 'judge' && user.approval_status === 'pending' && (
                        <JudgeActions user={user} onUpdated={(patch) => onUpdate(user.id, patch)} onDeleted={() => onDelete(user.id)} />
                    )}

                    {user.role === 'volunteer' && user.approval_status === 'pending' && (
                        <VolunteerActions user={user} onUpdated={(patch) => onUpdate(user.id, patch)} onDeleted={() => onDelete(user.id)} />
                    )}

                    {user.role === 'student' && (
                        <StudentActions user={user} onUpdated={(patch) => onUpdate(user.id, patch)} />
                    )}

                    {/* Enhanced Delete Button */}
                    <button
                        onClick={() => onDelete(user.id)}
                        className="px-4 py-2 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors"
                    >
                        Delete
                    </button>
                </div>
            </div>
        </div>
    );
};

// Enhanced Judge Actions Component
const JudgeActions = ({ user, onUpdated, onDeleted }) => {
    const [busy, setBusy] = useState(false);
    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';

    const approve = async () => {
        if (!window.confirm('Approve this judge?')) return;
        setBusy(true);
        try {
            const res = await axios.patch(`${apiUrl}/api/auth/users/${user.id}/set-approval/`, { approval_status: 'approved' }, {
                headers: { Authorization: `Bearer ${authManager.getTokens().access}` }
            });
            onUpdated(res.data);
        } finally {
            setBusy(false);
        }
    };

    const reject = async () => {
        if (!window.confirm('Reject this judge? This will delete the profile.')) return;
        setBusy(true);
        try {
            const res = await axios.patch(`${apiUrl}/api/auth/users/${user.id}/set-approval/`, { approval_status: 'rejected' }, {
                headers: { Authorization: `Bearer ${authManager.getTokens().access}` }
            });
            if (res.data?.approval_status === 'deleted') onDeleted(); else onUpdated(res.data);
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="flex items-center gap-4">
            <button disabled={busy} onClick={approve} className="px-6 py-3 rounded-xl bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 text-lg font-bold transition-all duration-200 shadow-lg hover:shadow-xl">
                Approve
            </button>
            <button disabled={busy} onClick={reject} className="px-6 py-3 rounded-xl bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 text-lg font-bold transition-all duration-200 shadow-lg hover:shadow-xl">
                Reject
            </button>
        </div>
    );
};

// Enhanced Volunteer Actions Component
const VolunteerActions = ({ user, onUpdated, onDeleted }) => {
    const [busy, setBusy] = useState(false);
    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';

    const approve = async () => {
        if (!window.confirm('Approve this volunteer?')) return;
        setBusy(true);
        try {
            const res = await axios.patch(`${apiUrl}/api/auth/users/${user.id}/set-approval/`, { approval_status: 'approved' }, {
                headers: { Authorization: `Bearer ${authManager.getTokens().access}` }
            });
            onUpdated(res.data);
        } finally {
            setBusy(false);
        }
    };

    const reject = async () => {
        if (!window.confirm('Reject this volunteer? This will delete the profile.')) return;
        setBusy(true);
        try {
            const res = await axios.patch(`${apiUrl}/api/auth/users/${user.id}/set-approval/`, { approval_status: 'rejected' }, {
                headers: { Authorization: `Bearer ${authManager.getTokens().access}` }
            });
            if (res.data?.approval_status === 'deleted') onDeleted(); else onUpdated(res.data);
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="flex items-center gap-4">
            <button disabled={busy} onClick={approve} className="px-6 py-3 rounded-xl bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 text-lg font-bold transition-all duration-200 shadow-lg hover:shadow-xl">
                Approve
            </button>
            <button disabled={busy} onClick={reject} className="px-6 py-3 rounded-xl bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 text-lg font-bold transition-all duration-200 shadow-lg hover:shadow-xl">
                Reject
            </button>
        </div>
    );
};

// Enhanced Student Actions Component (Blacklist functionality)
const StudentActions = ({ user, onUpdated }) => {
    const [busy, setBusy] = useState(false);
    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';

    const blacklist = async () => {
        if (!window.confirm('Blacklist this student? They will not be able to login.')) return;
        setBusy(true);
        try {
            const res = await axios.patch(`${apiUrl}/api/auth/users/${user.id}/set-approval/`, { approval_status: 'rejected' }, {
                headers: { Authorization: `Bearer ${authManager.getTokens().access}` }
            });
            onUpdated(res.data);
        } finally {
            setBusy(false);
        }
    };

    const unblacklist = async () => {
        if (!window.confirm('Remove this student from blacklist?')) return;
        setBusy(true);
        try {
            const res = await axios.patch(`${apiUrl}/api/auth/users/${user.id}/set-approval/`, { approval_status: 'pending' }, {
                headers: { Authorization: `Bearer ${authManager.getTokens().access}` }
            });
            onUpdated(res.data);
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="flex items-center gap-4">
            {user.approval_status === 'rejected' ? (
                <button disabled={busy} onClick={unblacklist} className="px-6 py-3 rounded-xl bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 text-lg font-bold transition-all duration-200 shadow-lg hover:shadow-xl">
                    Unblacklist
                </button>
            ) : (
                <button disabled={busy} onClick={blacklist} className="px-6 py-3 rounded-xl bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 text-lg font-bold transition-all duration-200 shadow-lg hover:shadow-xl">
                    Blacklist
                </button>
            )}
        </div>
    );
};

// Enhanced Register Button Component
const RegisterButton = ({ label, role, count, isSelected, onClick }) => {
    return (
        <button
            onClick={onClick}
            className={`w-full p-6 rounded-2xl border-2 transition-all duration-300 text-left group ${isSelected
                ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-300 text-blue-800 shadow-lg transform scale-105'
                : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50 hover:border-gray-300 hover:shadow-md hover:scale-102'
                }`}
        >
            <div className="flex items-center justify-between">
                <div>
                    <div className="font-bold text-xl mb-2">{label}</div>
                    <div className="text-sm font-medium text-gray-500">
                        View registered {role}s
                    </div>
                </div>
                <div className={`text-3xl font-bold transition-colors duration-300 ${isSelected ? 'text-blue-600' : 'text-gray-600 group-hover:text-blue-500'}`}>
                    {count}
                </div>
            </div>
        </button>
    );
};

// Category Card Component for Student Categories
const CategoryCard = ({ label, count, color, selected, onClick }) => {
    return (
        <button type="button" onClick={onClick} className={cx(
            'bg-gradient-to-br from-white to-gray-50 rounded-xl p-4 border transition-all duration-200 w-full text-left',
            selected ? 'border-blue-400 ring-2 ring-blue-200 shadow-md' : 'border-gray-200 hover:shadow-md'
        )}>
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${color}`}></div>
                    <span className="font-bold text-lg text-gray-800">{label}</span>
                </div>
                <div className="text-2xl font-bold text-gray-700">{count}</div>
            </div>
        </button>
    );
};

export default UserManagement;