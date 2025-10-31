import React, { useState, useEffect } from 'react';
import scoreService from '../services/scoreService';

const AnomalyDetailsModal = ({ eventId, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [flaggedScores, setFlaggedScores] = useState([]);
  const [selectedScore, setSelectedScore] = useState(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadFlaggedScores();
  }, [eventId]);

  const loadFlaggedScores = async () => {
    try {
      setLoading(true);
      const data = await scoreService.getFlaggedScores({ event: eventId });
      setFlaggedScores(data.scores || []);
    } catch (error) {
      console.error('Failed to load flagged scores:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (scoreId, approved) => {
    try {
      setSubmitting(true);
      await scoreService.reviewFlaggedScore(scoreId, approved, reviewNotes);
      // Reload scores
      await loadFlaggedScores();
      setSelectedScore(null);
      setReviewNotes('');
    } catch (error) {
      console.error('Failed to review score:', error);
      alert('Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Anomalous Scores</h2>
            <p className="text-gray-600 mt-1">
              {flaggedScores.length} score{flaggedScores.length !== 1 ? 's' : ''} flagged for review
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {flaggedScores.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-gray-600 text-lg">No anomalous scores found for this event</p>
          </div>
        ) : (
          <div className="space-y-4">
            {flaggedScores.map((score) => (
              <div
                key={score.id}
                className={`border-2 rounded-xl p-6 transition-all ${
                  score.admin_reviewed
                    ? 'bg-gray-50 border-gray-200'
                    : 'bg-red-50 border-red-200 hover:shadow-lg'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Student Info */}
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                        {score.participant.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">
                          {score.participant.username}
                        </h3>
                        <p className="text-sm text-gray-600">
                          Student ID: {score.participant.id}
                        </p>
                      </div>
                    </div>

                    {/* Event Info */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-600">Event</p>
                        <p className="font-semibold text-gray-900">{score.event.name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Judge</p>
                        <p className="font-semibold text-gray-900">{score.judge.username}</p>
                      </div>
                    </div>

                    {/* Scores */}
                    <div className="bg-white rounded-lg p-4 mb-4">
                      <p className="text-sm font-semibold text-gray-700 mb-2">Submitted Scores</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div>
                          <p className="text-xs text-gray-600">Technical</p>
                          <p className="text-lg font-bold text-gray-900">{score.scores.technical_skill}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Artistic</p>
                          <p className="text-lg font-bold text-gray-900">{score.scores.artistic_expression}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Stage</p>
                          <p className="text-lg font-bold text-gray-900">{score.scores.stage_presence}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Overall</p>
                          <p className="text-lg font-bold text-gray-900">{score.scores.overall_impression}</p>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="text-sm text-gray-600">Total Score</p>
                        <p className="text-2xl font-bold text-indigo-600">{score.scores.total_score}</p>
                      </div>
                    </div>

                    {/* Anomaly Details */}
                    <div className={`border-2 rounded-lg p-4 ${getSeverityColor(score.anomaly.severity)}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <p className="font-bold">Anomaly Detected</p>
                        <span className="ml-auto px-2 py-1 rounded text-xs font-bold uppercase">
                          {score.anomaly.severity} Severity
                        </span>
                      </div>
                      <p className="text-sm">
                        Confidence: {(score.anomaly.confidence * 100).toFixed(1)}%
                      </p>
                      {score.anomaly.details.reason && (
                        <p className="text-sm mt-2">
                          <span className="font-semibold">Reason:</span> {score.anomaly.details.reason}
                        </p>
                      )}
                      {score.anomaly.details.method && (
                        <p className="text-xs mt-1 opacity-75">
                          Detection method: {score.anomaly.details.method}
                        </p>
                      )}
                    </div>

                    {/* Review Status */}
                    {score.admin_reviewed && (
                      <div className="mt-4 bg-green-50 border-2 border-green-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <p className="font-bold text-green-800">Reviewed by Admin</p>
                        </div>
                        {score.admin_notes && (
                          <p className="text-sm text-green-700">{score.admin_notes}</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Review Actions */}
                  {!score.admin_reviewed && (
                    <div className="ml-4">
                      <button
                        onClick={() => setSelectedScore(score.id === selectedScore ? null : score.id)}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-semibold"
                      >
                        Review
                      </button>
                    </div>
                  )}
                </div>

                {/* Review Form */}
                {selectedScore === score.id && !score.admin_reviewed && (
                  <div className="mt-4 pt-4 border-t-2 border-gray-200">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Review Notes
                    </label>
                    <textarea
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      className="w-full p-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                      rows={3}
                      placeholder="Add notes about this review..."
                    />
                    <div className="flex gap-3 mt-3">
                      <button
                        onClick={() => handleReview(score.id, true)}
                        disabled={submitting}
                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold disabled:opacity-50"
                      >
                        {submitting ? 'Submitting...' : 'Approve Score'}
                      </button>
                      <button
                        onClick={() => handleReview(score.id, false)}
                        disabled={submitting}
                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold disabled:opacity-50"
                      >
                        {submitting ? 'Submitting...' : 'Reject Score'}
                      </button>
                      <button
                        onClick={() => {
                          setSelectedScore(null);
                          setReviewNotes('');
                        }}
                        className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors font-semibold"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 pt-6 border-t-2 border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default AnomalyDetailsModal;
