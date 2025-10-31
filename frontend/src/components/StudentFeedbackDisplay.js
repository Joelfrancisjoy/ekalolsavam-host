import React, { useState, useEffect } from 'react';
import scoreService from '../services/scoreService';

const StudentFeedbackDisplay = () => {
  const [loading, setLoading] = useState(true);
  const [scores, setScores] = useState([]);
  const [error, setError] = useState('');
  const [selectedScore, setSelectedScore] = useState(null);

  useEffect(() => {
    loadScores();
  }, []);

  const loadScores = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await scoreService.getStudentScores();
      setScores(data.scores || []);
    } catch (err) {
      console.error('Failed to load scores:', err);
      setError('Failed to load your scores and feedback');
    } finally {
      setLoading(false);
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
          onClick={loadScores}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (scores.length === 0) {
    return (
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-xl p-8 text-center">
        <svg className="w-16 h-16 text-amber-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <h3 className="text-xl font-bold text-amber-800 mb-2">No Scores Yet</h3>
        <p className="text-amber-700">
          Your scores and feedback from judges will appear here once they are submitted.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-2xl font-bold text-amber-800" style={{ fontFamily: 'Cinzel, serif' }}>
          Judge Scores & Feedback
        </h3>
        <span className="px-4 py-2 bg-amber-100 text-amber-800 rounded-full font-semibold text-sm">
          {scores.length} Score{scores.length !== 1 ? 's' : ''} Received
        </span>
      </div>

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
    </div>
  );
};

export default StudentFeedbackDisplay;
