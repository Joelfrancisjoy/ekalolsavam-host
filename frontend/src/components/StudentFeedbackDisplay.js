import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import scoreService from '../services/scoreService';
import resultService from '../services/resultService';
import http from '../services/http-common';

const StudentFeedbackDisplay = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [scores, setScores] = useState([]);
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');
  const [selectedScore, setSelectedScore] = useState(null);
  const [selectedResult, setSelectedResult] = useState(null);
  const [recheckLoading, setRecheckLoading] = useState({});
  const [recheckSuccess, setRecheckSuccess] = useState({});
  const [recheckError, setRecheckError] = useState({});
  const [recheckReason, setRecheckReason] = useState({});
  const [activeTab, setActiveTab] = useState('results'); // 'results' or 'scores'

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (activeTab !== 'results') return;

    const intervalId = setInterval(async () => {
      try {
        const updatedResults = await resultService.list({});
        setResults(updatedResults || []);
      } catch (_) {
        // non-blocking
      }
    }, 10000);

    return () => clearInterval(intervalId);
  }, [activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      // Load both judge scores and final results
      const [scoresData, resultsData] = await Promise.all([
        scoreService.getStudentScores(),
        resultService.list({}) // This will get all published results, filtered by student on backend
      ]);

      setScores(scoresData.scores || []);
      setResults(resultsData || []);
    } catch (err) {
      console.error('Failed to load data:', err);
      setError('Failed to load your scores and feedback');
    } finally {
      setLoading(false);
    }
  };

  const handleRecheckRequest = async (resultId) => {
    try {
      setRecheckLoading(prev => ({ ...prev, [resultId]: true }));
      setRecheckError(prev => ({ ...prev, [resultId]: '' }));

      const reason = recheckReason[resultId] || '';
      await resultService.submitRecheckRequest(resultId, reason);

      setRecheckSuccess(prev => ({ ...prev, [resultId]: true }));

      // Refresh results to update isRecheckAllowed flag
      const updatedResults = await resultService.list({});
      setResults(updatedResults || []);

      // Clear reason and auto-hide success message after 3 seconds
      setTimeout(() => {
        setRecheckSuccess(prev => ({ ...prev, [resultId]: false }));
      }, 3000);

      setRecheckReason(prev => {
        const next = { ...prev };
        delete next[resultId];
        return next;
      });
    } catch (err) {
      console.error('Failed to submit recheck request:', err);
      const errorMessage = err.response?.data?.error || 'Failed to submit re-check request. Please try again.';
      setRecheckError(prev => ({ ...prev, [resultId]: errorMessage }));
    } finally {
      setRecheckLoading(prev => ({ ...prev, [resultId]: false }));
    }
  };



  const getCriteriaDisplay = (score) => {
    const criteria = [];
    if (score.scores.technical_skill !== null) {
      criteria.push({ label: 'Technical Skill', value: score.scores.technical_skill, max: 25 });
    }
    if (score.scores.artistic_expression !== null) {
      criteria.push({ label: 'Artistic Expression', value: score.scores.artistic_expression, max: 25 });
    }
    if (score.scores.stage_presence !== null) {
      criteria.push({ label: 'Stage Presence', value: score.scores.stage_presence, max: 25 });
    }
    if (score.scores.overall_impression !== null) {
      criteria.push({ label: 'Overall Impression', value: score.scores.overall_impression, max: 25 });
    }

    // Add dynamic criteria if present
    if (score.criteria_scores && Object.keys(score.criteria_scores).length > 0) {
      Object.entries(score.criteria_scores).forEach(([key, value]) => {
        criteria.push({ label: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), value, max: 25 });
      });
    }

    return criteria;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 text-center">
        <svg className="w-12 h-12 text-red-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-red-800 font-semibold">{error}</p>
        <button
          onClick={loadData}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex bg-amber-100 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('results')}
            className={`px-4 py-2 rounded-md font-semibold text-sm transition-all ${activeTab === 'results'
                ? 'bg-amber-600 text-white shadow-md'
                : 'text-amber-700 hover:text-amber-800'
              }`}
          >
            My Results ({results.length})
          </button>
          <button
            onClick={() => setActiveTab('scores')}
            className={`px-4 py-2 rounded-md font-semibold text-sm transition-all ${activeTab === 'scores'
                ? 'bg-amber-600 text-white shadow-md'
                : 'text-amber-700 hover:text-amber-800'
              }`}
          >
            Judge Scores ({scores.length})
          </button>
        </div>
      </div>

      {/* Results Tab */}
      {activeTab === 'results' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-2xl font-bold text-amber-800" style={{ fontFamily: 'Cinzel, serif' }}>
              My Final Results
            </h3>
            <span className="px-4 py-2 bg-amber-100 text-amber-800 rounded-full font-semibold text-sm">
              {results.length} Result{results.length !== 1 ? 's' : ''}
            </span>
          </div>

          {results.length === 0 ? (
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-xl p-8 text-center">
              <svg className="w-16 h-16 text-amber-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="text-xl font-bold text-amber-800 mb-2">No Results Yet</h3>
              <p className="text-amber-700">
                Your final results will appear here once they are published by the organizers.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {results.map((result) => (
                <div
                  key={result.id}
                  className="bg-white border-2 border-amber-200 rounded-xl overflow-hidden hover:shadow-xl transition-all duration-300"
                >
                  {/* Header */}
                  <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-4">
                    <div className="flex items-center justify-between text-white">
                      <div>
                        <h4 className="font-bold text-lg">{result.event_name}</h4>
                        <p className="text-sm opacity-90">{result.category}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold">{result.total_score}</div>
                        <div className="text-xs opacity-90">Final Score</div>
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    {/* Result Info */}
                    <div className="flex items-center justify-between mb-4 pb-4 border-b border-amber-100">
                      <div>
                        <p className="text-sm text-gray-600">Rank</p>
                        <p className="font-bold text-2xl text-gray-900">#{result.rank}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Participant</p>
                        <p className="font-semibold text-gray-900">{result.full_name}</p>
                        <p className="text-xs text-gray-500">Chest No: {result.chest_number}</p>
                      </div>
                    </div>

                    {/* Show Details Button */}
                    <div className="mb-4">
                      <button
                        onClick={() => setSelectedResult(selectedResult === result.id ? null : result.id)}
                        className="w-full text-sm text-amber-600 hover:text-amber-700 font-semibold flex items-center justify-center gap-1 py-2 border border-amber-200 rounded-lg hover:bg-amber-50 transition-colors"
                      >
                        {selectedResult === result.id ? (
                          <>
                            <span>Hide Details</span>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                          </>
                        ) : (
                          <>
                            <span>Show Details</span>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Re-check Request Section */}
                    {selectedResult === result.id && (
                      <div className="space-y-4">
                        {/* Result Details */}
                        <div className="bg-gray-50 rounded-lg p-4">
                          <h5 className="font-semibold text-gray-800 mb-2">Result Details</h5>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-600">Event:</span>
                              <span className="ml-2 font-medium">{result.event_name}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Category:</span>
                              <span className="ml-2 font-medium">{result.category}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Final Score:</span>
                              <span className="ml-2 font-bold text-emerald-600">{result.total_score}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Rank:</span>
                              <span className="ml-2 font-bold text-gray-800">#{result.rank}</span>
                            </div>
                          </div>
                        </div>

                        {/* Re-check Request Button */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <div className="flex items-start gap-3">
                            <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div className="flex-1">
                              <h5 className="font-semibold text-blue-900 mb-1">Result Re-Check</h5>
                              <p className="text-sm text-blue-800 mb-3">
                                Not satisfied with your result? Request a re-evaluation from the assigned volunteer.
                              </p>

                              {/* Reason Input */}
                              {result.is_recheck_allowed && (
                                <div className="mb-3">
                                  <label className="block text-sm font-semibold text-blue-900 mb-1">
                                    Reason for Re-Check (optional)
                                  </label>
                                  <textarea
                                    className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    rows={3}
                                    placeholder="Briefly explain why you are not satisfied with this result..."
                                    value={recheckReason[result.id] || ''}
                                    onChange={(e) =>
                                      setRecheckReason(prev => ({
                                        ...prev,
                                        [result.id]: e.target.value,
                                      }))
                                    }
                                  />
                                </div>
                              )}

                              {/* Success Message */}
                              {recheckSuccess[result.id] && (
                                <div className="mb-3 p-3 bg-green-100 border border-green-300 rounded-lg">
                                  <div className="flex items-center gap-2">
                                    <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    <span className="text-sm font-medium text-green-800">
                                      Re-check request submitted successfully! The assigned volunteer will review your request.
                                    </span>
                                  </div>
                                </div>
                              )}

                              {/* Error Message */}
                              {recheckError[result.id] && (
                                <div className="mb-3 p-3 bg-red-100 border border-red-300 rounded-lg">
                                  <div className="flex items-center gap-2">
                                    <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                    <span className="text-sm font-medium text-red-800">
                                      {recheckError[result.id]}
                                    </span>
                                  </div>
                                </div>
                              )}

                              {/* Re-check Button */}
                              {result.is_recheck_allowed ? (
                                <button
                                  onClick={() => handleRecheckRequest(result.id)}
                                  disabled={recheckLoading[result.id]}
                                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                                >
                                  {recheckLoading[result.id] ? (
                                    <>
                                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                      <span>Submitting...</span>
                                    </>
                                  ) : (
                                    <>
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                      <span>Request Re-Check</span>
                                    </>
                                  )}
                                </button>
                              ) : (
                                <div className="w-full bg-gray-100 text-gray-600 px-4 py-2 rounded-lg text-center">
                                  <div className="flex items-center justify-center gap-2">
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    <span>
                                      {result.recheck_request_status === 'Accepted' 
                                        ? <button 
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              const requestId = result.recheck_request_id || result.id;
                                              navigate(`/recheck-request/${requestId}`);
                                            }}
                                            className="text-blue-600 hover:text-blue-800 underline cursor-pointer bg-transparent border-none p-0 font-medium"
                                          >
                                            Request Accepted
                                          </button>
                                        : 'Re-check already requested'}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Judge Scores Tab */}
      {activeTab === 'scores' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-2xl font-bold text-amber-800" style={{ fontFamily: 'Cinzel, serif' }}>
              Judge Scores & Feedback
            </h3>
            <span className="px-4 py-2 bg-amber-100 text-amber-800 rounded-full font-semibold text-sm">
              {scores.length} Score{scores.length !== 1 ? 's' : ''}
            </span>
          </div>

          {scores.length === 0 ? (
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-xl p-8 text-center">
              <svg className="w-16 h-16 text-amber-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="text-xl font-bold text-amber-800 mb-2">No Scores Yet</h3>
              <p className="text-amber-700">
                Your scores and feedback from judges will appear here once they are submitted.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {scores.map((score) => {
                const criteria = getCriteriaDisplay(score);

                return (
                  <div
                    key={score.id}
                    className="bg-white border-2 border-amber-200 rounded-xl overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer"
                    onClick={() => setSelectedScore(selectedScore === score.id ? null : score.id)}
                  >
                    {/* Header */}
                    <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-4">
                      <div className="flex items-center justify-between text-white">
                        <div>
                          <h4 className="font-bold text-lg">{score.event.name}</h4>
                          <p className="text-sm opacity-90">{score.event.category}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-3xl font-bold">{score.total_score}</div>
                          <div className="text-xs opacity-90">Total Score</div>
                        </div>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-4">
                      {/* Judge Info */}
                      <div className="flex items-center gap-3 mb-4 pb-4 border-b border-amber-100">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                          {score.judge.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Judged by</p>
                          <p className="font-semibold text-gray-900">{score.judge.name}</p>
                        </div>
                        <div className="ml-auto text-right">
                          <p className="text-xs text-gray-500">
                            {new Date(score.submitted_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      {/* Criteria Scores */}
                      {selectedScore === score.id && criteria.length > 0 && (
                        <div className="mb-4 space-y-3">
                          <p className="text-sm font-semibold text-gray-700 mb-2">Score Breakdown</p>
                          {criteria.map((criterion, idx) => (
                            <div key={idx}>
                              <div className="flex justify-between text-sm mb-1">
                                <span className="text-gray-700">{criterion.label}</span>
                                <span className="font-bold text-gray-900">
                                  {criterion.value} / {criterion.max}
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-gradient-to-r from-amber-400 to-orange-500 h-2 rounded-full transition-all duration-500"
                                  style={{ width: `${(criterion.value / criterion.max) * 100}%` }}
                                ></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Feedback */}
                      {score.feedback && score.feedback.trim() && (
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-4">
                          <div className="flex items-start gap-2 mb-2">
                            <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                            </svg>
                            <div className="flex-1">
                              <p className="text-sm font-bold text-blue-900 mb-1">Judge's Feedback</p>
                              <p className="text-sm text-blue-800 leading-relaxed whitespace-pre-wrap">
                                {score.feedback}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {!score.feedback || !score.feedback.trim() && (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
                          <p className="text-sm text-gray-500 italic">No additional feedback provided</p>
                        </div>
                      )}

                      {/* Expand/Collapse Indicator */}
                      <div className="mt-4 text-center">
                        <button className="text-sm text-amber-600 hover:text-amber-700 font-semibold flex items-center gap-1 mx-auto">
                          {selectedScore === score.id ? (
                            <>
                              <span>Show Less</span>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                              </svg>
                            </>
                          ) : (
                            <>
                              <span>Show Details</span>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </>
                          )}
                        </button>
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

export default StudentFeedbackDisplay;