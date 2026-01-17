import React, { useState, useEffect } from 'react';
import resultService from '../services/resultService';

const RecheckRequestsDropdown = ({ selectedEventId, onReanalyze }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [recheckRequests, setRecheckRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadRecheckRequests();
    }
  }, [isOpen]); // Only re-fetch when isOpen changes, not when selectedEventId changes

  const loadRecheckRequests = async () => {
    try {
      setLoading(true);
      setError('');
      const requests = await resultService.getJudgeRecheckRequests();

      // Show all accepted recheck requests regardless of selected event
      // The dropdown is meant to show ALL recheck requests needing attention
      setRecheckRequests(requests);

    } catch (err) {
      console.error('Error fetching recheck requests:', err);
      setError('Failed to load recheck requests');
      setRecheckRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const handleReanalyzeClick = (request) => {
    onReanalyze(request);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold rounded-lg shadow-md transition-all duration-200 flex items-center justify-between"
      >
        <span>Recheck Requests ({recheckRequests.length})</span>
        <svg
          className={`w-5 h-5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 z-10 max-h-96 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading recheck requests...</p>
            </div>
          ) : error ? (
            <div className="p-4 text-center">
              <p className="text-red-600">{error}</p>
            </div>
          ) : recheckRequests.length === 0 ? (
            <div className="p-4 text-center">
              <p className="text-gray-500">No recheck requests found</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {recheckRequests.map((request) => (
                <div key={request.recheck_request_id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 truncate">
                        {request.participant_name || request.full_name}
                      </h4>
                      <p className="text-sm text-gray-600 truncate">
                        Event: {request.event_name}
                      </p>
                      <div className="flex items-center mt-1 space-x-4">
                        <span className="text-sm text-gray-500">
                          Chess #: {request.participant_chess_number || request.chest_number}
                        </span>
                        <span className="text-sm text-gray-500">
                          Score: {request.current_total_score || request.final_score}
                        </span>
                      </div>
                      {request.reason && (
                        <p className="text-sm text-gray-600 mt-1 italic">
                          Reason: {request.reason}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleReanalyzeClick(request)}
                      className="ml-4 px-3 py-1 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white text-sm font-medium rounded-md transition-all duration-200 whitespace-nowrap"
                    >
                      Reanalyze
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RecheckRequestsDropdown;