import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { userServiceAdapter as userService, eventServiceAdapter as eventService } from '../services/serviceAdapter';
import volunteerService from '../services/volunteerService';
import http from '../services/http-common';
import UserInfoHeader from '../components/UserInfoHeader';

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
  const navigate = useNavigate();

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
  }, []);

  useEffect(() => {
    loadVolunteerData();
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
      const [assignmentsRes, verificationsRes] = await Promise.all([
        volunteerService.getAssignments(),
        volunteerService.getVerifications()
      ]);
      setAssignments(assignmentsRes.data);
      setVerifications(verificationsRes.data);

      // Build a set of verified participant IDs for quick lookup
      const verifiedIds = new Set(
        verificationsRes.data
          .filter(v => v.status === 'verified')
          .map(v => v.participant)
      );
      setVerifiedParticipantIds(verifiedIds);
    } catch (error) {
      console.error('Error loading volunteer data:', error);
      setError('Failed to load volunteer data');
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* User Info Header */}
      <UserInfoHeader
        user={currentUser}
        title="Volunteer Dashboard"
        subtitle="Manage shifts and verify participants"
      />

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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main Content Area */}
          <div className="flex-1">
            {/* Navigation Tabs */}
            <div className="mb-8">
              <nav className="grid grid-cols-3 gap-1 bg-white rounded-lg p-1 shadow-sm">
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
              </nav>
            </div>

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

            {activeTab === 'history' && (
              <HistoryTab verifications={verifications} />
            )}
          </div>

          {/* Right Sidebar with Big Icons */}
          <div className="w-full lg:w-80 space-y-6">
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
                  <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              </div>
            </div>
          </div>
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
                {assignments.map((assignment) => (
                  <option key={assignment.id} value={assignment.id}>
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

export default VolunteerDashboard;
