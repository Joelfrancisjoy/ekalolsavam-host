import React, { useState, useEffect } from 'react';
import http from '../services/http-common';

// Simple inline SVG icons
const TrendingUp = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M23 6l-9.5 9.5-5-5L1 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M17 6h6v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const TrendingDown = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M23 18L13.5 8.5l-5 5L1 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M17 18h6v-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const Activity = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M22 12h-4l-3 9L9 3l-3 9H2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const PerformancePrediction = ({ participantId, eventId, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [prediction, setPrediction] = useState(null);
  const [history, setHistory] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPrediction = async () => {
      if (!participantId || !eventId) return;

      try {
        setLoading(true);
        setError(null);

        // Fetch prediction
        const predResponse = await http.get('/api/scores/predict-performance/', {
          params: {
            participant_id: participantId,
            event_id: eventId
          }
        });
        setPrediction(predResponse.data);

        // Fetch history
        const histResponse = await http.get('/api/scores/performance-history/', {
          params: {
            participant_id: participantId
          }
        });
        setHistory(histResponse.data);

      } catch (err) {
        console.error('Failed to fetch prediction:', err);
        setError(err.response?.data?.error || 'Failed to load prediction');
      } finally {
        setLoading(false);
      }
    };

    fetchPrediction();
  }, [participantId, eventId]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <span className="ml-3 text-gray-600">Loading prediction...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <div className="text-center py-4">
          <div className="text-red-600 mb-2">⚠️ {error}</div>
          <button
            onClick={onClose}
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  if (!prediction) {
    return null;
  }

  const { prediction: pred, historical_data, participant, event } = prediction;
  const { statistics, category_performance, history: historyData } = history || {};

  // Determine score color
  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Determine confidence color
  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return 'bg-green-100 text-green-800';
    if (confidence >= 0.6) return 'bg-blue-100 text-blue-800';
    return 'bg-yellow-100 text-yellow-800';
  };

  // Trend icon
  const getTrendIcon = (trend) => {
    if (trend === 'improving') return <TrendingUp className="w-5 h-5 text-green-600" />;
    if (trend === 'declining') return <TrendingDown className="w-5 h-5 text-red-600" />;
    return <Activity className="w-5 h-5 text-gray-600" />;
  };

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl shadow-lg p-6 mb-6 border border-indigo-100">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            🎯 Performance Prediction
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            AI-powered prediction for {participant?.username} in {event?.name}
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Main Prediction Card */}
      <div className="bg-white rounded-lg p-6 mb-6 shadow-md">
        <div className="text-center mb-4">
          <div className="text-sm text-gray-600 mb-2">Predicted Score</div>
          <div className={`text-6xl font-bold ${getScoreColor(pred.predicted_score)}`}>
            {pred.predicted_score}
            <span className="text-2xl text-gray-400">/100</span>
          </div>
          <div className="text-sm text-gray-500 mt-2">
            Range: {pred.score_range.min} - {pred.score_range.max}
          </div>
        </div>

        {/* Confidence Badge */}
        <div className="flex justify-center mb-4">
          <span className={`px-4 py-2 rounded-full text-sm font-semibold ${getConfidenceColor(pred.confidence)}`}>
            {(pred.confidence * 100).toFixed(0)}% Confidence
          </span>
        </div>

        {/* Method */}
        <div className="text-center text-xs text-gray-500">
          Method: {pred.method === 'ml' ? '🤖 Machine Learning' : '📊 Rule-based'}
        </div>
      </div>

      {/* Historical Performance */}
      {historical_data && historical_data.events_participated > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Stats Card */}
          <div className="bg-white rounded-lg p-4 shadow-md">
            <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
              📊 Historical Stats
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Average Score:</span>
                <span className="font-semibold text-gray-800">{historical_data.avg_score}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Best Score:</span>
                <span className="font-semibold text-green-600">{historical_data.max_score}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Lowest Score:</span>
                <span className="font-semibold text-red-600">{historical_data.min_score}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Events Participated:</span>
                <span className="font-semibold text-indigo-600">{historical_data.events_participated}</span>
              </div>
            </div>
          </div>

          {/* Trend Card */}
          {statistics && (
            <div className="bg-white rounded-lg p-4 shadow-md">
              <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                📈 Performance Trend
              </h4>
              <div className="flex items-center gap-3 mb-3">
                {getTrendIcon(statistics.trend)}
                <div>
                  <div className="font-semibold text-gray-800 capitalize">
                    {statistics.trend === 'insufficient_data' ? 'Not enough data' : statistics.trend}
                  </div>
                  <div className="text-xs text-gray-500">
                    Latest: {statistics.latest_score}
                  </div>
                </div>
              </div>
              {category_performance && Object.keys(category_performance).length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="text-xs text-gray-600 mb-2">Category Performance:</div>
                  <div className="space-y-1">
                    {Object.entries(category_performance).map(([cat, score]) => (
                      <div key={cat} className="flex justify-between text-xs">
                        <span className="text-gray-600 capitalize">{cat}:</span>
                        <span className="font-semibold">{score}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* New Participant Message */}
      {historical_data && historical_data.events_participated === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-3">
            <div className="text-blue-600 text-2xl">ℹ️</div>
            <div>
              <div className="font-semibold text-blue-800 mb-1">New Participant</div>
              <div className="text-sm text-blue-700">
                This participant has no historical performance data. The prediction is based on category averages and may be less accurate.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Performance History */}
      {historyData && historyData.length > 0 && (
        <div className="bg-white rounded-lg p-4 shadow-md">
          <h4 className="font-semibold text-gray-700 mb-3">📜 Recent Performance</h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {historyData.slice(-5).reverse().map((item, idx) => (
              <div key={idx} className="flex justify-between items-center text-sm py-2 border-b border-gray-100 last:border-0">
                <div>
                  <div className="font-medium text-gray-800">{item.event_name}</div>
                  <div className="text-xs text-gray-500 capitalize">{item.event_category}</div>
                </div>
                <div className={`font-bold ${getScoreColor(item.total_score)}`}>
                  {item.total_score}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info Footer */}
      <div className="mt-4 text-xs text-gray-500 text-center">
        💡 This prediction is generated using machine learning based on historical performance data.
        Actual performance may vary.
      </div>
    </div>
  );
};

export default PerformancePrediction;
