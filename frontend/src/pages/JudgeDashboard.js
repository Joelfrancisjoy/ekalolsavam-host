import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import http from '../services/http-common';
import { eventServiceAdapter as eventService, userServiceAdapter as userService } from '../services/serviceAdapter';
import scoreService from '../services/scoreService';
import UserInfoHeader from '../components/UserInfoHeader';
import PerformancePrediction from '../components/PerformancePrediction';
import RecheckRequestsDropdown from '../components/RecheckRequestsDropdown';
// Simple inline SVG icons to avoid external icon dependency
const Trophy = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 21h8M12 17a6 6 0 0 0 6-6V5H6v6a6 6 0 0 0 6 6Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M18 7h2a2 2 0 0 1 0 4h-2M6 7H4a2 2 0 0 0 0 4h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const CheckCircle = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M22 4 12 14.01l-3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const AlertCircle = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
    <path d="M12 8v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="12" cy="16" r="1" fill="currentColor" />
  </svg>
);

const JudgeDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [assignedEvents, setAssignedEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [selectedParticipantId, setSelectedParticipantId] = useState(null);
  const [criteria, setCriteria] = useState([
    { id: 'technical_skill', label: 'Technical Skill', max: 25 },
    { id: 'artistic_expression', label: 'Artistic Expression', max: 25 },
    { id: 'stage_presence', label: 'Stage Presence', max: 25 },
    { id: 'overall_impression', label: 'Overall Impression', max: 25 },
  ]);
  const [loadingCriteria, setLoadingCriteria] = useState(false);
  const [scoresState, setScoresState] = useState({});
  const [notesState, setNotesState] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [summary, setSummary] = useState({ results: [] });
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [showPasswordChoice, setShowPasswordChoice] = useState(false);
  const [maskedPending, setMaskedPending] = useState('');
  const [creatingNew, setCreatingNew] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [pwdError, setPwdError] = useState('');
  const [showPrediction, setShowPrediction] = useState(false);

  // Debug useEffect to track state changes
  useEffect(() => {
    console.log('State changed - selectedEventId:', selectedEventId, 'selectedParticipantId:', selectedParticipantId);
  }, [selectedEventId, selectedParticipantId]);

  useEffect(() => {
    // Inspect last login response cached user if available
    try {
      const access = localStorage.getItem('access_token');
      if (!access) return;
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

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    navigate('/login');
  };

  const currentKey = useMemo(() => `${selectedEventId || ''}:${selectedParticipantId || ''}`, [selectedEventId, selectedParticipantId]);

  // Initialize scores state for current key when it changes
  useEffect(() => {
    if (currentKey && !scoresState[currentKey]) {
      // Initialize scores for all criteria to empty values
      const initialScores = {};
      criteria.forEach(c => {
        initialScores[c.id] = '';
      });

      setScoresState(prev => ({
        ...prev,
        [currentKey]: initialScores
      }));

      console.log('Initialized scores for key:', currentKey, initialScores);
    }
  }, [currentKey, criteria]);

  const normalizeDecimal = (val) => {
    if (val === null || val === undefined) return '';
    if (typeof val === 'number') return val;
    const s = String(val).replace(',', '.');
    const n = Number(s);
    return Number.isFinite(n) ? n : '';
  };

  const handleScoreChange = (criterionId, value) => {
    const parsed = normalizeDecimal(value);
    console.log('handleScoreChange called:', criterionId, 'value:', value, 'parsed:', parsed, 'currentKey:', currentKey);

    // Ensure scores state is initialized for current key
    if (!scoresState[currentKey]) {
      const initialScores = {};
      criteria.forEach(c => {
        initialScores[c.id] = '';
      });

      setScoresState(prev => ({
        ...prev,
        [currentKey]: initialScores
      }));
    }

    setScoresState(prev => ({
      ...prev,
      [currentKey]: { ...(prev[currentKey] || {}), [criterionId]: parsed }
    }));

    // Debug: log the updated scores state
    setTimeout(() => {
      console.log('Updated scoresState for key', currentKey, ':', scoresState[currentKey]);
    }, 0);
  };

  const computedTotal = useMemo(() => {
    const sc = scoresState[currentKey] || {};
    return criteria.reduce((sum, c) => {
      const raw = normalizeDecimal(sc[c.id] ?? 0);
      const bounded = Math.min(Number(raw || 0), c.max);
      return sum + bounded;
    }, 0);
  }, [scoresState, currentKey, criteria]);

  const handleSubmitScore = async () => {
    console.log('handleSubmitScore called');
    console.log('selectedEventId:', selectedEventId);
    console.log('selectedParticipantId:', selectedParticipantId);
    console.log('scoresState:', scoresState);
    console.log('currentKey:', currentKey);

    if (!selectedEventId || !selectedParticipantId) {
      alert('Please select both an event and a participant');
      return;
    }

    const sc = scoresState[currentKey] || {};

    // Validate that all criteria have been scored
    const missingScores = [];
    for (const c of criteria) {
      const scoreValue = sc[c.id];
      console.log(`Criterion ${c.label} score:`, scoreValue);
      if (scoreValue === undefined || scoreValue === null || scoreValue === '') {
        missingScores.push(c.label);
      }
    }

    if (missingScores.length > 0) {
      alert(`Please fill in scores for: ${missingScores.join(', ')}`);
      console.log('Missing scores:', missingScores);
      return;
    }

    const items = criteria.map(c => {
      // Parse and validate the score
      let scoreValue = sc[c.id];

      // Convert to number and handle various input types
      if (typeof scoreValue === 'string') {
        scoreValue = scoreValue.replace(',', '.');
        scoreValue = parseFloat(scoreValue);
      } else {
        scoreValue = Number(scoreValue);
      }

      // Validate the score is a valid number
      if (isNaN(scoreValue)) {
        scoreValue = 0;
      }

      // Ensure score is within valid range
      const finalScore = Math.min(Math.max(scoreValue, 0), c.max);

      console.log(`Submitting criterion ${c.label}: ${finalScore}`);

      return {
        criteria: c.label,
        score: finalScore,
        comments: (notesState[currentKey] || ''),
      };
    });

    try {
      setSubmitting(true);

      console.log('Submitting to API with data:', { eventId: selectedEventId, participantId: selectedParticipantId, items });

      const result = await scoreService.submitBundle({
        eventId: selectedEventId,
        participantId: selectedParticipantId,
        items
      });

      console.log('Score submission result:', result);

      alert('Score submitted successfully');

      // refresh summary after submit
      try {
        setLoadingSummary(true);
        const res = await scoreService.getSummary(selectedEventId);
        setSummary(res);
      } finally {
        setLoadingSummary(false);
      }
    } catch (e) {
      console.error('Error submitting score:', e);

      // Extract error message from response or provide default
      const errorMessage = e?.response?.data?.error || e?.response?.data?.message || e?.message || 'Failed to submit score';
      alert(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await http.get('/api/auth/current/');
        const userData = response.data;
        console.log('Current user data:', userData);

        // Check if user is a judge
        if (userData.role !== 'judge') {
          navigate('/dashboard');
          return;
        }


        setUser(userData);

        // Fetch assigned events via dedicated endpoint
        try {
          const myEvents = await eventService.listMyAssignedEvents();
          console.log('Assigned events:', myEvents);
          setAssignedEvents(myEvents);
          if (myEvents.length) {
            console.log('Setting first event as selected:', myEvents[0].id);
            setSelectedEventId(myEvents[0].id);
          } else {
            console.log('No assigned events found');
          }
        } catch (error) {
          console.error('Failed to fetch assigned events:', error);
        }
      } catch (error) {
        console.error('Authentication check failed:', error);
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [navigate]);

  useEffect(() => {
    const loadEventData = async () => {
      console.log('Loading event data for selectedEventId:', selectedEventId);
      if (!selectedEventId) return;

      try {
        // Load participants
        const regs = await eventService.listParticipantsForEvent(selectedEventId);
        console.log('Participants for event:', selectedEventId, regs);
        setParticipants(regs);
        if (regs.length) {
          console.log('Setting first participant as selected:', regs[0].participant);
          setSelectedParticipantId(regs[0].participant);
        } else {
          console.log('No participants found for event:', selectedEventId);
        }

        // Load event-specific criteria
        setLoadingCriteria(true);
        try {
          const criteriaData = await scoreService.getEventCriteria(selectedEventId);
          if (criteriaData.criteria && criteriaData.criteria.length > 0) {
            console.log('Setting event-specific criteria:', criteriaData.criteria);
            setCriteria(criteriaData.criteria);
          }
        } catch (criteriaError) {
          console.error('Failed to load criteria, using defaults', criteriaError);
          // Keep default criteria if loading fails
        } finally {
          setLoadingCriteria(false);
        }
      } catch (e) {
        console.error('Failed to load event data', e);
      }
    };
    loadEventData();
  }, [selectedEventId]);

  useEffect(() => {
    const loadSummary = async () => {
      if (!selectedEventId) return;
      try {
        setLoadingSummary(true);
        const res = await scoreService.getSummary(selectedEventId);
        setSummary(res);
      } catch (e) {
        // non-blocking
      } finally {
        setLoadingSummary(false);
      }
    };
    loadSummary();
  }, [selectedEventId]);

  const selectedSummary = useMemo(() => {
    if (!selectedParticipantId) return null;
    return summary.results.find(r => r.participant === selectedParticipantId) || null;
  }, [summary, selectedParticipantId]);

  const computeFinalFromJudges = (totals = []) => {
    if (!totals || totals.length < 3) return null;
    const sorted = [...totals].sort((a, b) => a - b);
    const trimmed = sorted.length >= 5 ? sorted.slice(1, -1) : sorted; // drop extremes when possible
    const avg = trimmed.reduce((a, b) => a + b, 0) / trimmed.length;
    return Math.round(avg * 100) / 100;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* User Info Header */}
      <UserInfoHeader
        user={user}
        title="Judge Dashboard"
        subtitle="Score participants and manage assigned events"
      />

      {/* Password Choice Modal */}
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-8 rounded-2xl shadow border border-gray-200">
              {/* Current Event Display */}
              <div className="mb-6 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border-2 border-indigo-200">
                <div className="text-sm font-semibold text-indigo-700 mb-1">Current Event</div>
                <div className="text-2xl font-bold text-indigo-900">
                  {assignedEvents.find(ev => ev.id === selectedEventId)?.name || 'No event selected'}
                </div>
                {selectedEventId && (
                  <div className="text-sm text-indigo-600 mt-1">
                    {assignedEvents.find(ev => ev.id === selectedEventId)?.date}
                  </div>
                )}
              </div>

              {/* Current Participant Display */}
              <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-teal-50 rounded-xl border-2 border-green-200">
                <div className="text-sm font-semibold text-green-700 mb-1">Current Participant</div>
                <div className="text-2xl font-bold text-green-900">
                  {participants.find(p => p.participant === selectedParticipantId)?.participant_details?.first_name || ''} {participants.find(p => p.participant === selectedParticipantId)?.participant_details?.last_name || 'No participant selected'}
                </div>
                {selectedParticipantId && (
                  <div className="text-sm text-green-600 mt-1">
                    Chess #{participants.find(p => p.participant === selectedParticipantId)?.chess_number}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {criteria.map(c => (
                  <div key={c.id} className="bg-gradient-to-r from-gray-50 to-white p-6 rounded-xl border-2 border-gray-200 hover:border-indigo-300 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-lg font-semibold text-gray-800">{c.label}</div>
                      <div className="text-base text-gray-600 font-medium">/ {c.max}</div>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max={c.max}
                      step="0.1"
                      value={(scoresState[currentKey]?.[c.id] ?? 0)}
                      onChange={(e) => handleScoreChange(c.id, e.target.value)}
                      className="w-full"
                    />
                    <div className="flex items-center justify-between mt-3">
                      <input
                        type="number"
                        min="0"
                        max={c.max}
                        step="0.1"
                        inputMode="decimal"
                        className="w-32 p-3 border-2 border-gray-300 rounded-lg font-mono text-lg font-semibold focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                        placeholder="0.0"
                        value={(scoresState[currentKey]?.[c.id] ?? '')}
                        onChange={(e) => handleScoreChange(c.id, e.target.value)}
                      />
                      <div className="flex gap-2">
                        {[0.25, 0.5, 0.75, 1].map(f => (
                          <button key={f} onClick={() => handleScoreChange(c.id, (c.max * f).toFixed(1))} className="px-3 py-2 bg-indigo-100 hover:bg-indigo-200 rounded-lg text-sm font-semibold text-indigo-700 transition-colors">
                            {(f * 100).toFixed(0)}%
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6">
                <label className="block text-base font-semibold text-gray-700 mb-2">Notes</label>
                <textarea
                  className="w-full p-4 border-2 border-gray-300 rounded-lg text-base focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  rows="4"
                  placeholder="Add your comments here..."
                  value={notesState[currentKey] || ''}
                  onChange={(e) => setNotesState(prev => ({ ...prev, [currentKey]: e.target.value }))}
                ></textarea>
              </div>

              <div className="mt-8 flex items-center justify-between p-6 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border-2 border-indigo-200">
                <div className="text-gray-700">
                  <div className="text-base font-semibold text-indigo-700">My Total Score</div>
                  <div className="text-4xl font-bold text-indigo-900">{computedTotal}</div>
                </div>
                <button
                  disabled={submitting || !selectedEventId || !selectedParticipantId}
                  onClick={handleSubmitScore}
                  className={`px-8 py-4 rounded-xl text-white text-lg font-semibold flex items-center gap-3 transition-all ${submitting ? 'bg-gray-400' : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl'}`}
                  onMouseEnter={() => {
                    console.log('Button state - submitting:', submitting, 'selectedEventId:', selectedEventId, 'selectedParticipantId:', selectedParticipantId);
                  }}
                >
                  <CheckCircle className="w-6 h-6" />
                  {submitting ? 'Submitting…' : !selectedEventId ? 'Select Event' : !selectedParticipantId ? 'Select Participant' : 'Submit Score'}
                </button>
                <button
                  onClick={() => setShowPrediction(!showPrediction)}
                  disabled={!selectedParticipantId || !selectedEventId}
                  className="px-8 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-lg font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  {showPrediction ? 'Hide AI Prediction' : !selectedEventId ? 'Select Event' : !selectedParticipantId ? 'Select Participant' : 'Show AI Prediction'}
                </button>
              </div>

              {/* Recheck Requests Section - Appears below Submit Score button */}
              <div className="mt-6">
                <RecheckRequestsDropdown
                  selectedEventId={selectedEventId}
                  onReanalyze={(request) => {
                    // Set the participant for reanalysis
                    setSelectedParticipantId(request.participant);
                  }}
                />
              </div>
            </div>

            {/* Performance Prediction */}
            {showPrediction && selectedParticipantId && selectedEventId && (
              <PerformancePrediction
                participantId={selectedParticipantId}
                eventId={selectedEventId}
                onClose={() => setShowPrediction(false)}
              />
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow border border-gray-200">
              <div className="flex items-center gap-3 mb-4">
                <Trophy className="w-6 h-6 text-indigo-600" />
                <div className="text-lg font-bold">Assigned Events</div>
              </div>
              {assignedEvents.length === 0 ? (
                <div className="text-gray-500 text-sm">No assigned events yet.</div>
              ) : (
                <ul className="space-y-3">
                  {assignedEvents.map(ev => (
                    <li key={ev.id} className={`p-4 rounded-lg border-2 transition-all ${selectedEventId === ev.id ? 'border-indigo-500 bg-indigo-50 shadow-md' : 'border-gray-200 hover:border-indigo-300'}`}>
                      <button className="w-full text-left" onClick={() => setSelectedEventId(ev.id)}>
                        <div className="text-base font-semibold">{ev.name}</div>
                        <div className="text-sm text-gray-600 mt-1">{ev.date}</div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {selectedEventId && (
              <div className="bg-white p-6 rounded-2xl shadow border border-gray-200">
                <div className="flex items-center gap-3 mb-4">
                  <AlertCircle className="w-6 h-6 text-indigo-600" />
                  <div className="text-lg font-bold">Verified Participants</div>
                </div>
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-700">
                    <span className="font-semibold">Note:</span> Only participants verified by volunteers will appear here.
                  </p>
                </div>
                {participants.length === 0 ? (
                  <div className="text-base text-gray-500">No verified participants yet. Participants will appear here after volunteer verification.</div>
                ) : (
                  <ul className="space-y-3">
                    {participants.map(reg => (
                      <li key={reg.id} className={`p-4 rounded-lg border-2 transition-all ${selectedParticipantId === reg.participant ? 'border-green-500 bg-green-50 shadow-md' : 'border-gray-200 hover:border-green-300'}`}>
                        <button className="w-full text-left" onClick={() => setSelectedParticipantId(reg.participant)}>
                          <div className="flex items-center gap-2">
                            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div className="text-base font-semibold">{reg.participant_details?.first_name} {reg.participant_details?.last_name}</div>
                          </div>
                          <div className="text-sm text-gray-600 mt-1">Chess #{reg.chess_number}</div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {selectedEventId && (
              <div className="bg-gradient-to-br from-indigo-600 to-purple-600 p-6 rounded-2xl text-white shadow">
                <div className="font-semibold mb-2">Live Judges Panel</div>
                <div className="text-indigo-100 text-sm mb-4">Shows submitted scores count and current final after dropping extremes.</div>
                <div className="bg-white/10 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm">Judges submitted</div>
                    <div className="font-bold">{loadingSummary ? '…' : (selectedSummary?.judges_submitted || 0)} / 5</div>
                  </div>
                  <div className="w-full bg-white/20 h-2 rounded">
                    <div className="h-2 rounded bg-white" style={{ width: `${Math.min(100, ((selectedSummary?.judges_submitted || 0) / 5) * 100)}%` }} />
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="bg-white/10 rounded-lg p-4">
                    <div className="text-sm text-indigo-100">My Submitted Total</div>
                    <div className="text-2xl font-bold">{selectedSummary?.my_scores_total ?? '—'}</div>
                  </div>
                  <div className="bg-white/10 rounded-lg p-4">
                    <div className="text-sm text-indigo-100">Current Final (drop extremes)</div>
                    <div className="text-2xl font-bold">
                      {computeFinalFromJudges(selectedSummary?.judges_totals || []) ?? '—'}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Results Section */}
      {selectedEventId && summary.results && summary.results.length > 0 && (
        <div className="mt-8">
          <div className="bg-white p-8 rounded-2xl shadow border border-gray-200">
            <div className="flex items-center gap-4 mb-6">
              <Trophy className="w-8 h-8 text-indigo-600" />
              <h2 className="text-3xl font-bold">Results</h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-300">
                    <th className="text-left py-4 px-5 text-base font-bold text-gray-800">Participant</th>
                    <th className="text-center py-4 px-5 text-base font-bold text-gray-800">Judges Submitted</th>
                    <th className="text-center py-4 px-5 text-base font-bold text-gray-800">My Score</th>
                    <th className="text-center py-4 px-5 text-base font-bold text-gray-800">Final Score</th>
                    <th className="text-center py-4 px-5 text-base font-bold text-gray-800">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.results.map((result) => {
                    const participant = participants.find(p => p.participant === result.participant);
                    const isComplete = result.judges_submitted >= 5;
                    const finalScore = computeFinalFromJudges(result.judges_totals);

                    return (
                      <tr key={result.participant} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                        <td className="py-5 px-5">
                          <div className="text-base font-semibold text-gray-900">
                            {participant?.participant_details?.first_name} {participant?.participant_details?.last_name}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            Chess #{participant?.chess_number}
                          </div>
                        </td>
                        <td className="text-center py-5 px-5">
                          <span className={`inline-flex items-center px-4 py-2 rounded-full text-base font-bold ${isComplete ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                            }`}>
                            {result.judges_submitted} / 5
                          </span>
                        </td>
                        <td className="text-center py-5 px-5 text-lg font-bold text-gray-900">
                          {result.my_scores_total !== null && result.my_scores_total !== undefined
                            ? result.my_scores_total.toFixed(1)
                            : '—'}
                        </td>
                        <td className="text-center py-5 px-5">
                          {finalScore !== null ? (
                            <span className="text-2xl font-bold text-indigo-600">
                              {finalScore}
                            </span>
                          ) : (
                            <span className="text-base text-gray-400 font-medium">Pending</span>
                          )}
                        </td>
                        <td className="text-center py-5 px-5">
                          {isComplete ? (
                            <CheckCircle className="w-6 h-6 text-green-600 mx-auto" />
                          ) : (
                            <AlertCircle className="w-6 h-6 text-yellow-600 mx-auto" />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
              <p className="text-base text-blue-700">
                <span className="font-bold">Note:</span> Final scores are calculated by dropping the highest and lowest scores from 5 judges, then averaging the remaining 3 scores.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const DashboardSection = ({ title, children }) => {
  return (
    <div>
      <h3 className="text-xl font-semibold mb-4">{title}</h3>
      {children}
    </div>
  );
};

const EventCard = ({ name, date, time, venue }) => {
  return (
    <div className="bg-white p-4 rounded shadow flex justify-between items-center">
      <div>
        <h4 className="font-semibold">{name}</h4>
        <p className="text-gray-600">{date} at {time} - {venue}</p>
      </div>
      <button className="bg-blue-500 text-white px-4 py-2 rounded">
        View Details
      </button>
    </div>
  );
};

const ScoreInput = ({ label, value, onChange }) => {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type="number"
        min="0"
        max="10"
        step="0.1"
        className="w-full p-2 border rounded"
        placeholder="0-10"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
};

export default JudgeDashboard;
