import React, { useState } from 'react';

const UserInfoHeader = ({ user, title, subtitle }) => {
    const [showDetailModal, setShowDetailModal] = useState(false);

    if (!user) return null;

    const getRoleColor = (role) => {
        const colors = {
            'admin': 'from-purple-500 to-indigo-600',
            'judge': 'from-green-500 to-emerald-600',
            'student': 'from-blue-500 to-cyan-600',
            'volunteer': 'from-orange-500 to-amber-600',
            'school': 'from-pink-500 to-rose-600',
        };
        return colors[role] || 'from-gray-500 to-gray-600';
    };

    const getRoleIcon = (role) => {
        const icons = {
            'admin': (
                <path d="M12,15C12.81,15 13.5,14.7 14.11,14.11C14.7,13.5 15,12.81 15,12C15,11.19 14.7,10.5 14.11,9.89C13.5,9.3 12.81,9 12,9C11.19,9 10.5,9.3 9.89,9.89C9.3,10.5 9,11.19 9,12C9,12.81 9.3,13.5 9.89,14.11C10.5,14.7 11.19,15 12,15M21,16V10.5L19.5,9.5L21,8.5V3H16.5L15.5,1.5L14.5,3H10V8.5L11.5,9.5L10,10.5V16L11.5,17.5L10,19V24H14.5L15.5,22.5L16.5,24H21V19L19.5,17.5L21,16Z" />
            ),
            'judge': (
                <path d="M12 2C12.552 2 13 2.448 13 3V5H20C20.552 5 21 5.448 21 6V7C21 7.552 20.552 8 20 8H18.874C19.594 8.613 20 9.444 20 10.5C20 12.433 18.433 14 16.5 14C14.567 14 13 12.433 13 10.5C13 9.444 13.406 8.613 14.126 8H9.874C10.594 8.613 11 9.444 11 10.5C11 12.433 9.433 14 7.5 14C5.567 14 4 12.433 4 10.5C4 9.444 4.406 8.613 5.126 8H4C3.448 8 3 7.552 3 7V6C3 5.448 3.448 5 4 5H11V3C11 2.448 11.448 2 12 2ZM7.5 10C8.328 10 9 10.672 9 11.5C9 12.328 8.328 13 7.5 13C6.672 13 6 12.328 6 11.5C6 10.672 6.672 10 7.5 10ZM16.5 10C17.328 10 18 10.672 18 11.5C18 12.328 17.328 13 16.5 13C15.672 13 15 12.328 15 11.5C15 10.672 15.672 10 16.5 10ZM12 15C12.552 15 13 15.448 13 16V20H16C16.552 20 17 20.448 17 21C17 21.552 16.552 22 16 22H8C7.448 22 7 21.552 7 21C7 20.448 7.448 20 8 20H11V16C11 15.448 11.448 15 12 15Z" />
            ),
            'student': (
                <path d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z" />
            ),
            'volunteer': (
                <path d="M16,4C16.88,4 17.67,4.38 18.18,5C18.69,4.38 19.48,4 20.36,4C21.8,4 23,5.2 23,6.64C23,8.09 21.8,9.29 20.36,9.29C19.48,9.29 18.69,8.91 18.18,8.29C17.67,8.91 16.88,9.29 16,9.29C14.56,9.29 13.36,8.09 13.36,6.64C13.36,5.2 14.56,4 16,4M13,12H21V14H13V12M13,16H21V18H13V16M13,20H21V22H13V20M11,13H9V11H11V13M11,17H9V15H11V17M11,21H9V19H11V21Z" />
            ),
            'school': (
                <path d="M12,3L1,9L5,11.18V17.18L12,21L19,17.18V11.18L21,10.09V17H23V9L12,3M18.82,9L12,12.72L5.18,9L12,5.28L18.82,9M17,16L12,18.72L7,16V12.27L12,15L17,12.27V16Z" />
            ),
        };
        return icons[role] || icons['student'];
    };

    const formatRole = (role) => {
        return role.charAt(0).toUpperCase() + role.slice(1);
    };

    return (
        <>
            <div className="bg-white border-b-2 border-gray-100 shadow-sm mb-6">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        {/* Left: Title and Subtitle */}
                        <div className="flex-1">
                            {title && (
                                <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
                            )}
                            {subtitle && (
                                <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
                            )}
                        </div>

                        {/* Right: User Info Card - Now Clickable */}
                        <div className="ml-4">
                            <button
                                onClick={() => setShowDetailModal(true)}
                                className="flex items-center space-x-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl px-4 py-2.5 border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer hover:from-gray-100 hover:to-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                {/* Role Icon */}
                                <div className={`flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br ${getRoleColor(user.role)} flex items-center justify-center shadow-sm`}>
                                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                                        {getRoleIcon(user.role)}
                                    </svg>
                                </div>

                                {/* User Details */}
                                <div className="flex flex-col">
                                    <div className="flex items-center space-x-2">
                                        <span className="text-sm font-bold text-gray-900">
                                            {user.username}
                                        </span>
                                        <div className={`px-2 py-0.5 rounded-full text-xs font-semibold bg-gradient-to-r ${getRoleColor(user.role)} text-white shadow-sm`}>
                                            {formatRole(user.role)}
                                        </div>
                                    </div>
                                    {(user.first_name || user.last_name) && (
                                        <span className="text-xs text-gray-600">
                                            {user.first_name} {user.last_name}
                                        </span>
                                    )}
                                </div>

                                {/* Status Indicator with Click Hint */}
                                <div className="flex-shrink-0">
                                    <div className="flex flex-col items-center space-y-0.5">
                                        <div className="flex items-center space-x-1">
                                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                            <span className="text-xs text-gray-500">Active</span>
                                        </div>
                                        <span className="text-[10px] text-blue-600 font-medium">Click for details</span>
                                    </div>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Detailed User Info Modal */}
            {showDetailModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowDetailModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border-2 border-gray-200" onClick={(e) => e.stopPropagation()}>
                        {/* Modal Header */}
                        <div className={`bg-gradient-to-r ${getRoleColor(user.role)} p-6 rounded-t-2xl relative overflow-hidden`}>
                            <div className="absolute inset-0 bg-white/10"></div>
                            <div className="relative z-10 flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shadow-lg backdrop-blur-sm">
                                        <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                                            {getRoleIcon(user.role)}
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-white">User Profile</h3>
                                        <p className="text-sm text-white/80">Account Information</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowDetailModal(false)}
                                    className="text-white/80 hover:text-white text-2xl font-bold w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/20 transition-colors"
                                >
                                    ×
                                </button>
                            </div>
                        </div>

                        {/* Modal Content */}
                        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                            {/* Username */}
                            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Username</label>
                                <div className="flex items-center space-x-2">
                                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                    <p className="text-lg font-bold text-gray-900">{user.username}</p>
                                </div>
                            </div>

                            {/* Full Name */}
                            {(user.first_name || user.last_name) && (
                                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Full Name</label>
                                    <div className="flex items-center space-x-2">
                                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                                        </svg>
                                        <p className="text-lg font-bold text-gray-900">
                                            {user.first_name} {user.last_name}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Role */}
                            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Role</label>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                                        </svg>
                                        <p className="text-lg font-semibold text-gray-700">{formatRole(user.role)}</p>
                                    </div>
                                    <div className={`px-3 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r ${getRoleColor(user.role)} text-white shadow-sm`}>
                                        {formatRole(user.role)}
                                    </div>
                                </div>
                            </div>

                            {/* Email */}
                            {user.email && (
                                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Email</label>
                                    <div className="flex items-center space-x-2">
                                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                        </svg>
                                        <p className="text-sm font-medium text-gray-700 break-all">{user.email}</p>
                                    </div>
                                </div>
                            )}

                            {/* School (for students/school accounts) */}
                            {user.school && (
                                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">School</label>
                                    <div className="flex items-center space-x-2">
                                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                        </svg>
                                        <p className="text-sm font-medium text-gray-700">{user.school.name || user.school}</p>
                                    </div>
                                </div>
                            )}

                            {/* Student Class */}
                            {user.student_class && (
                                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Class</label>
                                    <div className="flex items-center space-x-2">
                                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                        </svg>
                                        <p className="text-lg font-bold text-gray-900">Class {user.student_class}</p>
                                    </div>
                                </div>
                            )}

                            {/* Phone */}
                            {user.phone && (
                                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Phone</label>
                                    <div className="flex items-center space-x-2">
                                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                        </svg>
                                        <p className="text-sm font-medium text-gray-700">{user.phone}</p>
                                    </div>
                                </div>
                            )}

                            {/* Status */}
                            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border-2 border-green-200">
                                <label className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-2 block">Account Status</label>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-lg"></div>
                                        <p className="text-sm font-bold text-green-700">Active Session</p>
                                    </div>
                                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 pb-6">
                            <button
                                onClick={() => setShowDetailModal(false)}
                                className="w-full bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 text-gray-700 font-semibold py-3 px-4 rounded-xl transition-all duration-200 border border-gray-300 shadow-sm hover:shadow"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default UserInfoHeader;
