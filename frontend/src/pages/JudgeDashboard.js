import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import http from '../services/http-common';
import { eventServiceAdapter as eventService, userServiceAdapter as userService } from '../services/serviceAdapter';
import scoreService from '../services/scoreService';
import UserInfoHeader from '../components/UserInfoHeader';
import PerformancePrediction from '../components/PerformancePrediction';
import RecheckRequestsDropdown from '../components/RecheckRequestsDropdown';

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

const Sparkles = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 3l1.9 3.85L18 8.5l-4.1 1.65L12 14l-1.9-3.85L6 8.5l4.1-1.65L12 3Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M5 14l.95 1.9L8 16.85 5.95 17.8 5 19.7l-.95-1.9L2 16.85l2.05-.95L5 14Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M19 14l.95 1.9L22 16.85l-2.05.95L19 19.7l-.95-1.9L16 16.85l2.05-.95L19 14Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const UsersIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ChartBars = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 20V10M10 20V4M16 20v-7M22 20V8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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

  useEffect(() => {
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
    } catch (_) {
      // no-op
    }
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

  const currentKey = useMemo(
    () => `${selectedEventId || ''}:${selectedParticipantId || ''}`,
    [selectedEventId, selectedParticipantId],
  );

  useEffect(() => {
    if (!currentKey || scoresState[currentKey]) return;
    const initialScores = criteria.reduce((acc, criterion) => {
      acc[criterion.id] = '';
      return acc;
    }, {});
    setScoresState((prev) => ({
      ...prev,
      [currentKey]: initialScores,
    }));
  }, [currentKey, criteria, scoresState]);

  const normalizeDecimal = (val) => {
    if (val === null || val === undefined) return '';
    if (typeof val === 'number') return val;
    const s = String(val).replace(',', '.');
    const n = Number(s);
    return Number.isFinite(n) ? n : '';
  };

  const handleScoreChange = (criterionId, value) => {
    if (!currentKey) return;
    const parsed = normalizeDecimal(value);
    setScoresState((prev) => {
      const existingScores = prev[currentKey] || criteria.reduce((acc, criterion) => {
        acc[criterion.id] = '';
        return acc;
      }, {});
      return {
        ...prev,
        [currentKey]: {
          ...existingScores,
          [criterionId]: parsed,
        },
      };
    });
  };

  const computedTotal = useMemo(() => {
    const sc = scoresState[currentKey] || {};
    return criteria.reduce((sum, criterion) => {
      const raw = normalizeDecimal(sc[criterion.id] ?? 0);
      const bounded = Math.min(Number(raw || 0), criterion.max);
      return sum + bounded;
    }, 0);
  }, [scoresState, currentKey, criteria]);

  const handleSubmitScore = async () => {
    if (!selectedEventId || !selectedParticipantId) {
      alert('Please select both an event and a participant');
      return;
    }

    const sc = scoresState[currentKey] || {};
    const missingScores = [];
    for (const criterion of criteria) {
      const scoreValue = sc[criterion.id];
      if (scoreValue === undefined || scoreValue === null || scoreValue === '') {
        missingScores.push(criterion.label);
      }
    }

    if (missingScores.length > 0) {
      alert(`Please fill in scores for: ${missingScores.join(', ')}`);
      return;
    }

    const items = criteria.map((criterion) => {
      let scoreValue = sc[criterion.id];
      if (typeof scoreValue === 'string') {
        scoreValue = scoreValue.replace(',', '.');
        scoreValue = parseFloat(scoreValue);
      } else {
        scoreValue = Number(scoreValue);
      }

      if (Number.isNaN(scoreValue)) {
        scoreValue = 0;
      }

      const finalScore = Math.min(Math.max(scoreValue, 0), criterion.max);
      return {
        criteria: criterion.label,
        score: finalScore,
        comments: notesState[currentKey] || '',
      };
    });

    try {
      setSubmitting(true);
      await scoreService.submitBundle({
        eventId: selectedEventId,
        participantId: selectedParticipantId,
        items,
      });
      alert('Score submitted successfully');
      try {
        setLoadingSummary(true);
        const res = await scoreService.getSummary(selectedEventId);
        setSummary(res);
      } finally {
        setLoadingSummary(false);
      }
    } catch (e) {
      const errorMessage = e?.response?.data?.error
        || e?.response?.data?.message
        || e?.message
        || 'Failed to submit score';
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
        if (userData.role !== 'judge') {
          navigate('/dashboard');
          return;
        }
        setUser(userData);
        try {
          const myEvents = await eventService.listMyAssignedEvents();
          setAssignedEvents(myEvents);
          if (myEvents.length) {
            setSelectedEventId(myEvents[0].id);
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
      if (!selectedEventId) {
        setParticipants([]);
        setSelectedParticipantId(null);
        return;
      }

      try {
        const regs = await eventService.listParticipantsForEvent(selectedEventId);
        setParticipants(regs);
        if (regs.length) {
          setSelectedParticipantId(regs[0].participant);
        } else {
          setSelectedParticipantId(null);
        }

        setLoadingCriteria(true);
        try {
          const criteriaData = await scoreService.getEventCriteria(selectedEventId);
          if (criteriaData.criteria && criteriaData.criteria.length > 0) {
            setCriteria(criteriaData.criteria);
          }
        } catch (criteriaError) {
          console.error('Failed to load criteria, using defaults', criteriaError);
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
    return summary.results.find((result) => result.participant === selectedParticipantId) || null;
  }, [summary, selectedParticipantId]);

  const selectedEvent = useMemo(
    () => assignedEvents.find((event) => event.id === selectedEventId) || null,
    [assignedEvents, selectedEventId],
  );

  const selectedParticipant = useMemo(
    () => participants.find((participant) => participant.participant === selectedParticipantId) || null,
    [participants, selectedParticipantId],
  );

  const judgesSubmittedCount = selectedSummary?.judges_submitted || 0;
  const reviewedByMeCount = useMemo(
    () => (summary.results || []).filter((result) => result.my_scores_total !== null && result.my_scores_total !== undefined).length,
    [summary],
  );
  const completedFinalsCount = useMemo(
    () => (summary.results || []).filter((result) => result.judges_submitted >= 5).length,
    [summary],
  );

  const computeFinalFromJudges = (totals = []) => {
    if (!totals || totals.length < 3) return null;
    const sorted = [...totals].sort((a, b) => a - b);
    const trimmed = sorted.length >= 5 ? sorted.slice(1, -1) : sorted;
    const avg = trimmed.reduce((a, b) => a + b, 0) / trimmed.length;
    return Math.round(avg * 100) / 100;
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-indigo-50 to-purple-100">
        <div className="rounded-2xl border border-white/70 bg-white/70 px-6 py-4 text-base font-medium text-slate-700 shadow-lg backdrop-blur">
          Loading dashboard...
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-indigo-50 to-purple-100">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-indigo-300/30 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-purple-300/30 blur-3xl" />
      </div>

      <UserInfoHeader
        user={user}
        title="Judge Dashboard"
        subtitle="Score participants and manage assigned events"
      />

      {showPasswordChoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            {!creatingNew ? (
              <div>
                <h3 className="text-xl font-semibold text-slate-900">
                  Continue with your provided password?
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  Password hint:
                  {' '}
                  <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-slate-700">
                    {maskedPending}
                  </span>
                </p>
                {pwdError ? <div className="mt-3 text-sm font-medium text-rose-600">{pwdError}</div> : null}
                <div className="mt-5 flex flex-wrap justify-end gap-3">
                  <button
                    onClick={() => setCreatingNew(true)}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    Create new password
                  </button>
                  <button
                    onClick={acceptProvidedPassword}
                    className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                  >
                    Continue
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <h3 className="text-xl font-semibold text-slate-900">Create new password</h3>
                <p className="mt-2 text-sm text-slate-600">
                  Choose a strong password (minimum 8 characters).
                </p>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="mt-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  placeholder="Enter new password"
                />
                {pwdError ? <div className="mt-3 text-sm font-medium text-rose-600">{pwdError}</div> : null}
                <div className="mt-5 flex flex-wrap justify-end gap-3">
                  <button
                    onClick={() => {
                      setCreatingNew(false);
                      setPwdError('');
                    }}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    Back
                  </button>
                  <button
                    onClick={submitNewPassword}
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
                  >
                    Save password
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <section className="rounded-3xl border border-white/70 bg-white/75 p-5 shadow-xl backdrop-blur sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-700">
                <Sparkles className="h-3.5 w-3.5" />
                Judge Workspace
              </div>
              <h2 className="mt-3 text-2xl font-bold text-slate-900 sm:text-3xl">
                {selectedEvent?.name || 'Start by selecting an assigned event'}
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                {selectedEvent?.date || 'Select an event and participant to begin scoring with real-time progress visibility.'}
              </p>
            </div>
            <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-purple-50 px-4 py-3 text-right">
              <div className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Current Participant</div>
              <div className="mt-1 text-lg font-semibold text-slate-900">
                {selectedParticipant
                  ? `${selectedParticipant?.participant_details?.first_name || ''} ${selectedParticipant?.participant_details?.last_name || ''}`.trim()
                  : 'No participant selected'}
              </div>
              <div className="text-xs text-slate-500">
                {selectedParticipant?.chess_number
                  ? `Chess #${selectedParticipant.chess_number}`
                  : 'Choose a verified participant'}
              </div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-indigo-100/60 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Assigned Events</span>
                <Trophy className="h-4 w-4 text-indigo-500" />
              </div>
              <div className="mt-2 text-2xl font-bold text-slate-900">{assignedEvents.length}</div>
            </div>

            <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-emerald-100/60 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Verified Participants</span>
                <UsersIcon className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="mt-2 text-2xl font-bold text-slate-900">{participants.length}</div>
            </div>

            <div className="rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 to-orange-100/60 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-amber-700">Reviewed By Me</span>
                <CheckCircle className="h-4 w-4 text-amber-600" />
              </div>
              <div className="mt-2 text-2xl font-bold text-slate-900">{reviewedByMeCount}</div>
            </div>

            <div className="rounded-2xl border border-purple-100 bg-gradient-to-br from-purple-50 to-purple-100/60 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-purple-700">Finalized Results</span>
                <ChartBars className="h-4 w-4 text-purple-500" />
              </div>
              <div className="mt-2 text-2xl font-bold text-slate-900">{completedFinalsCount}</div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <section className="space-y-6 xl:col-span-8">
            <div className="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-xl backdrop-blur sm:p-8">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-xl font-bold text-slate-900">Scoring Criteria</h3>
                {loadingCriteria ? (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Loading criteria...
                  </span>
                ) : null}
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {criteria.map((criterion) => {
                  const rawCurrent = scoresState[currentKey]?.[criterion.id];
                  const normalized = Number(normalizeDecimal(rawCurrent || 0) || 0);
                  const bounded = Math.min(Math.max(normalized, 0), criterion.max);
                  const percent = criterion.max ? Math.round((bounded / criterion.max) * 100) : 0;
                  const hasValue = rawCurrent !== '' && rawCurrent !== null && rawCurrent !== undefined;

                  return (
                    <div
                      key={criterion.id}
                      className={`rounded-2xl border p-4 transition duration-200 ${
                        hasValue
                          ? 'border-indigo-300 bg-indigo-50/70 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-indigo-200 hover:shadow-sm'
                      }`}
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <div className="text-base font-semibold text-slate-900">{criterion.label}</div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          {bounded.toFixed(1)}
                          {' '}
                          /
                          {' '}
                          {criterion.max}
                        </div>
                      </div>

                      <div className="mb-3 h-1.5 w-full rounded bg-slate-200">
                        <div
                          className="h-1.5 rounded bg-gradient-to-r from-indigo-500 to-purple-500"
                          style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
                        />
                      </div>

                      <input
                        type="range"
                        min="0"
                        max={criterion.max}
                        step="0.1"
                        value={scoresState[currentKey]?.[criterion.id] ?? 0}
                        onChange={(e) => handleScoreChange(criterion.id, e.target.value)}
                        className="w-full accent-indigo-600"
                      />

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          max={criterion.max}
                          step="0.1"
                          inputMode="decimal"
                          className="w-28 rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-base font-semibold text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                          placeholder="0.0"
                          value={scoresState[currentKey]?.[criterion.id] ?? ''}
                          onChange={(e) => handleScoreChange(criterion.id, e.target.value)}
                        />
                        {[0.25, 0.5, 0.75, 1].map((factor) => (
                          <button
                            key={factor}
                            onClick={() => handleScoreChange(criterion.id, (criterion.max * factor).toFixed(1))}
                            className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100"
                          >
                            {(factor * 100).toFixed(0)}
                            %
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6">
                <label className="mb-2 block text-sm font-semibold text-slate-700">Notes</label>
                <textarea
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  rows="4"
                  placeholder="Add your comments here..."
                  value={notesState[currentKey] || ''}
                  onChange={(e) => setNotesState((prev) => ({ ...prev, [currentKey]: e.target.value }))}
                />
              </div>

              <div className="mt-6 rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-purple-50 p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-indigo-600">My Total Score</div>
                    <div className="mt-1 text-4xl font-bold text-slate-900">{computedTotal}</div>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                      disabled={submitting || !selectedEventId || !selectedParticipantId}
                      onClick={handleSubmitScore}
                      className={`inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white transition ${
                        submitting || !selectedEventId || !selectedParticipantId
                          ? 'cursor-not-allowed bg-slate-400'
                          : 'bg-gradient-to-r from-indigo-600 to-purple-600 shadow-md hover:from-indigo-700 hover:to-purple-700'
                      }`}
                    >
                      <CheckCircle className="h-5 w-5" />
                      {submitting
                        ? 'Submitting...'
                        : !selectedEventId
                          ? 'Select Event'
                          : !selectedParticipantId
                            ? 'Select Participant'
                            : 'Submit Score'}
                    </button>

                    <button
                      onClick={() => setShowPrediction(!showPrediction)}
                      disabled={!selectedParticipantId || !selectedEventId}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                    >
                      <Sparkles className="h-4 w-4" />
                      {showPrediction
                        ? 'Hide AI Prediction'
                        : !selectedEventId
                          ? 'Select Event'
                          : !selectedParticipantId
                            ? 'Select Participant'
                            : 'Show AI Prediction'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-6 border-t border-slate-200 pt-6">
                <RecheckRequestsDropdown
                  selectedEventId={selectedEventId}
                  onReanalyze={(request) => {
                    setSelectedParticipantId(request.participant);
                  }}
                />
              </div>
            </div>

            {showPrediction && selectedParticipantId && selectedEventId && (
              <PerformancePrediction
                participantId={selectedParticipantId}
                eventId={selectedEventId}
                onClose={() => setShowPrediction(false)}
              />
            )}
          </section>

          <aside className="space-y-6 xl:col-span-4 xl:sticky xl:top-24 xl:self-start">
            <div className="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-xl backdrop-blur">
              <div className="mb-4 flex items-center gap-3">
                <Trophy className="h-5 w-5 text-indigo-600" />
                <div className="text-lg font-bold text-slate-900">Assigned Events</div>
              </div>
              {assignedEvents.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                  No assigned events yet.
                </div>
              ) : (
                <ul className="space-y-3">
                  {assignedEvents.map((event) => (
                    <li key={event.id}>
                      <button
                        className={`relative w-full overflow-hidden rounded-xl border px-4 py-3 text-left transition ${
                          selectedEventId === event.id
                            ? 'border-indigo-300 bg-gradient-to-r from-indigo-50 to-purple-50 shadow-sm'
                            : 'border-slate-200 bg-white hover:border-indigo-200'
                        }`}
                        onClick={() => setSelectedEventId(event.id)}
                      >
                        {selectedEventId === event.id ? (
                          <span className="absolute inset-y-0 left-0 w-1 bg-indigo-500" />
                        ) : null}
                        <div className="pl-1 text-sm font-semibold text-slate-900">{event.name}</div>
                        <div className="mt-1 pl-1 text-xs text-slate-500">{event.date || 'Date not available'}</div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-xl backdrop-blur">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <UsersIcon className="h-5 w-5 text-emerald-600" />
                  <div className="text-lg font-bold text-slate-900">Verified Participants</div>
                </div>
                {selectedEventId ? (
                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                    {participants.length}
                    {' '}
                    total
                  </span>
                ) : null}
              </div>
              <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700">
                Only participants verified by volunteers appear in this list.
              </div>

              {!selectedEventId ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                  Select an event to view verified participants.
                </div>
              ) : participants.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                  No verified participants yet. They will appear here once verification is complete.
                </div>
              ) : (
                <>
                  <div className="mb-4 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                      <div className="font-semibold uppercase tracking-wide text-slate-500">Visible</div>
                      <div className="mt-0.5 text-sm font-bold text-slate-900">
                        {participants.length}
                        {' '}
                        participants
                      </div>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                      <div className="font-semibold uppercase tracking-wide text-slate-500">Selected</div>
                      <div className="mt-0.5 truncate text-sm font-bold text-slate-900">
                        {selectedParticipant
                          ? `${selectedParticipant?.participant_details?.first_name || ''} ${selectedParticipant?.participant_details?.last_name || ''}`.trim()
                          : 'None'}
                      </div>
                    </div>
                  </div>

                  <div className="max-h-[26rem] overflow-y-auto pr-1">
                    <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                      {participants.map((registration) => {
                        const isSelected = selectedParticipantId === registration.participant;
                        const fullName = `${registration.participant_details?.first_name || ''} ${registration.participant_details?.last_name || ''}`.trim() || 'Participant';
                        const initials = fullName
                          .split(' ')
                          .filter(Boolean)
                          .slice(0, 2)
                          .map((part) => part[0]?.toUpperCase())
                          .join('');

                        return (
                          <li key={registration.id}>
                            <button
                              className={`group relative w-full overflow-hidden rounded-2xl border px-4 py-3 text-left transition ${
                                isSelected
                                  ? 'border-emerald-300 bg-gradient-to-br from-emerald-50 to-teal-50 shadow-sm ring-1 ring-emerald-100'
                                  : 'border-slate-200 bg-white hover:border-emerald-200 hover:shadow-sm'
                              }`}
                              onClick={() => setSelectedParticipantId(registration.participant)}
                            >
                              {isSelected ? (
                                <span className="absolute inset-y-0 left-0 w-1 bg-emerald-500" />
                              ) : null}

                              <div className="flex items-start gap-3 pl-1">
                                <div
                                  className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                                    isSelected
                                      ? 'bg-emerald-200 text-emerald-800'
                                      : 'bg-slate-100 text-slate-600 group-hover:bg-emerald-100 group-hover:text-emerald-700'
                                  }`}
                                >
                                  {initials || 'P'}
                                </div>

                                <div className="min-w-0 flex-1">
                                  <div className="truncate text-sm font-semibold text-slate-900">{fullName}</div>
                                  <div className="mt-1 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                                    Chess #
                                    {registration.chess_number ?? '—'}
                                  </div>
                                </div>

                                {isSelected ? <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> : null}
                              </div>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </>
              )}
            </div>

            {selectedEventId && (
              <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 p-6 text-slate-100 shadow-xl">
                <div className="flex items-center gap-2 text-base font-semibold">
                  <ChartBars className="h-5 w-5 text-indigo-300" />
                  Live Judges Panel
                </div>
                <div className="mt-1 text-sm text-slate-300">
                  Submission status and live final score for the selected participant.
                </div>

                <div className="mt-4 rounded-xl bg-white/10 p-4">
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <div>Judges submitted</div>
                    <div className="font-semibold">
                      {loadingSummary ? '...' : judgesSubmittedCount}
                      {' '}
                      / 5
                    </div>
                  </div>
                  <div className="h-2 w-full rounded bg-white/20">
                    <div
                      className="h-2 rounded bg-gradient-to-r from-emerald-300 to-cyan-300"
                      style={{ width: `${Math.min(100, (judgesSubmittedCount / 5) * 100)}%` }}
                    />
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-white/10 p-4">
                    <div className="text-xs uppercase tracking-wide text-slate-300">My Submitted Total</div>
                    <div className="mt-1 text-xl font-semibold">{selectedSummary?.my_scores_total ?? '—'}</div>
                  </div>
                  <div className="rounded-xl bg-white/10 p-4">
                    <div className="text-xs uppercase tracking-wide text-slate-300">Current Final</div>
                    <div className="mt-1 text-xl font-semibold">
                      {computeFinalFromJudges(selectedSummary?.judges_totals || []) ?? '—'}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </aside>
        </div>

        {selectedEventId && summary.results && summary.results.length > 0 && (
          <section className="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-xl backdrop-blur sm:p-8">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Trophy className="h-6 w-6 text-indigo-600" />
                <h2 className="text-2xl font-bold text-slate-900">Results</h2>
              </div>
              <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-700">
                {summary.results.length}
                {' '}
                Participants
              </span>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Participant</th>
                    <th className="px-4 py-3 text-center font-semibold text-slate-700">Judges Submitted</th>
                    <th className="px-4 py-3 text-center font-semibold text-slate-700">My Score</th>
                    <th className="px-4 py-3 text-center font-semibold text-slate-700">Final Score</th>
                    <th className="px-4 py-3 text-center font-semibold text-slate-700">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {summary.results.map((result) => {
                    const participant = participants.find((p) => p.participant === result.participant);
                    const isComplete = result.judges_submitted >= 5;
                    const finalScore = computeFinalFromJudges(result.judges_totals);

                    return (
                      <tr key={result.participant} className="hover:bg-slate-50">
                        <td className="px-4 py-4">
                          <div className="font-semibold text-slate-900">
                            {participant?.participant_details?.first_name}
                            {' '}
                            {participant?.participant_details?.last_name}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            Chess #
                            {participant?.chess_number || '—'}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                              isComplete ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {result.judges_submitted}
                            {' '}
                            / 5
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center font-semibold text-slate-900">
                          {result.my_scores_total !== null && result.my_scores_total !== undefined
                            ? result.my_scores_total.toFixed(1)
                            : '—'}
                        </td>
                        <td className="px-4 py-4 text-center">
                          {finalScore !== null ? (
                            <span className="text-lg font-bold text-indigo-600">{finalScore.toFixed(2)}</span>
                          ) : (
                            <span className="text-sm font-medium text-slate-400">Pending</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-center">
                          {isComplete ? (
                            <CheckCircle className="mx-auto h-5 w-5 text-emerald-600" />
                          ) : (
                            <AlertCircle className="mx-auto h-5 w-5 text-amber-500" />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-4 rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-sm text-indigo-700">
              Final scores are calculated by dropping the highest and lowest scores from 5 judges, then averaging the
              remaining 3 scores.
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default JudgeDashboard;
