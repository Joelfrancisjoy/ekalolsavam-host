import React, { useState, useEffect } from 'react';
import http from '../services/http-common';

const SentimentAnalytics = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState({
    event: '',
    feedback_type: '',
    days: 30
  });

  useEffect(() => {
    fetchAnalytics();
  }, [filter]);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      if (filter.event) params.append('event', filter.event);
      if (filter.feedback_type) params.append('feedback_type', filter.feedback_type);
      if (filter.days) params.append('days', filter.days);
      
      const response = await http.get(`/api/feedback/sentiment-analytics/?${params}`);
      setAnalytics(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch analytics');
      console.error('Error fetching sentiment analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const getSentimentColor = (score) => {
    if (score >= 0.3) return 'text-green-600';
    if (score <= -0.3) return 'text-red-600';
    return 'text-gray-600';
  };

  const getSentimentEmoji = (score) => {
    if (score >= 0.3) return '😊';
    if (score <= -0.3) return '😞';
    return '😐';
  };

  const getSentimentLabel = (score) => {
    if (score >= 0.3) return 'Positive';
    if (score <= -0.3) return 'Negative';
    return 'Neutral';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">❌ {error}</p>
      </div>
    );
  }

  if (!analytics || analytics.total_count === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
        <p className="text-gray-600">📊 No feedback data available yet.</p>
        <p className="text-sm text-gray-500 mt-2">Feedback sentiment will appear here once users submit feedback.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">📊 Sentiment Analytics</h2>
        <button
          onClick={fetchAnalytics}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Overall Sentiment Card */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">Overall Sentiment</h3>
        <div className="flex items-center justify-center space-x-4">
          <div className="text-6xl">
            {getSentimentEmoji(analytics.overall_sentiment)}
          </div>
          <div>
            <p className={`text-4xl font-bold ${getSentimentColor(analytics.overall_sentiment)}`}>
              {analytics.overall_sentiment.toFixed(2)}
            </p>
            <p className="text-gray-600">
              {getSentimentLabel(analytics.overall_sentiment)}
            </p>
            <p className="text-sm text-gray-500">
              Based on {analytics.total_count} feedback{analytics.total_count !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Distribution Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Positive */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600 font-medium">Positive</p>
              <p className="text-3xl font-bold text-green-700">
                {analytics.sentiment_distribution.positive}
              </p>
              <p className="text-sm text-green-600">
                {analytics.sentiment_percentages.positive}%
              </p>
            </div>
            <div className="text-4xl">😊</div>
          </div>
        </div>

        {/* Neutral */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Neutral</p>
              <p className="text-3xl font-bold text-gray-700">
                {analytics.sentiment_distribution.neutral}
              </p>
              <p className="text-sm text-gray-600">
                {analytics.sentiment_percentages.neutral}%
              </p>
            </div>
            <div className="text-4xl">😐</div>
          </div>
        </div>

        {/* Negative */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-600 font-medium">Negative</p>
              <p className="text-3xl font-bold text-red-700">
                {analytics.sentiment_distribution.negative}
              </p>
              <p className="text-sm text-red-600">
                {analytics.sentiment_percentages.negative}%
              </p>
            </div>
            <div className="text-4xl">😞</div>
          </div>
        </div>
      </div>

      {/* Visual Progress Bars */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">Sentiment Distribution</h3>
        <div className="space-y-3">
          {/* Positive Bar */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-green-600 font-medium">Positive</span>
              <span className="text-green-600">{analytics.sentiment_percentages.positive}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-green-500 h-3 rounded-full transition-all duration-500"
                style={{ width: `${analytics.sentiment_percentages.positive}%` }}
              ></div>
            </div>
          </div>

          {/* Neutral Bar */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600 font-medium">Neutral</span>
              <span className="text-gray-600">{analytics.sentiment_percentages.neutral}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-gray-500 h-3 rounded-full transition-all duration-500"
                style={{ width: `${analytics.sentiment_percentages.neutral}%` }}
              ></div>
            </div>
          </div>

          {/* Negative Bar */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-red-600 font-medium">Negative</span>
              <span className="text-red-600">{analytics.sentiment_percentages.negative}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-red-500 h-3 rounded-full transition-all duration-500"
                style={{ width: `${analytics.sentiment_percentages.negative}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Feedback */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">Recent Feedback</h3>
        <div className="space-y-3">
          {analytics.recent_feedback.map((feedback) => (
            <div
              key={feedback.id}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <p className="font-semibold text-gray-800">{feedback.subject}</p>
                  <p className="text-sm text-gray-600 mt-1">{feedback.message}</p>
                </div>
                <div className="ml-4 flex flex-col items-end">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    feedback.sentiment_label === 'positive' ? 'bg-green-100 text-green-800' :
                    feedback.sentiment_label === 'negative' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {getSentimentEmoji(feedback.sentiment_score)} {feedback.sentiment_label}
                  </span>
                  <span className="text-xs text-gray-500 mt-1">
                    Score: {feedback.sentiment_score}
                  </span>
                </div>
              </div>
              <div className="flex justify-between items-center text-xs text-gray-500 mt-2">
                <span>👤 {feedback.user}</span>
                <span>📅 {new Date(feedback.created_at).toLocaleDateString()}</span>
                <span className="px-2 py-1 bg-gray-100 rounded">
                  {feedback.feedback_type}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>ℹ️ How it works:</strong> Sentiment scores range from -1.0 (very negative) to +1.0 (very positive).
          Scores are automatically calculated using Machine Learning when users submit feedback.
        </p>
      </div>
    </div>
  );
};

export default SentimentAnalytics;
