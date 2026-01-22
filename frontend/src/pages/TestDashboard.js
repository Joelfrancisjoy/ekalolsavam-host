import React, { useEffect } from 'react';
import authDebugger from '../utils/authDebugger';
import authManager from '../utils/authManager';

const TestDashboard = () => {
    useEffect(() => {
        const tokens = authManager.getTokens();
        authDebugger.log('TEST_DASHBOARD_MOUNTED', {
            hasAccess: !!tokens.access,
            hasRefresh: !!tokens.refresh,
            pathname: window.location.pathname,
            isAuthenticated: authManager.isAuthenticated()
        });

        // Don't make any API calls - just stay on the page
        console.log('TestDashboard mounted - no API calls made');

        return () => {
            authDebugger.log('TEST_DASHBOARD_UNMOUNTED');
        };
    }, []);

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-4xl mx-auto px-4">
                <div className="bg-white rounded-lg shadow-lg p-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-6">
                        Test Dashboard
                    </h1>

                    <div className="space-y-4">
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <h2 className="text-lg font-semibold text-green-800 mb-2">
                                ✅ Authentication Test
                            </h2>
                            <p className="text-green-700">
                                If you can see this page and it doesn't redirect back to login,
                                then the basic authentication is working.
                            </p>
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <h2 className="text-lg font-semibold text-blue-800 mb-2">
                                🔍 Debug Information
                            </h2>
                            <div className="text-blue-700 space-y-1">
                                <p>Access Token: {authManager.getTokens().access ? '✅ Present' : '❌ Missing'}</p>
                                <p>Refresh Token: {authManager.getTokens().refresh ? '✅ Present' : '❌ Missing'}</p>
                                <p>Is Authenticated: {authManager.isAuthenticated() ? '✅ Yes' : '❌ No'}</p>
                                <p>Current Path: {window.location.pathname}</p>
                                <p>Timestamp: {new Date().toLocaleString()}</p>
                            </div>
                        </div>

                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <h2 className="text-lg font-semibold text-yellow-800 mb-2">
                                🧪 No API Calls Made
                            </h2>
                            <p className="text-yellow-700">
                                This test dashboard deliberately makes no API calls to isolate
                                authentication issues from API-related problems.
                            </p>
                        </div>

                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                            <h2 className="text-lg font-semibold text-gray-800 mb-2">
                                🔧 Debug Tools
                            </h2>
                            <div className="space-y-2">
                                <button
                                    onClick={() => authDebugger.dumpLogs()}
                                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 mr-2"
                                >
                                    Dump Auth Logs
                                </button>
                                <button
                                    onClick={() => authDebugger.clearLogs()}
                                    className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 mr-2"
                                >
                                    Clear Logs
                                </button>
                                <button
                                    onClick={() => {
                                        authManager.clearTokens();
                                        window.location.reload();
                                    }}
                                    className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                                >
                                    Clear Tokens & Reload
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TestDashboard;