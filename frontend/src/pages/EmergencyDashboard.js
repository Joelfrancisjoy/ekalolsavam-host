import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import http from '../services/http-common';

const EmergencyDashboard = () => {
  const [emergencies, setEmergencies] = useState([]);
  const [selectedEmergencyId, setSelectedEmergencyId] = useState(null);
  const [triageForm, setTriageForm] = useState({
    person_role: '',
    person_id_value: '',
    cause_description: '',
    severity: '',
  });
  const [isSavingTriage, setIsSavingTriage] = useState(false);
  const [triageSaveSuccess, setTriageSaveSuccess] = useState('');
  const triageSuccessTimeoutRef = useRef(null);
  const [showCreateEmergency, setShowCreateEmergency] = useState(false);
  const [createEmergencyForm, setCreateEmergencyForm] = useState({
    emergency_type: 'medical',
    severity: 'red',
    cause_description: '',
  });
  const [isCreatingEmergency, setIsCreatingEmergency] = useState(false);
  const [createEmergencySuccess, setCreateEmergencySuccess] = useState('');
  const createSuccessTimeoutRef = useRef(null);
  const [incomingEmergencyAlert, setIncomingEmergencyAlert] = useState(null);
  const incomingEmergencyTimeoutRef = useRef(null);
  const lastEmergencyIdsRef = useRef(new Set());
  const [currentUser, setCurrentUser] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await http.get('/api/auth/current/');
        setCurrentUser(response.data);
        if (!['admin', 'volunteer'].includes(response.data.role)) {
          navigate('/login');
        }
      } catch (error) {
        console.error('Failed to fetch user:', error);
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };
    fetchUser();

    // Load initial emergencies
    loadEmergencies();
  }, [navigate]);

  useEffect(() => {
    return () => {
      if (incomingEmergencyTimeoutRef.current) {
        clearTimeout(incomingEmergencyTimeoutRef.current);
        incomingEmergencyTimeoutRef.current = null;
      }
      if (triageSuccessTimeoutRef.current) {
        clearTimeout(triageSuccessTimeoutRef.current);
        triageSuccessTimeoutRef.current = null;
      }
      if (createSuccessTimeoutRef.current) {
        clearTimeout(createSuccessTimeoutRef.current);
        createSuccessTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      loadEmergencies();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const loadEmergencies = async () => {
    try {
      const res = await http.get('/api/emergencies/active/');
      const next = res.data || [];
      const prevIds = lastEmergencyIdsRef.current;
      const nextIds = new Set(next.map((e) => e.id));

      const newlyArrived = next.find((e) => !prevIds.has(e.id));
      if (newlyArrived) {
        setIncomingEmergencyAlert(newlyArrived);
        if (incomingEmergencyTimeoutRef.current) {
          clearTimeout(incomingEmergencyTimeoutRef.current);
          incomingEmergencyTimeoutRef.current = null;
        }
        incomingEmergencyTimeoutRef.current = setTimeout(() => {
          setIncomingEmergencyAlert(null);
          incomingEmergencyTimeoutRef.current = null;
        }, 10000);
      }

      lastEmergencyIdsRef.current = nextIds;
      setEmergencies(next);
    } catch (err) {
      console.error('Failed to load emergencies:', err);
    }
  };

  const handleSelectEmergency = (emergency) => {
    setSelectedEmergencyId(emergency.id);
    setTriageSaveSuccess('');
    setTriageForm((prev) => ({
      ...prev,
      person_role: emergency.person_role || '',
      person_id_value: emergency.person_id_value || '',
      cause_description: emergency.cause_description || '',
      severity: emergency.severity || '',
    }));
  };

  const handleSaveTriage = async (e) => {
    e.preventDefault();
    if (!selectedEmergencyId) return;

    try {
      setIsSavingTriage(true);
      setError('');
      setTriageSaveSuccess('');
      if (triageSuccessTimeoutRef.current) {
        clearTimeout(triageSuccessTimeoutRef.current);
        triageSuccessTimeoutRef.current = null;
      }
      const payload = {
        person_role: triageForm.person_role,
        person_id_value: triageForm.person_id_value,
        cause_description: triageForm.cause_description,
        severity: triageForm.severity,
        status: 'resolved',
      };
      const res = await http.patch(`/api/emergencies/${selectedEmergencyId}/volunteer-complete/`, payload);

      setEmergencies((prev) => {
        const next = (prev || []).map((em) => (em.id === res.data.id ? { ...em, ...res.data } : em));
        return next.filter((em) => em.status === 'active');
      });

      setTriageForm((prev) => ({
        ...prev,
        person_role: res.data.person_role ?? prev.person_role,
        person_id_value: res.data.person_id_value ?? prev.person_id_value,
        cause_description: res.data.cause_description ?? prev.cause_description,
        severity: res.data.severity ?? prev.severity,
      }));

      setTriageSaveSuccess('Marked as handled');
      triageSuccessTimeoutRef.current = setTimeout(() => {
        setTriageSaveSuccess('');
        setSelectedEmergencyId(null);
        setTriageForm({
          person_role: '',
          person_id_value: '',
          cause_description: '',
          severity: '',
        });
        triageSuccessTimeoutRef.current = null;
      }, 2000);
    } catch (err) {
      console.error('Failed to update emergency triage:', err);
      const status = err?.response?.status;
      const serverErr = err?.response?.data?.error;
      let details = '';
      if (typeof serverErr === 'string') {
        details = serverErr;
      } else if (serverErr && typeof serverErr === 'object') {
        try {
          details = JSON.stringify(serverErr);
        } catch (_) {
          details = 'Validation error';
        }
      } else if (err?.response?.data) {
        try {
          details = JSON.stringify(err.response.data);
        } catch (_) {
          details = '';
        }
      }
      setError(`Failed to update emergency triage${status ? ` (HTTP ${status})` : ''}${details ? `: ${details}` : ''}`);
    } finally {
      setIsSavingTriage(false);
    }
  };

  const handleCreateEmergency = async (e) => {
    e.preventDefault();
    try {
      setIsCreatingEmergency(true);
      setError('');
      setCreateEmergencySuccess('');
      if (createSuccessTimeoutRef.current) {
        clearTimeout(createSuccessTimeoutRef.current);
        createSuccessTimeoutRef.current = null;
      }

      const payload = {
        emergency_type: createEmergencyForm.emergency_type,
        severity: createEmergencyForm.severity,
        cause_description: createEmergencyForm.cause_description,
      };

      const res = await http.post('/api/emergencies/volunteer/', payload);

      try {
        const refreshed = await http.get('/api/emergencies/active/');
        const next = refreshed.data || [];
        lastEmergencyIdsRef.current = new Set(next.map((e) => e.id));
        setEmergencies(next);
      } catch (_) {
        setEmergencies((prev) => [res.data, ...(prev || [])]);
      }
      setShowCreateEmergency(false);
      setCreateEmergencyForm((prev) => ({
        ...prev,
        cause_description: '',
      }));
      handleSelectEmergency(res.data);

      setCreateEmergencySuccess('Alert sent to volunteers');
      createSuccessTimeoutRef.current = setTimeout(() => {
        setCreateEmergencySuccess('');
        createSuccessTimeoutRef.current = null;
      }, 3000);
    } catch (err) {
      console.error('Failed to create emergency:', err);
      const status = err?.response?.status;
      const serverErr = err?.response?.data?.error;
      let details = '';
      if (typeof serverErr === 'string') {
        details = serverErr;
      } else if (serverErr && typeof serverErr === 'object') {
        try {
          details = JSON.stringify(serverErr);
        } catch (_) {
          details = 'Validation error';
        }
      }
      setError(`Failed to send alert${status ? ` (HTTP ${status})` : ''}${details ? `: ${details}` : ''}`);
    } finally {
      setIsCreatingEmergency(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-red-50 to-red-100">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-50 to-gray-100 text-gray-900 overflow-hidden">
      {/* Professional Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-75"></div>
                  <div className="relative w-10 h-10 bg-gradient-to-br from-red-600 to-red-700 rounded-full flex items-center justify-center shadow-md">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M5.07 19h13.86A2 2 0 0020.8 16.6l-6.93-12a2 2 0 00-3.54 0l-6.93 12A2 2 0 005.07 19z" />
                    </svg>
                  </div>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Emergency Command Center</h1>
                  <p className="text-sm text-gray-600">Real-time incident management system</p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="bg-gray-50 rounded-lg px-4 py-2 border border-gray-200">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{currentUser?.username}</p>
                  <p className="text-xs text-gray-600 capitalize">{currentUser?.role} access</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-xs font-medium text-green-700">Online</span>
                </div>

                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span>Sign out</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Professional Sidebar Navigation */}
        <div className="hidden lg:block w-72 bg-white border-r border-gray-200 shadow-sm overflow-y-auto custom-scrollbar">
          <nav className="p-5 space-y-6">
            {/* Navigation Header */}
            <div className="text-center pb-5 border-b border-gray-200">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-red-600 to-red-700 rounded-xl mb-3 shadow-sm">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-gray-900">Emergency Management</h2>
              <p className="text-xs text-gray-600 mt-1">Response Operations</p>
            </div>

            {/* Main Navigation */}
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-2">Main Navigation</h3>
              <div className="space-y-1">
                <a href="#dashboard" className="flex items-center px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-700 font-medium hover:bg-red-100 transition-colors duration-200 group">
                  <div className="mr-3 p-2 bg-red-100 rounded-lg group-hover:bg-red-200 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-medium">Dashboard</div>
                    <div className="text-xs text-red-600">System overview & metrics</div>
                  </div>
                </a>

                <a href="#active-emergencies" className="flex items-center px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 font-medium hover:bg-gray-100 transition-colors duration-200 group">
                  <div className="mr-3 p-2 bg-gray-100 rounded-lg group-hover:bg-gray-200 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">Active Emergencies</div>
                    <div className="text-xs text-gray-600">Respond to incidents</div>
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                    <span className="text-xs font-bold text-red-600">{emergencies.length}</span>
                  </div>
                </a>

                <a href="#create-emergency" className="flex items-center px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 font-medium hover:bg-gray-100 transition-colors duration-200 group">
                  <div className="mr-3 p-2 bg-gray-100 rounded-lg group-hover:bg-gray-200 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-medium">Create Alert</div>
                    <div className="text-xs text-gray-600">Report new incidents</div>
                  </div>
                </a>

                <a href="#history" className="flex items-center px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 font-medium hover:bg-gray-100 transition-colors duration-200 group">
                  <div className="mr-3 p-2 bg-gray-100 rounded-lg group-hover:bg-gray-200 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-medium">Incident History</div>
                    <div className="text-xs text-gray-600">Past emergency records</div>
                  </div>
                </a>
              </div>
            </div>

            {/* Quick Stats Panel */}
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-2">System Status</h3>
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                    <div>
                      <div className="text-sm text-gray-700 font-medium">Active Alerts</div>
                      <div className="text-xs text-gray-600">Currently monitoring</div>
                    </div>
                    <div className="text-xl font-bold text-red-600">{emergencies.length}</div>
                  </div>

                  <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                    <div>
                      <div className="text-sm text-gray-700 font-medium">Critical Incidents</div>
                      <div className="text-xs text-gray-600">Require immediate action</div>
                    </div>
                    <div className="text-xl font-bold text-orange-600">
                      {emergencies.filter(e => e.severity === 'red' || e.severity === 'orange').length}
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-sm text-gray-700 font-medium">System Status</div>
                      <div className="text-xs text-gray-600">Operational health</div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-medium text-green-700">Online</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* System Info */}
            <div className="pt-4 border-t border-gray-200">
              <div className="text-center text-xs text-gray-600">
                <div>Last Updated: {new Date().toLocaleTimeString()}</div>
                <div className="mt-1">Auto-refresh every 5 seconds</div>
              </div>
            </div>
          </nav>
        </div>

        {/* Professional Main Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-gray-50">
          <div className="p-6 max-w-7xl mx-auto">
            {/* Page Header */}
            <div className="mb-8">
              <div className="flex items-center space-x-4 mb-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-75"></div>
                  <div className="relative w-12 h-12 bg-gradient-to-br from-red-600 to-red-700 rounded-full flex items-center justify-center shadow-md">
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Emergency Command Center</h1>
                  <p className="text-gray-600">Monitor and manage active emergency alerts in real-time</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-sm">
                <div className="flex items-center space-x-2 text-green-700 bg-green-50 px-3 py-1 rounded-full">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="font-medium">System Online</span>
                </div>
                <div className="text-gray-500">•</div>
                <div className="text-gray-600">Last Refresh: {new Date().toLocaleTimeString()}</div>
                <div className="text-gray-500">•</div>
                <div className="text-gray-600">{emergencies.length} active alerts</div>
              </div>
            </div>

            {/* Professional Emergency Alert */}
            {incomingEmergencyAlert && (
              <div className="mb-8 bg-white border-2 border-red-300 rounded-xl p-6 shadow-lg">
                <div className="flex flex-col md:flex-row items-start gap-6">
                  <div className="flex-shrink-0">
                    <div className="relative">
                      <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-75"></div>
                      <div className="relative w-14 h-14 bg-gradient-to-br from-red-600 to-red-700 rounded-full flex items-center justify-center border-2 border-white shadow-lg">
                        <svg className="w-7 h-7 text-white" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.72-1.36 3.485 0l6.518 11.59c.75 1.334-.213 2.99-1.742 2.99H3.48c-1.53 0-2.492-1.656-1.743-2.99l6.52-11.59zM11 14a1 1 0 10-2 0 1 1 0 002 0zm-1-2a1 1 0 01-1-1V7a1 1 0 012 0v4a1 1 0 01-1 1z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="mb-4">
                      <h3 className="text-xl font-bold text-gray-900 mb-2">
                        NEW EMERGENCY ALERT
                      </h3>
                      <div className="text-lg font-semibold text-red-700">
                        {incomingEmergencyAlert.emergency_type?.toUpperCase() || 'EMERGENCY'}
                        {incomingEmergencyAlert.venue_name && (
                          <span className="text-gray-700 ml-2">@ {incomingEmergencyAlert.venue_name}</span>
                        )}
                        {incomingEmergencyAlert.severity && (
                          <span className="ml-3 inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800">
                            {incomingEmergencyAlert.severity.toUpperCase()}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-gray-700 mb-6">
                      <div>Created: {new Date(incomingEmergencyAlert.created_at).toLocaleString()}</div>
                      <div className="text-red-600 font-medium mt-1">Status: Requires Immediate Attention</div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          handleSelectEmergency(incomingEmergencyAlert);
                          setIncomingEmergencyAlert(null);
                        }}
                        className="flex-1 flex items-center justify-center px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md"
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Open Triage
                      </button>
                      <button
                        type="button"
                        onClick={() => setIncomingEmergencyAlert(null)}
                        className="flex-1 flex items-center justify-center px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-lg transition-colors duration-200"
                      >
                        Dismiss Alert
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Enhanced Error Display */}
            {error && (
              <div className="mb-8 bg-gradient-to-r from-red-900/80 to-red-800/80 backdrop-blur-lg border border-red-700/50 rounded-2xl p-6 shadow-2xl">
                <div className="flex items-start">
                  <div className="flex-shrink-0 mt-1">
                    <div className="w-12 h-12 bg-red-600/20 rounded-full flex items-center justify-center border-2 border-red-500/30">
                      <svg className="w-6 h-6 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-5 flex-1">
                    <h4 className="text-lg font-bold text-red-300 mb-1">System Error</h4>
                    <p className="text-red-200">{error}</p>
                  </div>
                  <div className="ml-4 flex-shrink-0">
                    <button
                      onClick={() => setError('')}
                      className="w-10 h-10 flex items-center justify-center rounded-full bg-red-800/30 hover:bg-red-700/40 transition-colors border border-red-600/30"
                    >
                      <svg className="w-5 h-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Enhanced Emergency Management Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
              {/* Enhanced Emergency List Panel */}
              <div className={`${selectedEmergencyId ? 'xl:col-span-5' : 'xl:col-span-12'}`}>
                <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-700/30 overflow-hidden h-full flex flex-col">
                  <div className="px-8 py-6 bg-gradient-to-r from-red-800 via-red-700 to-red-800 border-b border-red-600/30">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="w-4 h-4 bg-red-400 rounded-full animate-pulse"></div>
                          <h3 className="text-2xl font-black text-white tracking-tight">ACTIVE EMERGENCY ALERTS</h3>
                        </div>
                        <p className="text-red-200 text-lg font-medium">Select an emergency to triage and update critical details</p>
                        <div className="mt-6">
                          <button
                            type="button"
                            onClick={() => setShowCreateEmergency(!showCreateEmergency)}
                            className="group inline-flex items-center px-6 py-3 bg-gradient-to-r from-white to-red-100 text-red-900 font-black rounded-2xl hover:from-red-50 hover:to-white transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl border-2 border-white"
                          >
                            <svg className={`w-5 h-5 mr-2 transition-transform ${showCreateEmergency ? 'rotate-45' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            {showCreateEmergency ? 'Close Alert Creator' : 'Create New Emergency Alert'}
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-col items-end space-y-3">
                        <div className="inline-flex items-center px-5 py-3 bg-gradient-to-r from-white to-red-100 text-red-900 font-black rounded-2xl shadow-lg border-2 border-white">
                          <div className="w-3 h-3 bg-red-600 rounded-full mr-3 animate-pulse"></div>
                          <span className="text-xl">{emergencies.length} Active</span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-red-200 font-medium">Last System Update</div>
                          <div className="text-red-300 font-bold">{new Date().toLocaleTimeString()}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 flex-1 min-h-0 flex flex-col">
                    {createEmergencySuccess && (
                      <div className="mb-6 bg-gradient-to-r from-green-900/80 to-green-800/80 backdrop-blur-lg border border-green-700/50 rounded-2xl px-6 py-5 shadow-xl">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-green-600/20 rounded-full flex items-center justify-center mr-4 border-2 border-green-500/30">
                            <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <div>
                            <h4 className="text-xl font-black text-green-300">Alert Successfully Sent</h4>
                            <p className="text-green-200">{createEmergencySuccess}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {showCreateEmergency && (
                      <div className="mb-8 bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-lg rounded-3xl border border-red-700/30 shadow-xl overflow-hidden">
                        <div className="px-6 py-4 bg-gradient-to-r from-red-800/80 to-red-900/80 border-b border-red-700/30">
                          <h4 className="text-xl font-black text-white flex items-center">
                            <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M5.07 19h13.86A2 2 0 0020.8 16.6l-6.93-12a2 2 0 00-3.54 0l-6.93 12A2 2 0 005.07 19z" />
                            </svg>
                            CREATE EMERGENCY ALERT
                          </h4>
                        </div>
                        <form onSubmit={handleCreateEmergency} className="p-6">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div>
                              <label className="block text-lg font-black text-slate-300 mb-3">Emergency Type</label>
                              <select
                                value={createEmergencyForm.emergency_type}
                                onChange={(e) => setCreateEmergencyForm({ ...createEmergencyForm, emergency_type: e.target.value })}
                                className="w-full px-5 py-4 bg-slate-800/50 border border-slate-700/50 rounded-2xl text-lg text-white focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200"
                                required
                              >
                                <option value="" className="bg-slate-900">Select emergency type...</option>
                                <option value="medical" className="bg-slate-900">Medical Emergency</option>
                                <option value="fire" className="bg-slate-900">Fire / Smoke Incident</option>
                                <option value="security" className="bg-slate-900">Security Threat</option>
                                <option value="other" className="bg-slate-900">Other Emergency</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-lg font-black text-slate-300 mb-3">Severity Level</label>
                              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                                {[
                                  { id: 'red', label: 'RED', color: 'bg-red-600' },
                                  { id: 'orange', label: 'ORANGE', color: 'bg-orange-500' },
                                  { id: 'yellow', label: 'YELLOW', color: 'bg-yellow-400' },
                                  { id: 'blue', label: 'BLUE', color: 'bg-blue-500' },
                                  { id: 'green', label: 'GREEN', color: 'bg-green-500' },
                                ].map((level) => (
                                  <button
                                    key={level.id}
                                    type="button"
                                    onClick={() => setCreateEmergencyForm({ ...createEmergencyForm, severity: level.id })}
                                    className={`rounded-2xl border-2 px-4 py-4 text-base font-black transition-all duration-200 transform hover:scale-105 ${createEmergencyForm.severity === level.id
                                        ? 'border-white shadow-lg bg-white text-slate-900'
                                        : 'border-slate-600 bg-slate-800/50 text-slate-300 hover:border-slate-500 hover:bg-slate-700/50'
                                      }`}
                                  >
                                    <div className={`w-4 h-4 ${level.color} rounded-full mx-auto mb-2`}></div>
                                    {level.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className="mt-6">
                            <label className="block text-lg font-black text-slate-300 mb-3">Incident Description</label>
                            <textarea
                              rows={4}
                              value={createEmergencyForm.cause_description}
                              onChange={(e) => setCreateEmergencyForm({ ...createEmergencyForm, cause_description: e.target.value })}
                              className="w-full px-5 py-4 bg-slate-800/50 border border-slate-700/50 rounded-2xl text-lg text-white focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200 placeholder-slate-500"
                              placeholder="Provide a detailed description of the emergency situation..."
                            />
                          </div>

                          <div className="mt-8 flex justify-end">
                            <button
                              type="submit"
                              disabled={isCreatingEmergency}
                              className="group inline-flex items-center px-8 py-4 bg-gradient-to-r from-red-700 to-red-800 hover:from-red-600 hover:to-red-700 text-white font-black rounded-2xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl border border-red-600 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                            >
                              <svg className={`w-5 h-5 mr-3 transition-transform ${isCreatingEmergency ? 'animate-spin' : 'group-hover:rotate-12'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                              </svg>
                              {isCreatingEmergency ? 'Sending Alert...' : 'SEND EMERGENCY ALERT'}
                            </button>
                          </div>
                        </form>
                      </div>
                    )}

                    {emergencies.length === 0 ? (
                      <div className="h-full flex items-center justify-center">
                        <div className="w-full p-10 text-center border-2 border-dashed border-gray-300 rounded-2xl bg-gray-50">
                          <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <p className="text-lg font-semibold text-gray-700">No active emergencies</p>
                          <p className="text-base text-gray-500 mt-2">When an emergency alert is triggered, it will appear here automatically.</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4 flex-1 min-h-0 overflow-y-auto pr-2 custom-scrollbar">
                        {emergencies.map((emergency) => (
                          <button
                            key={emergency.id}
                            type="button"
                            onClick={() => handleSelectEmergency(emergency)}
                            className={`w-full text-left rounded-2xl border p-5 flex items-start justify-between gap-4 transition-all duration-150 ${selectedEmergencyId === emergency.id
                                ? 'border-red-500 bg-red-50 shadow-lg'
                                : 'border-gray-300 bg-white hover:border-red-400 hover:bg-red-50'
                              }`}
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-3 flex-wrap">
                                <span className={`inline-flex w-4 h-4 rounded-full ${emergency.severity === 'red' ? 'bg-red-600' :
                                    emergency.severity === 'orange' ? 'bg-orange-500' :
                                      emergency.severity === 'yellow' ? 'bg-yellow-400' :
                                        emergency.severity === 'blue' ? 'bg-blue-500' : 'bg-green-500'
                                  }`} />
                                <span className="text-lg font-extrabold text-gray-900">
                                  {emergency.emergency_type?.toUpperCase() || 'EMERGENCY'}
                                </span>
                                {emergency.venue_name && (
                                  <span className="text-base font-semibold text-gray-600">@ {emergency.venue_name}</span>
                                )}
                              </div>
                              <div className="mt-2 flex items-center gap-3 flex-wrap text-base text-gray-700">
                                <span className="font-semibold">{new Date(emergency.created_at).toLocaleTimeString()}</span>
                                {emergency.severity && (
                                  <span
                                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-extrabold tracking-wide ${emergency.severity === 'red'
                                        ? 'bg-red-600 text-white'
                                        : emergency.severity === 'orange'
                                          ? 'bg-orange-500 text-white'
                                          : emergency.severity === 'yellow'
                                            ? 'bg-yellow-400 text-gray-900'
                                            : emergency.severity === 'blue'
                                              ? 'bg-blue-600 text-white'
                                              : 'bg-green-600 text-white'
                                      }`}
                                  >
                                    {emergency.severity.toUpperCase()}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="shrink-0">
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-slate-700 text-slate-300 capitalize border border-slate-600">
                                {emergency.status}
                              </span>
                              <div className="text-xs text-slate-500 font-medium mt-1">Click to Triage</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Enhanced Triage Panel */}
              {selectedEmergencyId && (
                <div className="xl:col-span-7">
                  <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-700/30 overflow-hidden h-full flex flex-col">
                    <div className="px-8 py-6 bg-gradient-to-r from-red-800 via-red-700 to-red-800 border-b border-red-600/30">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="w-5 h-5 bg-red-400 rounded-full animate-pulse"></div>
                        <h3 className="text-2xl font-black text-white tracking-tight">EMERGENCY TRIAGE</h3>
                      </div>
                      <p className="text-red-200 text-lg font-medium">Capture critical incident details quickly. Safety and speed first.</p>
                    </div>

                    {triageSaveSuccess && (
                      <div className="px-8 pt-6">
                        <div className="bg-gradient-to-r from-green-900/80 to-green-800/80 backdrop-blur-lg border border-green-700/50 rounded-2xl px-6 py-5 shadow-xl">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-green-600/20 rounded-full flex items-center justify-center mr-4 border-2 border-green-500/30">
                              <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                            <div>
                              <h4 className="text-xl font-black text-green-300">Triage Saved Successfully</h4>
                              <p className="text-green-200">{triageSaveSuccess}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <form onSubmit={handleSaveTriage} className="px-8 py-6 flex-1 min-h-0 overflow-y-auto flex flex-col custom-scrollbar">
                      <div className="space-y-8 flex-1">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                          <div>
                            <label className="block text-lg font-black text-slate-300 mb-3">Person Role</label>
                            <select
                              value={triageForm.person_role}
                              onChange={(e) => setTriageForm({ ...triageForm, person_role: e.target.value })}
                              className="w-full px-5 py-4 bg-slate-800/50 border border-slate-700/50 rounded-2xl text-lg text-white focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200"
                            >
                              <option value="" className="bg-slate-900">Select person role...</option>
                              <option value="participant" className="bg-slate-900">Participant</option>
                              <option value="judge" className="bg-slate-900">Judge</option>
                              <option value="volunteer" className="bg-slate-900">Volunteer</option>
                              <option value="staff" className="bg-slate-900">Staff</option>
                              <option value="public" className="bg-slate-900">Public Visitor</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-lg font-black text-slate-300 mb-3">ID / Chess Number</label>
                            <input
                              type="text"
                              value={triageForm.person_id_value}
                              onChange={(e) => setTriageForm({ ...triageForm, person_id_value: e.target.value })}
                              className="w-full px-5 py-4 bg-slate-800/50 border border-slate-700/50 rounded-2xl text-lg text-white focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200 placeholder-slate-500"
                              placeholder="Enter ID or chess number (optional)"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-lg font-black text-slate-300 mb-3">Incident Description</label>
                          <textarea
                            rows={5}
                            value={triageForm.cause_description}
                            onChange={(e) => setTriageForm({ ...triageForm, cause_description: e.target.value })}
                            className="w-full px-5 py-4 bg-slate-800/50 border border-slate-700/50 rounded-2xl text-lg text-white focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200 placeholder-slate-500"
                            placeholder="Describe what you observed or what is currently happening..." />
                        </div>

                        <div>
                          <label className="block text-lg font-black text-slate-300 mb-4">Severity Assessment</label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                            {[
                              { id: 'red', label: 'RED', desc: 'Life-threatening', color: 'bg-red-600' },
                              { id: 'orange', label: 'ORANGE', desc: 'Very urgent', color: 'bg-orange-500' },
                              { id: 'yellow', label: 'YELLOW', desc: 'Urgent but stable', color: 'bg-yellow-400' },
                              { id: 'blue', label: 'BLUE', desc: 'Observation', color: 'bg-blue-500' },
                              { id: 'green', label: 'GREEN', desc: 'Minor', color: 'bg-green-500' },
                            ].map((level) => (
                              <button
                                key={level.id}
                                type="button"
                                onClick={() => setTriageForm({ ...triageForm, severity: level.id })}
                                className={`text-left rounded-2xl border-2 p-5 transition-all duration-200 transform hover:scale-105 ${triageForm.severity === level.id
                                    ? 'border-white shadow-xl bg-white text-slate-900'
                                    : 'border-slate-600 bg-slate-800/50 text-slate-300 hover:border-slate-500 hover:bg-slate-700/50'
                                  }`}
                              >
                                <div className={`w-5 h-5 ${level.color} rounded-full mx-auto mb-3`}></div>
                                <div className="text-lg font-black tracking-wide">{level.label}</div>
                                <div className="text-sm mt-2">{level.desc}</div>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row justify-end pt-8 space-y-4 sm:space-y-0 sm:space-x-6">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedEmergencyId(null);
                            setTriageForm({
                              person_role: '',
                              person_id_value: '',
                              cause_description: '',
                              severity: '',
                            });
                          }}
                          className="flex-1 sm:flex-none px-8 py-4 bg-slate-700/50 text-slate-300 font-bold rounded-2xl hover:bg-slate-600/50 transition-all duration-300 border border-slate-600/30 hover:border-slate-500/50"
                        >
                          Cancel & Close
                        </button>
                        <button
                          type="submit"
                          disabled={isSavingTriage}
                          className="group flex-1 sm:flex-none flex items-center justify-center px-8 py-4 bg-gradient-to-r from-red-700 to-red-800 hover:from-red-600 hover:to-red-700 text-white font-black rounded-2xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl border border-red-600 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                        >
                          <svg className={`w-5 h-5 mr-3 transition-transform ${isSavingTriage ? 'animate-spin' : 'group-hover:rotate-12'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {isSavingTriage ? 'SAVING TRIAGE...' : 'MARK AS HANDLED'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Professional Scrollbar Styles - Positioned on Right Side */}
      <style jsx global>{`
        /* Global scrollbar styling - positioned flush right */
        ::-webkit-scrollbar {
          width: 12px;
        }
        
        ::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-left: 1px solid #e2e8f0;
        }
        
        ::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 6px;
          border: 2px solid #f1f5f9;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
        
        /* Custom scrollbar for main content areas */
        .custom-scrollbar::-webkit-scrollbar {
          width: 12px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f8fafc;
          border-radius: 6px;
          border-left: 1px solid #e2e8f0;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #e2e8f0, #cbd5e1);
          border-radius: 6px;
          border: 2px solid #f8fafc;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, #cbd5e1, #94a3b8);
        }
        
        /* Ensure scrollbars stay on the far right edge */
        .overflow-y-auto {
          scrollbar-gutter: stable;
        }
        
        /* Sidebar specific scrollbar */
        .sidebar-scrollbar::-webkit-scrollbar {
          width: 10px;
        }
        
        .sidebar-scrollbar::-webkit-scrollbar-track {
          background: #ffffff;
          border-radius: 4px;
        }
        
        .sidebar-scrollbar::-webkit-scrollbar-thumb {
          background: #e5e7eb;
          border-radius: 4px;
        }
        
        .sidebar-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #d1d5db;
        }
      `}</style>
    </div>
  );
};

export default EmergencyDashboard;