import React from 'react';

const AnomalyFlagIndicator = ({ count, unreviewed, onClick }) => {
  if (!count || count === 0) return null;

  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-50 border-2 border-red-300 rounded-lg hover:bg-red-100 transition-all duration-200 group cursor-pointer"
      title={`${count} anomalous score${count > 1 ? 's' : ''} detected`}
    >
      <div className="relative">
        <svg
          className="w-5 h-5 text-red-600 animate-pulse"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
        {unreviewed > 0 && (
          <span className="absolute -top-2 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-white text-xs font-bold">
            {unreviewed}
          </span>
        )}
      </div>
      <div className="text-left">
        <div className="text-sm font-bold text-red-800">
          {count} Anomal{count > 1 ? 'ies' : 'y'}
        </div>
        {unreviewed > 0 && (
          <div className="text-xs text-red-600">
            {unreviewed} unreviewed
          </div>
        )}
      </div>
      <svg
        className="w-4 h-4 text-red-600 group-hover:translate-x-0.5 transition-transform"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 5l7 7-7 7"
        />
      </svg>
    </button>
  );
};

export default AnomalyFlagIndicator;
