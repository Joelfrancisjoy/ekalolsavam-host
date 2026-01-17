import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { userServiceAdapter as userService, eventServiceAdapter as eventService } from '../services/serviceAdapter';
import volunteerService from '../services/volunteerService';
import http from '../services/http-common';

const VolunteerDashboard = () => {
  const [showPasswordChoice, setShowPasswordChoice] = useState(false);
  const [maskedPending, setMaskedPending] = useState('');
  const [creatingNew, setCreatingNew] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [pwdError, setPwdError] = useState('');

  // New state for volunteer dashboard
  const [assignments, setAssignments] = useState([]);
  const [verifications, setVerifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('assignments');
  const [verificationForm, setVerificationForm] = useState({
    chessNumber: '',
    eventId: '',
    notes: ''
  });
  const [verificationResult, setVerificationResult] = useState(null);
  const [error, setError] = useState('');
  const [participantDetails, setParticipantDetails] = useState(null);
  const [isSearchingParticipant, setIsSearchingParticipant] = useState(false);
  const [hoveredIcon, setHoveredIcon] = useState(null);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [eventParticipants, setEventParticipants] = useState([]);
  const [verifiedParticipantIds, setVerifiedParticipantIds] = useState(new Set());
  const [currentUser, setCurrentUser] = useState(null);

  // Re-check requests state
  const [recheckRequests, setRecheckRequests] = useState([]);
  const [selectedRecheckRequest, setSelectedRecheckRequest] = useState(null);
  const [isAcceptingRequest, setIsAcceptingRequest] = useState(false);
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
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    navigate('/login');
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await http.get('/api/auth/current/');
        setCurrentUser(response.data);
      } catch (error) {
        console.error('Failed to fetch user:', error);
        navigate('/login');
      }
    };
    fetchUser();

    try {
      const userBlob = localStorage.getItem('last_login_payload');
      if (userBlob) {
        const obj = JSON.parse(userBlob);
        const choice = obj?.password_choice || {};
        if (choice?.has_pending || choice?.must_reset) {
          setMaskedPending(choice?.masked_hint || '********');
          setShowPasswordChoice(true);
        }
      }
    } catch (_) { }
  }, [navigate]);

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

  useEffect(() => {
    if (currentUser) {
      loadVolunteerData();
    }
  }, [currentUser]);

  useEffect(() => {
    return () => {
      if (incomingEmergencyTimeoutRef.current) {
        clearTimeout(incomingEmergencyTimeoutRef.current);
        incomingEmergencyTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
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

    loadEmergencies();

    const interval = setInterval(() => {
      loadEmergencies();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const loadEventParticipants = async () => {
      if (!selectedEventId) {
        setEventParticipants([]);
        return;
      }
      try {
        const participants = await eventService.listParticipantsForEvent(selectedEventId);
        setEventParticipants(participants);
      } catch (error) {
        console.error('Failed to load event participants:', error);
        setEventParticipants([]);
      }
    };
    loadEventParticipants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEventId]);

  const loadVolunteerData = async () => {
    try {
      setLoading(true);
      setError(''); // Clear previous errors

      // Always load assignments and verifications
      const [assignmentsRes, verificationsRes] = await Promise.all([
        volunteerService.getAssignments().catch(err => {
          console.error('Failed to load assignments:', err);
          const errorMsg = err.response?.data?.error || err.message || 'Unknown error';
          setError(`Failed to load assignments: ${errorMsg}`);
          return { data: [] };
        }),
        volunteerService.getVerifications().catch(err => {
          console.error('Failed to load verifications:', err);
          const errorMsg = err.response?.data?.error || err.message || 'Unknown error';
          setError(`Failed to load verifications: ${errorMsg}`);
          return { data: [] };
        })
      ]);

      setAssignments(assignmentsRes.data || []);
      setVerifications(verificationsRes.data || []);

      // Load recheck requests separately (non-blocking) if user is a volunteer
      if (currentUser?.role === 'volunteer') {
        try {
          const recheckRes = await volunteerService.getRecheckRequests();
          const recheckData = recheckRes.data || [];
          console.log('Loaded recheck requests:', recheckData.length, recheckData);
          setRecheckRequests(recheckData);
        } catch (recheckError) {
          console.error('Failed to load recheck requests (non-critical):', recheckError);
          // Don't fail the entire load if recheck requests fail
          setRecheckRequests([]);
        }
      } else {
        setRecheckRequests([]);
      }

      // Build a set of verified participant IDs for quick lookup
      const verifiedIds = new Set(
        (verificationsRes.data || [])
          .filter(v => v.status === 'verified')
          .map(v => v.participant)
      );
      setVerifiedParticipantIds(verifiedIds);
    } catch (error) {
      console.error('Error loading volunteer data:', error);
      setError('Failed to load volunteer data. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async (shiftId) => {
    try {
      if (!shiftId) {
        setError('This assignment does not require check-in');
        return;
      }
      await volunteerService.checkIn(shiftId);
      await loadVolunteerData(); // Refresh data
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to check in');
    }
  };

  const searchParticipantByChessNumber = async (chessNumber, eventId) => {
    if (!chessNumber || !eventId) {
      setParticipantDetails(null);
      return;
    }

    setIsSearchingParticipant(true);
    try {
      // Get participant details from the event registration
      const response = await eventService.getParticipantByChessNumber(chessNumber, eventId);
      setParticipantDetails(response.data);

      // Auto-fill event details in notes
      const selectedEvent = assignments.find(a => a.id === parseInt(eventId));
      if (selectedEvent && response.data) {
        const eventDetails = `Event: ${selectedEvent.name}\nDate: ${selectedEvent.date}\nTime: ${selectedEvent.start_time} - ${selectedEvent.end_time}\nVenue: ${selectedEvent.venue}`;
        setVerificationForm(prev => ({
          ...prev,
          notes: eventDetails
        }));
      }
    } catch (error) {
      console.error('Error searching participant:', error);
      setParticipantDetails(null);
    } finally {
      setIsSearchingParticipant(false);
    }
  };

  const handleChessNumberChange = (chessNumber) => {
    setVerificationForm(prev => ({ ...prev, chessNumber }));
    if (chessNumber && verificationForm.eventId) {
      searchParticipantByChessNumber(chessNumber, verificationForm.eventId);
    }
  };

  const handleEventChange = (eventId) => {
    setVerificationForm(prev => ({ ...prev, eventId }));
    if (verificationForm.chessNumber && eventId) {
      searchParticipantByChessNumber(verificationForm.chessNumber, eventId);
    }
  };

  const handleVerifyParticipant = async (e) => {
    e.preventDefault();
    if (!verificationForm.chessNumber || !verificationForm.eventId) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      const result = await volunteerService.verifyParticipant(
        verificationForm.chessNumber,
        verificationForm.eventId,
        verificationForm.notes
      );
      setVerificationResult(result.data);
      setVerificationForm({ chessNumber: '', eventId: '', notes: '' });
      setParticipantDetails(null);
      await loadVolunteerData(); // Refresh data
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to verify participant');
    }
  };

  const handleAcceptRecheckRequest = async (recheckRequestId) => {
    try {
      setIsAcceptingRequest(true);
      setError('');
      await volunteerService.acceptRecheckRequest(recheckRequestId);

      // Refresh recheck requests data
      const recheckRequestsRes = await volunteerService.getRecheckRequests();
      setRecheckRequests(recheckRequestsRes.data);

      // Clear selected request if it was the one we just accepted
      if (selectedRecheckRequest?.id === recheckRequestId) {
        setSelectedRecheckRequest(null);
      }

      setVerificationResult({ message: 'Re-check request accepted successfully!' });
    } catch (error) {
      console.error('Error accepting recheck request:', error);
      setError(error.response?.data?.error || 'Failed to accept re-check request');
    } finally {
      setIsAcceptingRequest(false);
    }
  };

  const handleSelectRecheckRequest = async (request) => {
    try {
      setSelectedRecheckRequest(request);
      // Optionally fetch detailed information if needed
      const detailsRes = await volunteerService.getRecheckRequestDetails(request.id);
      setSelectedRecheckRequest(detailsRes.data);
    } catch (error) {
      console.error('Error fetching recheck request details:', error);
      setError('Failed to load request details');
    }
  };

  const acceptProvidedPassword = async () => {
    try {
      const res = await userService.acceptPendingPassword();
      if (res?.access && res?.refresh) {
        localStorage.setItem('access_token', res.access);
        localStorage.setItem('refresh_token', res.refresh);
      }
      setShowPasswordChoice(false);
    } catch (e) {
      setPwdError(e?.response?.data?.error || 'Failed to update password');
    }
  };

  const submitNewPassword = async () => {
    setPwdError('');
    if (!newPassword || newPassword.length < 8) {
      setPwdError('Password must be at least 8 characters');
      return;
    }
    try {
      const res = await userService.setNewPassword(newPassword);
      if (res?.access && res?.refresh) {
        localStorage.setItem('access_token', res.access);
        localStorage.setItem('refresh_token', res.refresh);
      }
      setShowPasswordChoice(false);
      setCreatingNew(false);
      setNewPassword('');
    } catch (e) {
      setPwdError(e?.response?.data?.error || 'Failed to set password');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col">
      {/* User Info Header with Logout */}
      <div className="bg-white border-b-2 border-gray-100 shadow-sm mb-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            {/* Left: Title and Subtitle */}
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">Volunteer Dashboard</h1>
              <p className="text-sm text-gray-600 mt-1">Manage shifts and verify participants</p>
            </div>

            {/* Right: User Info and Logout Button */}
            <div className="flex items-center space-x-4">
              {/* User Info Card */}
              <div className="flex items-center space-x-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl px-4 py-2.5 border border-gray-200 shadow-sm">
                {/* Role Icon */}
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-sm">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M16,4C16.88,4 17.67,4.38 18.18,5C18.69,4.38 19.48,4 20.36,4C21.8,4 23,5.2 23,6.64C23,8.09 21.8,9.29 20.36,9.29C19.48,9.29 18.69,8.91 18.18,8.29C17.67,8.91 16.88,9.29 16,9.29C14.56,9.29 13.36,8.09 13.36,6.64C13.36,5.2 14.56,4 16,4M13,12H21V14H13V12M13,16H21V18H13V16M13,20H21V22H13V20M11,13H9V11H11V13M11,17H9V15H11V17M11,21H9V19H11V21Z" />
                  </svg>
                </div>

                {/* User Details */}
                <div className="flex flex-col">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-bold text-gray-900">
                      {currentUser?.username}
                    </span>
                    <div className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-sm">
                      Volunteer
                    </div>
                  </div>
                  {(currentUser?.first_name || currentUser?.last_name) && (
                    <span className="text-xs text-gray-600">
                      {currentUser.first_name} {currentUser.last_name}
                    </span>
                  )}
                </div>
              </div>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-all duration-200 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {showPasswordChoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6">
            {!creatingNew ? (
              <div>
                <h3 className="text-xl font-bold mb-2">Would you prefer to continue with your provided password?</h3>
                <p className="text-gray-600 mb-4">Password hint: <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">{maskedPending}</span></p>
                {pwdError ? <div className="text-red-600 text-sm mb-3">{pwdError}</div> : null}
                <div className="flex gap-3 justify-end">
                  <button onClick={() => setCreatingNew(true)} className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300">Create new password</button>
                  <button onClick={acceptProvidedPassword} className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700">Continue</button>
                </div>
              </div>
            ) : (
              <div>
                <h3 className="text-xl font-bold mb-2">Create new password</h3>
                <p className="text-gray-600 mb-4">Choose a strong password (min 8 characters).</p>
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full border rounded-lg px-3 py-2 mb-2" placeholder="Enter new password" />
                {pwdError ? <div className="text-red-600 text-sm mb-3">{pwdError}</div> : null}
                <div className="flex gap-3 justify-end">
                  <button onClick={() => { setCreatingNew(false); setPwdError(''); }} className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300">Back</button>
                  <button onClick={submitNewPassword} className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">Save password</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 flex-1 min-h-0">
        <div className="flex flex-col lg:flex-row gap-6 h-full min-h-0">
          {/* Main Content Area */}
          <div className="flex-1 min-h-0 flex flex-col">
            {/* Navigation Tabs */}
            <div className="mb-6">
              <nav className={`grid ${currentUser?.role === 'volunteer' ? 'grid-cols-5' : 'grid-cols-4'} gap-1 bg-white rounded-lg p-1 shadow-sm`}>
                <button
                  onClick={() => setActiveTab('assignments')}
                  className={`py-3 px-4 rounded-md font-semibold text-sm transition-all duration-200 ${activeTab === 'assignments'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                >
                  <div className="flex items-center justify-center space-x-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <span>My Assignments</span>
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('participants')}
                  className={`py-3 px-4 rounded-md font-semibold text-sm transition-all duration-200 ${activeTab === 'participants'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                >
                  <div className="flex items-center justify-center space-x-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                    <span>Event Participants</span>
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('verification')}
                  className={`py-3 px-4 rounded-md font-semibold text-sm transition-all duration-200 ${activeTab === 'verification'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                >
                  <div className="flex items-center justify-center space-x-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Verify Participants</span>
                  </div>
                </button>
                {currentUser?.role === 'volunteer' && (
                  <button
                    onClick={async () => {
                      setActiveTab('recheck');
                      // Refresh recheck requests when tab is opened
                      if (currentUser?.role === 'volunteer') {
                        try {
                          const res = await volunteerService.getRecheckRequests();
                          const recheckData = res.data || [];
                          console.log('Refreshed recheck requests:', recheckData.length, recheckData);
                          setRecheckRequests(recheckData);
                        } catch (err) {
                          console.error('Failed to load recheck requests:', err);
                          setRecheckRequests([]);
                        }
                      }
                    }}
                    className={`py-3 px-4 rounded-md font-semibold text-sm transition-all duration-200 ${activeTab === 'recheck'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                  >
                    <div className="flex flex-col items-center justify-center">
                      <div className="flex items-center justify-center space-x-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <span>Result Re-Evaluation</span>
                      </div>
                      <div className="flex gap-1 mt-1">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-yellow-100 text-yellow-800">
                          {recheckRequests.filter(req => req.status === 'Pending' || req.status === 'pending').length}
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                          {recheckRequests.filter(req => req.status === 'Accepted' || req.status === 'accepted').length}
                        </span>
                      </div>
                    </div>
                  </button>
                )}
                <button
                  onClick={() => setActiveTab('emergencies')}
                  className={`py-3 px-4 rounded-md font-semibold text-sm transition-all duration-200 ${activeTab === 'emergencies'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                >
                  <div className="flex items-center justify-center space-x-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M5.07 19h13.86A2 2 0 0020.8 16.6l-6.93-12a2 2 0 00-3.54 0l-6.93 12A2 2 0 005.07 19z" />
                    </svg>
                    <span>Emergency Alerts</span>
                  </div>
                </button>
              </nav>
            </div>

            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
              {incomingEmergencyAlert && (
                <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      <svg className="h-6 w-6 text-red-600" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.72-1.36 3.485 0l6.518 11.59c.75 1.334-.213 2.99-1.742 2.99H3.48c-1.53 0-2.492-1.656-1.743-2.99l6.52-11.59zM11 14a1 1 0 10-2 0 1 1 0 002 0zm-1-2a1 1 0 01-1-1V7a1 1 0 012 0v4a1 1 0 01-1 1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-extrabold text-red-900">
                        New Emergency Alert: {incomingEmergencyAlert.emergency_type?.toUpperCase() || 'EMERGENCY'}
                        {incomingEmergencyAlert.venue_name ? ` @ ${incomingEmergencyAlert.venue_name}` : ''}
                        {incomingEmergencyAlert.severity ? ` (${incomingEmergencyAlert.severity.toUpperCase()})` : ''}
                      </div>
                      <div className="text-sm text-red-800 mt-1">
                        Click to open triage immediately.
                      </div>
                      <div className="mt-3 flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab('emergencies');
                            handleSelectEmergency(incomingEmergencyAlert);
                            setIncomingEmergencyAlert(null);
                          }}
                          className="inline-flex items-center px-4 py-2 rounded-lg bg-red-600 text-white font-bold hover:bg-red-700"
                        >
                          Open triage
                        </button>
                        <button
                          type="button"
                          onClick={() => setIncomingEmergencyAlert(null)}
                          className="text-red-700 font-semibold hover:text-red-900"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Error Display */}
              {error && (
                <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 shadow-sm">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-red-800">{error}</p>
                    </div>
                    <div className="ml-auto pl-3">
                      <button onClick={() => setError('')} className="text-red-400 hover:text-red-600">
                        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Success Message */}
              {verificationResult && (
                <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 shadow-sm">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-green-800">
                        Participant verified successfully! Chess Number: {verificationResult.chess_number}
                      </p>
                    </div>
                    <div className="ml-auto pl-3">
                      <button onClick={() => setVerificationResult(null)} className="text-green-400 hover:text-green-600">
                        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className={`flex-1 min-h-0 ${activeTab === 'emergencies' ? 'overflow-hidden' : 'overflow-y-auto'}`}>
                {/* Tab Content */}
                {activeTab === 'assignments' && (
                  <AssignmentsTab assignments={assignments} onCheckIn={handleCheckIn} />
                )}

                {activeTab === 'participants' && (
                  <ParticipantsTab
                    assignments={assignments}
                    selectedEventId={selectedEventId}
                    setSelectedEventId={setSelectedEventId}
                    eventParticipants={eventParticipants}
                    verifiedParticipantIds={verifiedParticipantIds}
                  />
                )}

                {activeTab === 'verification' && (
                  <VerificationTab
                    assignments={assignments}
                    verificationForm={verificationForm}
                    setVerificationForm={setVerificationForm}
                    onVerify={handleVerifyParticipant}
                    participantDetails={participantDetails}
                    isSearchingParticipant={isSearchingParticipant}
                    onChessNumberChange={handleChessNumberChange}
                    onEventChange={handleEventChange}
                  />
                )}

                {activeTab === 'recheck' && currentUser?.role === 'volunteer' && (
                  <RecheckRequestsTab
                    recheckRequests={recheckRequests}
                    selectedRecheckRequest={selectedRecheckRequest}
                    onSelectRequest={handleSelectRecheckRequest}
                    onAcceptRequest={handleAcceptRecheckRequest}
                    isAcceptingRequest={isAcceptingRequest}
                    onRefresh={async () => {
                      try {
                        const res = await volunteerService.getRecheckRequests();
                        const recheckData = res.data || [];
                        console.log('Refreshed recheck requests:', recheckData.length, recheckData);
                        setRecheckRequests(recheckData);
                      } catch (err) {
                        console.error('Failed to refresh recheck requests:', err);
                        setError('Failed to refresh recheck requests');
                      }
                    }}
                  />
                )}

                {activeTab === 'emergencies' && (
                  <EmergenciesTab
                    emergencies={emergencies}
                    selectedEmergencyId={selectedEmergencyId}
                    triageForm={triageForm}
                    setTriageForm={setTriageForm}
                    onSelectEmergency={handleSelectEmergency}
                    onSaveTriage={handleSaveTriage}
                    isSavingTriage={isSavingTriage}
                    triageSaveSuccess={triageSaveSuccess}
                    showCreateEmergency={showCreateEmergency}
                    setShowCreateEmergency={setShowCreateEmergency}
                    createEmergencyForm={createEmergencyForm}
                    setCreateEmergencyForm={setCreateEmergencyForm}
                    onCreateEmergency={handleCreateEmergency}
                    isCreatingEmergency={isCreatingEmergency}
                    createEmergencySuccess={createEmergencySuccess}
                  />
                )}

                {activeTab === 'history' && (
                  <HistoryTab verifications={verifications} />
                )}
              </div>
            </div>
          </div>

          {/* Right Sidebar with Big Icons */}
          {activeTab !== 'emergencies' && (
            <div className="w-full lg:w-72 xl:w-80 space-y-6 lg:h-full lg:overflow-y-auto lg:pr-1">
              {/* Participant Verification Icon */}
              <div
                className="relative group cursor-pointer"
                onMouseEnter={() => setHoveredIcon('verification')}
                onMouseLeave={() => setHoveredIcon(null)}
                onClick={() => setActiveTab('verification')}
              >
                <div className={`bg-white rounded-2xl p-8 shadow-lg transition-all duration-300 transform ${hoveredIcon === 'verification' ? 'scale-105 shadow-xl' : 'hover:shadow-xl'
                  } ${activeTab === 'verification' ? 'ring-2 ring-blue-500' : ''}`}>
                  <div className="text-center">
                    <div className="mx-auto w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                      <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Participant Verification</h3>
                    <p className="text-sm text-gray-600">Verify participants by chess number</p>
                  </div>
                </div>

                {/* Hover Tooltip */}
                {hoveredIcon === 'verification' && (
                  <div className="absolute right-full top-1/2 transform -translate-y-1/2 mr-4 bg-gray-900 text-white text-sm rounded-lg px-3 py-2 whitespace-nowrap z-10">
                    <div className="w-2 h-2 bg-gray-900 absolute left-full top-1/2 transform -translate-y-1/2 rotate-45"></div>
                    <div className="font-medium">Quick Actions:</div>
                    <div className="text-xs mt-1">• Enter chess number</div>
                    <div className="text-xs">• Auto-fill participant details</div>
                    <div className="text-xs">• Send to assigned judges</div>
                  </div>
                )}
              </div>

              {/* Verification History Icon */}
              <div
                className="relative group cursor-pointer"
                onMouseEnter={() => setHoveredIcon('history')}
                onMouseLeave={() => setHoveredIcon(null)}
                onClick={() => setActiveTab('history')}
              >
                <div className={`bg-white rounded-2xl p-8 shadow-lg transition-all duration-300 transform ${hoveredIcon === 'history' ? 'scale-105 shadow-xl' : 'hover:shadow-xl'
                  } ${activeTab === 'history' ? 'ring-2 ring-blue-500' : ''}`}>
                  <div className="text-center">
                    <div className="mx-auto w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mb-4">
                      <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Verification History</h3>
                    <p className="text-sm text-gray-600">View all verified participants</p>
                    <div className="mt-3 text-xs text-gray-500">
                      {verifications.length} verified
                    </div>
                  </div>
                </div>

                {/* Hover Tooltip */}
                {hoveredIcon === 'history' && (
                  <div className="absolute right-full top-1/2 transform -translate-y-1/2 mr-4 bg-gray-900 text-white text-sm rounded-lg px-3 py-2 whitespace-nowrap z-10">
                    <div className="w-2 h-2 bg-gray-900 absolute left-full top-1/2 transform -translate-y-1/2 rotate-45"></div>
                    <div className="font-medium">History Details:</div>
                    <div className="text-xs mt-1">• View verification records</div>
                    <div className="text-xs">• Check participant status</div>
                    <div className="text-xs">• Export verification data</div>
                  </div>
                )}
              </div>

              {/* Quick Stats */}
              <div className="bg-white rounded-2xl p-6 shadow-lg">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Stats</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Active Assignments</span>
                    <span className="text-lg font-bold text-blue-600">{assignments.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Participants</span>
                    <span className="text-lg font-bold text-indigo-600">{eventParticipants.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Verified Today</span>
                    <span className="text-lg font-bold text-green-600">
                      {verifications.filter(v =>
                        new Date(v.verification_time).toDateString() === new Date().toDateString()
                      ).length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Verified</span>
                    <span className="text-lg font-bold text-purple-600">{verifications.length}</span>
                  </div>
                  {currentUser?.role === 'volunteer' && (
                    <div className="mt-4 w-full">
                      <button
                        type="button"
                        onClick={() => setActiveTab('recheck')}
                        className="w-full flex items-center justify-between px-4 py-2 rounded-lg border border-orange-200 bg-orange-50 hover:bg-orange-100 transition-colors duration-200"
                      >
                        <span className="text-sm font-semibold text-orange-800">Result Re-Evaluation</span>
                        <div className="flex gap-1">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-800">
                            {recheckRequests.filter(req => req.status === 'Pending' || req.status === 'pending').length} Pending
                          </span>
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                            {recheckRequests.filter(req => req.status === 'Accepted' || req.status === 'accepted').length} Accepted
                          </span>
                        </div>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Tab Components
const AssignmentsTab = ({ assignments, onCheckIn }) => {
  if (assignments.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
        <div className="mx-auto w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
          <svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">No assignments</h3>
        <p className="text-gray-600 font-medium">You don't have any volunteer assignments yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {assignments.map((assignment) => (
        <div key={assignment.id} className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
          <div className="px-8 py-6 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900 mb-2">{assignment.name}</h3>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <div className="flex items-center space-x-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>{assignment.venue}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>{assignment.date}</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-gray-900">
                  {assignment.start_time} - {assignment.end_time}
                </div>
                <div className="text-sm text-gray-500">Duration</div>
              </div>
            </div>
          </div>
          <div className="px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-6">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-800">
                  <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                  Active
                </span>
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Shift ID:</span> {assignment.shift_id}
                </div>
              </div>
              <button
                onClick={() => onCheckIn(assignment.shift_id)}
                className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-semibold rounded-xl text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 transform hover:scale-105"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Check In
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const VerificationTab = ({ assignments, verificationForm, setVerificationForm, onVerify, participantDetails, isSearchingParticipant, onChessNumberChange, onEventChange }) => {
  return (
    <div className="space-y-8">
      {/* Verification Form */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="px-8 py-6 bg-gradient-to-r from-blue-600 to-blue-700">
          <h3 className="text-xl font-bold text-white">Verify Participant</h3>
          <p className="text-blue-100 mt-1">Enter the chess number to verify a participant</p>
        </div>
        <form onSubmit={onVerify} className="px-8 py-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="event" className="block text-sm font-semibold text-gray-700 mb-2">
                Event *
              </label>
              <select
                id="event"
                value={verificationForm.eventId}
                onChange={(e) => onEventChange(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-medium transition-all duration-200"
                required
              >
                <option value="">Select an event</option>
                {assignments.map((assignment, idx) => (
                  <option key={`${assignment.id}-${idx}`} value={assignment.id}>
                    {assignment.name} - {assignment.date}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="chessNumber" className="block text-sm font-semibold text-gray-700 mb-2">
                Chess Number *
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="chessNumber"
                  value={verificationForm.chessNumber}
                  onChange={(e) => onChessNumberChange(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-medium transition-all duration-200"
                  placeholder="Enter chess number"
                  required
                />
                {isSearchingParticipant && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Participant Details Display */}
          {participantDetails && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h4 className="text-lg font-bold text-green-800">Participant Found</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="text-sm font-medium text-green-700">Name:</span>
                  <p className="text-sm text-green-800 font-semibold">
                    {participantDetails.first_name} {participantDetails.last_name}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium text-green-700">Category:</span>
                  <p className="text-sm text-green-800 font-semibold">
                    {participantDetails.section || 'N/A'}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium text-green-700">School:</span>
                  <p className="text-sm text-green-800 font-semibold">
                    {participantDetails.school?.name || 'N/A'}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium text-green-700">Class:</span>
                  <p className="text-sm text-green-800 font-semibold">
                    {participantDetails.student_class || 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div>
            <label htmlFor="notes" className="block text-sm font-semibold text-gray-700 mb-2">
              Event Details & Notes
            </label>
            <textarea
              id="notes"
              value={verificationForm.notes}
              onChange={(e) => setVerificationForm({ ...verificationForm, notes: e.target.value })}
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-medium transition-all duration-200"
              placeholder="Event details and any additional notes will be auto-filled..."
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center px-8 py-3 border border-transparent text-sm font-bold rounded-xl text-white bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-200 transform hover:scale-105"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Verify Participant
            </button>
          </div>
        </form>
      </div>

      {/* Instructions */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="h-6 w-6 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
          <div className="ml-4">
            <h3 className="text-lg font-bold text-blue-800 mb-3">Verification Instructions</h3>
            <div className="text-sm text-blue-700 space-y-2">
              <div className="flex items-start space-x-2">
                <span className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-xs font-bold text-blue-800">1</span>
                <span>Ask the participant for their chess number</span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-xs font-bold text-blue-800">2</span>
                <span>Enter the chess number - participant details will auto-fill</span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-xs font-bold text-blue-800">3</span>
                <span>Select the correct event from your assignments</span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-xs font-bold text-blue-800">4</span>
                <span>Click "Verify Participant" to confirm and send to judges</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const HistoryTab = ({ verifications }) => {
  if (verifications.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
        <div className="mx-auto w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
          <svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">No verifications</h3>
        <p className="text-gray-600 font-medium">You haven't verified any participants yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {verifications.map((verification) => (
        <div key={verification.id} className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
          <div className="px-8 py-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      {verification.participant_details?.first_name} {verification.participant_details?.last_name}
                    </h3>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${verification.status === 'verified'
                        ? 'bg-green-100 text-green-800'
                        : verification.status === 'rejected'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                        }`}>
                        <div className={`w-2 h-2 rounded-full mr-2 ${verification.status === 'verified' ? 'bg-green-400' :
                          verification.status === 'rejected' ? 'bg-red-400' : 'bg-yellow-400'
                          }`}></div>
                        {verification.status}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <span className="text-sm font-medium text-gray-600">Event:</span>
                    <p className="text-sm font-semibold text-gray-900">{verification.event_details?.name}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-600">Chess Number:</span>
                    <p className="text-sm font-semibold text-gray-900 font-mono">{verification.chess_number}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-600">Category:</span>
                    <p className="text-sm font-semibold text-gray-900">
                      {verification.participant_details?.section || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-600">School:</span>
                    <p className="text-sm font-semibold text-gray-900">
                      {verification.participant_details?.school?.name || 'N/A'}
                    </p>
                  </div>
                </div>

                {verification.notes && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <span className="text-sm font-medium text-gray-600">Notes:</span>
                    <p className="text-sm text-gray-800 mt-1 whitespace-pre-line">{verification.notes}</p>
                  </div>
                )}
              </div>

              <div className="text-right ml-6">
                <div className="text-sm font-medium text-gray-600 mb-1">Verified</div>
                <div className="text-sm font-bold text-gray-900">
                  {new Date(verification.verification_time).toLocaleDateString()}
                </div>
                <div className="text-sm text-gray-500">
                  {new Date(verification.verification_time).toLocaleTimeString()}
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Participants Tab Component
const ParticipantsTab = ({ assignments, selectedEventId, setSelectedEventId, eventParticipants, verifiedParticipantIds }) => {
  if (assignments.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
        <div className="mx-auto w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
          <svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">No assigned events</h3>
        <p className="text-gray-600 font-medium">You need to be assigned to events to view participants.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Event Selector */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Select Event</h3>
        <select
          value={selectedEventId || ''}
          onChange={(e) => setSelectedEventId(Number(e.target.value) || null)}
          className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Choose an event to view participants</option>
          {assignments.map((assignment) => (
            <option key={assignment.id} value={assignment.id}>
              {assignment.name} - {assignment.date}
            </option>
          ))}
        </select>
      </div>

      {/* Participants List */}
      {selectedEventId && (
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-bold text-gray-900">
              Registered Participants ({eventParticipants.length})
            </h3>
          </div>

          {eventParticipants.length === 0 ? (
            <div className="p-12 text-center">
              <svg className="mx-auto w-16 h-16 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
              <h4 className="text-lg font-medium text-gray-900 mb-2">No participants registered yet</h4>
              <p className="text-gray-600">Participants will appear here once they register for this event.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {eventParticipants.map((registration) => {
                const isVerified = verifiedParticipantIds.has(registration.participant);
                return (
                  <div key={registration.id} className={`p-6 transition-colors duration-200 ${isVerified ? 'bg-green-50 hover:bg-green-100' : 'hover:bg-gray-50'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4">
                          <div className={`rounded-full p-2 ${isVerified ? 'bg-green-100' : 'bg-blue-100'}`}>
                            {isVerified ? (
                              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            ) : (
                              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <h4 className="text-lg font-semibold text-gray-900">
                                {registration.participant_details?.first_name} {registration.participant_details?.last_name}
                              </h4>
                              {isVerified && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                  Verified & Active
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600">
                              Chess Number: <span className="font-mono font-semibold">{registration.chess_number}</span>
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <span className="text-sm font-medium text-gray-600">School:</span>
                            <p className="text-sm text-gray-900">{registration.participant_details?.school?.name || 'N/A'}</p>
                          </div>
                          <div>
                            <span className="text-sm font-medium text-gray-600">Class/Section:</span>
                            <p className="text-sm text-gray-900">{registration.participant_details?.section || 'N/A'}</p>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-600 mb-1">Registered</div>
                        <div className="text-sm font-bold text-gray-900">
                          {new Date(registration.registration_date).toLocaleDateString()}
                        </div>
                        <div className="text-sm text-gray-500">
                          {new Date(registration.registration_date).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const EmergenciesTab = ({ emergencies, selectedEmergencyId, triageForm, setTriageForm, onSelectEmergency, onSaveTriage, isSavingTriage, triageSaveSuccess, showCreateEmergency, setShowCreateEmergency, createEmergencyForm, setCreateEmergencyForm, onCreateEmergency, isCreatingEmergency, createEmergencySuccess }) => {
  return (
    <div className="h-full flex flex-col gap-6">
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-6">
        <div className={`${selectedEmergencyId ? 'lg:col-span-4' : 'lg:col-span-12'}`}>
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden h-full flex flex-col">
            <div className="px-6 py-5 bg-gradient-to-r from-slate-900 to-slate-800">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-2xl font-extrabold text-white tracking-tight">Emergency Alerts</h3>
                  <p className="text-base text-slate-200 mt-1">Select an emergency to triage and update details.</p>
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={() => setShowCreateEmergency(!showCreateEmergency)}
                      className="inline-flex items-center px-4 py-2 rounded-xl text-base font-extrabold bg-red-600 text-white hover:bg-red-700"
                    >
                      {showCreateEmergency ? 'Close alert sender' : 'Send alert to volunteers'}
                    </button>
                  </div>
                </div>
                <span className="inline-flex items-center px-4 py-2 rounded-full text-base font-extrabold bg-red-600 text-white">
                  <span className="w-2.5 h-2.5 bg-white rounded-full mr-2" />
                  {emergencies.length} Active
                </span>
              </div>
            </div>

            <div className="p-5 flex-1 min-h-0 flex flex-col">
              {createEmergencySuccess && (
                <div className="mb-4 bg-green-50 border border-green-200 rounded-2xl px-5 py-4 text-lg font-extrabold text-green-800">
                  {createEmergencySuccess}
                </div>
              )}

              {showCreateEmergency && (
                <form onSubmit={onCreateEmergency} className="mb-5 rounded-2xl border border-red-200 bg-red-50/50 p-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-base font-extrabold text-gray-800 mb-2">Emergency type</label>
                      <select
                        value={createEmergencyForm.emergency_type}
                        onChange={(e) => setCreateEmergencyForm({ ...createEmergencyForm, emergency_type: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-2xl text-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        required
                      >
                        <option value="medical">Medical</option>
                        <option value="fire">Fire / Smoke</option>
                        <option value="security">Security / Safety</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-base font-extrabold text-gray-800 mb-3">Severity</label>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        {[
                          { id: 'red', label: 'RED' },
                          { id: 'orange', label: 'ORANGE' },
                          { id: 'yellow', label: 'YELLOW' },
                          { id: 'blue', label: 'BLUE' },
                          { id: 'green', label: 'GREEN' },
                        ].map((level) => (
                          <button
                            key={level.id}
                            type="button"
                            onClick={() => setCreateEmergencyForm({ ...createEmergencyForm, severity: level.id })}
                            className={`rounded-2xl border px-4 py-3 text-base font-extrabold transition-all ${createEmergencyForm.severity === level.id
                              ? 'border-red-500 bg-white shadow-sm'
                              : 'border-gray-200 bg-white/80 hover:border-red-300'
                              }`}
                          >
                            {level.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5">
                    <label className="block text-base font-extrabold text-gray-800 mb-2">Short description (optional)</label>
                    <textarea
                      rows={3}
                      value={createEmergencyForm.cause_description}
                      onChange={(e) => setCreateEmergencyForm({ ...createEmergencyForm, cause_description: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-2xl text-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      placeholder="What is happening?"
                    />
                  </div>

                  <div className="mt-5 flex justify-end">
                    <button
                      type="submit"
                      disabled={isCreatingEmergency}
                      className="inline-flex items-center px-8 py-4 rounded-2xl text-lg font-extrabold text-white bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isCreatingEmergency ? 'Sending...' : 'Send alert'}
                    </button>
                  </div>
                </form>
              )}

              {emergencies.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <div className="w-full p-10 text-center border-2 border-dashed border-gray-200 rounded-2xl">
                    <p className="text-lg font-semibold text-gray-700">No active emergencies right now.</p>
                    <p className="text-base text-gray-500 mt-2">When a public alert is triggered, it will appear here automatically.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 flex-1 min-h-0 overflow-y-auto pr-1">
                  {emergencies.map((emergency) => (
                    <button
                      key={emergency.id}
                      type="button"
                      onClick={() => onSelectEmergency(emergency)}
                      className={`w-full text-left rounded-2xl border p-5 flex items-start justify-between gap-4 transition-all duration-150 ${selectedEmergencyId === emergency.id
                        ? 'border-red-500 bg-red-50 shadow-md'
                        : 'border-gray-200 bg-white hover:border-red-300 hover:bg-red-50/40'
                        }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="inline-flex w-3 h-3 rounded-full bg-red-500" />
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
                                    ? 'bg-yellow-300 text-gray-900'
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
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-slate-100 text-slate-800 capitalize">
                          {emergency.status}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {selectedEmergencyId && (
          <div className="lg:col-span-8">
            <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden h-full flex flex-col">
              <div className="px-6 py-5 bg-gradient-to-r from-red-600 to-red-700">
                <h3 className="text-2xl font-extrabold text-white tracking-tight">Volunteer Triage</h3>
                <p className="text-base text-red-100 mt-1">Capture minimal details quickly. Safety and speed first.</p>
              </div>

              {triageSaveSuccess && (
                <div className="px-6 pt-5">
                  <div className="bg-green-50 border border-green-200 rounded-2xl px-5 py-4 text-lg font-extrabold text-green-800">
                    {triageSaveSuccess}
                  </div>
                </div>
              )}

              <form onSubmit={onSaveTriage} className="px-6 py-6 flex-1 min-h-0 overflow-y-auto flex flex-col">
                <div className="space-y-7 flex-1">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-base font-extrabold text-gray-800 mb-2">Person role</label>
                      <select
                        value={triageForm.person_role}
                        onChange={(e) => setTriageForm({ ...triageForm, person_role: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-2xl text-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      >
                        <option value="">Select role</option>
                        <option value="participant">Participant</option>
                        <option value="judge">Judge</option>
                        <option value="volunteer">Volunteer</option>
                        <option value="staff">Staff</option>
                        <option value="public">Public Visitor</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-base font-extrabold text-gray-800 mb-2">ID / Chess number</label>
                      <input
                        type="text"
                        value={triageForm.person_id_value}
                        onChange={(e) => setTriageForm({ ...triageForm, person_id_value: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-2xl text-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        placeholder="Optional, if known"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-base font-extrabold text-gray-800 mb-2">Short description</label>
                    <textarea
                      rows={4}
                      value={triageForm.cause_description}
                      onChange={(e) => setTriageForm({ ...triageForm, cause_description: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-2xl text-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      placeholder="What did you see / what is happening?"
                    />
                  </div>

                  <div>
                    <label className="block text-base font-extrabold text-gray-800 mb-3">Severity (volunteer only)</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                      {[
                        { id: 'red', label: 'RED', desc: 'Life-threatening' },
                        { id: 'orange', label: 'ORANGE', desc: 'Very urgent' },
                        { id: 'yellow', label: 'YELLOW', desc: 'Urgent but stable' },
                        { id: 'blue', label: 'BLUE', desc: 'Observation' },
                        { id: 'green', label: 'GREEN', desc: 'Minor' },
                      ].map((level) => (
                        <button
                          key={level.id}
                          type="button"
                          onClick={() => setTriageForm({ ...triageForm, severity: level.id })}
                          className={`text-left rounded-2xl border p-4 transition-all ${triageForm.severity === level.id
                            ? 'border-red-500 bg-red-50 shadow-sm'
                            : 'border-gray-200 bg-white hover:border-red-300 hover:bg-red-50/40'
                            }`}
                        >
                          <div className="text-base font-extrabold tracking-wide text-gray-900">{level.label}</div>
                          <div className="text-base text-gray-700 mt-1">{level.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-6">
                  <button
                    type="submit"
                    disabled={isSavingTriage}
                    className="inline-flex items-center px-8 py-4 rounded-2xl text-lg font-extrabold text-white bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isSavingTriage ? 'Saving...' : 'Save triage'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Re-Check Requests Tab Component
const RecheckRequestsTab = ({ recheckRequests, selectedRecheckRequest, onSelectRequest, onAcceptRequest, isAcceptingRequest, onRefresh }) => {
  const pendingRequests = recheckRequests.filter(request => request.status === 'Pending' || request.status === 'pending');
  const acceptedRequests = recheckRequests.filter(request => request.status === 'Accepted' || request.status === 'accepted');

  if (recheckRequests.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
        <div className="mx-auto w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
          <svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">No re-check requests</h3>
        <p className="text-gray-600 font-medium">There are no re-check requests assigned to you.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-6">
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Requests List */}
        <div className={`${selectedRecheckRequest ? 'lg:col-span-5' : 'lg:col-span-12'}`}>
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden h-full flex flex-col">
            <div className="px-6 py-4 bg-gradient-to-r from-orange-600 to-orange-700">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white">Re-Check Requests</h3>
                  <p className="text-orange-100 mt-1">Select a request to review and accept</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-yellow-100 text-yellow-800">
                      {pendingRequests.length} Pending
                    </span>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-blue-100 text-blue-800">
                      {acceptedRequests.length} Accepted
                    </span>
                  </div>
                </div>
                <button
                  onClick={onRefresh}
                  className="px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-400 text-white text-sm font-semibold transition-colors"
                  title="Refresh requests"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-4">
              <div className="space-y-6">
                {/* Pending Requests Section */}
                {pendingRequests.length > 0 && (
                  <div>
                    <h4 className="text-lg font-bold text-yellow-800 mb-3 flex items-center">
                      <span className="inline-block w-3 h-3 bg-yellow-500 rounded-full mr-2"></span>
                      Pending Requests
                    </h4>
                    <div className="space-y-4">
                      {pendingRequests.map((request) => (
                        <button
                          key={`pending-${request.id}`}
                          onClick={() => onSelectRequest(request)}
                          className={`w-full text-left rounded-xl border p-4 transition-all duration-200 ${selectedRecheckRequest?.id === request.id
                            ? 'border-orange-500 bg-orange-50 shadow-md'
                            : 'border-gray-200 bg-white hover:border-orange-300 hover:bg-orange-50'
                            }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-3 mb-2">
                                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                                  <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                  </svg>
                                </div>
                                <div>
                                  <h4 className="font-semibold text-gray-900">
                                    {request.participant_name}
                                  </h4>
                                  <p className="text-sm text-gray-600">
                                    Chess: {request.participant_chess_number}
                                  </p>
                                </div>
                              </div>

                              <div className="space-y-1 text-sm text-gray-600">
                                <div>
                                  <span className="font-medium">Event:</span> {request.event_name}
                                </div>
                                <div>
                                  <span className="font-medium">Category:</span> {request.event_category}
                                </div>
                                <div>
                                  <span className="font-medium">Final Score:</span> {request.final_score}
                                </div>
                                <div>
                                  <span className="font-medium">Requested:</span> {new Date(request.created_at).toLocaleDateString()}
                                </div>
                              </div>

                              {request.reason && (
                                <div className="mt-3 p-2 bg-gray-50 rounded-lg">
                                  <p className="text-sm text-gray-700">
                                    <span className="font-medium">Reason:</span> {request.reason}
                                  </p>
                                </div>
                              )}
                            </div>

                            <div className="ml-4 flex-shrink-0">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
                                Pending
                              </span>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Accepted Requests Section */}
                {acceptedRequests.length > 0 && (
                  <div>
                    <h4 className="text-lg font-bold text-blue-800 mb-3 flex items-center">
                      <span className="inline-block w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
                      Accepted Requests
                    </h4>
                    <div className="space-y-4">
                      {acceptedRequests.map((request) => (
                        <button
                          key={`accepted-${request.id}`}
                          onClick={() => onSelectRequest(request)}
                          className={`w-full text-left rounded-xl border p-4 transition-all duration-200 ${selectedRecheckRequest?.id === request.id
                            ? 'border-blue-500 bg-blue-50 shadow-md'
                            : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50'
                            }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-3 mb-2">
                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                  </svg>
                                </div>
                                <div>
                                  <h4 className="font-semibold text-gray-900">
                                    {request.participant_name}
                                  </h4>
                                  <p className="text-sm text-gray-600">
                                    Chess: {request.participant_chess_number}
                                  </p>
                                </div>
                              </div>

                              <div className="space-y-1 text-sm text-gray-600">
                                <div>
                                  <span className="font-medium">Event:</span> {request.event_name}
                                </div>
                                <div>
                                  <span className="font-medium">Category:</span> {request.event_category}
                                </div>
                                <div>
                                  <span className="font-medium">Final Score:</span> {request.final_score}
                                </div>
                                <div>
                                  <span className="font-medium">Requested:</span> {new Date(request.created_at).toLocaleDateString()}
                                </div>
                              </div>

                              {request.reason && (
                                <div className="mt-3 p-2 bg-gray-50 rounded-lg">
                                  <p className="text-sm text-gray-700">
                                    <span className="font-medium">Reason:</span> {request.reason}
                                  </p>
                                </div>
                              )}
                            </div>

                            <div className="ml-4 flex-shrink-0">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                                Accepted
                              </span>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Request Details */}
        {selectedRecheckRequest && (
          <div className="lg:col-span-7">
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden h-full flex flex-col">
              <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700">
                <h3 className="text-xl font-bold text-white">Request Details</h3>
                <p className="text-blue-100 mt-1">Review the request and accept if appropriate</p>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto p-6">
                <div className="space-y-6">
                  {/* Participant Information */}
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <h4 className="text-lg font-bold text-blue-900 mb-3">Participant Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <span className="text-sm font-medium text-blue-700">Name:</span>
                        <p className="text-sm font-semibold text-blue-900">
                          {selectedRecheckRequest.participant_name}
                        </p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-blue-700">Chess Number:</span>
                        <p className="text-sm font-semibold text-blue-900 font-mono">
                          {selectedRecheckRequest.participant_chess_number}
                        </p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-blue-700">School:</span>
                        <p className="text-sm font-semibold text-blue-900">
                          {selectedRecheckRequest.participant_school || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-blue-700">Class:</span>
                        <p className="text-sm font-semibold text-blue-900">
                          {selectedRecheckRequest.participant_class || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Event Information */}
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                    <h4 className="text-lg font-bold text-green-900 mb-3">Event Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <span className="text-sm font-medium text-green-700">Event:</span>
                        <p className="text-sm font-semibold text-green-900">
                          {selectedRecheckRequest.event_name}
                        </p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-green-700">Category:</span>
                        <p className="text-sm font-semibold text-green-900">
                          {selectedRecheckRequest.event_category}
                        </p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-green-700">Date:</span>
                        <p className="text-sm font-semibold text-green-900">
                          {selectedRecheckRequest.event_date}
                        </p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-green-700">Venue:</span>
                        <p className="text-sm font-semibold text-green-900">
                          {selectedRecheckRequest.event_venue || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Current Result */}
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                    <h4 className="text-lg font-bold text-gray-900 mb-3">Current Result</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <span className="text-sm font-medium text-gray-700">Position:</span>
                        <p className="text-sm font-semibold text-gray-900">
                          {selectedRecheckRequest.current_position || 'Not ranked'}
                        </p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-700">Total Score:</span>
                        <p className="text-sm font-semibold text-gray-900">
                          {selectedRecheckRequest.current_total_score || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Request Details */}
                  <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                    <h4 className="text-lg font-bold text-orange-900 mb-3">Request Details</h4>
                    <div className="space-y-3">
                      <div>
                        <span className="text-sm font-medium text-orange-700">Requested on:</span>
                        <p className="text-sm font-semibold text-orange-900">
                          {new Date(selectedRecheckRequest.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-orange-700">Status:</span>
                        <span className={`ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${selectedRecheckRequest.status === 'Pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : selectedRecheckRequest.status === 'Accepted'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                          }`}>
                          {selectedRecheckRequest.status}
                        </span>
                      </div>
                      {selectedRecheckRequest.reason && (
                        <div>
                          <span className="text-sm font-medium text-orange-700">Reason:</span>
                          <p className="text-sm text-orange-900 mt-1 p-3 bg-white rounded-lg border border-orange-200">
                            {selectedRecheckRequest.reason}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                <div className="flex justify-end space-x-4">
                  <button
                    onClick={() => onSelectRequest(null)}
                    className="px-6 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-200"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => onAcceptRequest(selectedRecheckRequest.id)}
                    disabled={isAcceptingRequest || (selectedRecheckRequest.status !== 'Pending' && selectedRecheckRequest.status !== 'pending')}
                    className="px-6 py-2 border border-transparent rounded-lg text-sm font-bold text-white bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    {isAcceptingRequest ? (
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Accepting...</span>
                      </div>
                    ) : (
                      'Accept Request'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VolunteerDashboard;
